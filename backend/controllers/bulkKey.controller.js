import mongoose from "mongoose";
import Key from "../models/key.model.js";
import User from "../models/user.model.js";
import { Logbook } from "../models/logbook.model.js";
import { asyncHandler } from "../utils/errorHandler.js";
import { ValidationError, NotFoundError } from "../utils/errorHandler.js";
import {
  emitKeyTaken,
  emitKeyReturned,
  emitBulkComplete,
} from "../services/socketService.js";
import AuditService from "../services/auditService.js";

/**
 * Bulk Take Keys — faculty/admin takes multiple keys at once
 * POST /api/keys/take-bulk
 * Body: { keyIds: string[] }
 */
export const takeBulk = asyncHandler(async (req, res) => {
  const { keyIds, requestedByUserId } = req.body;

  if (!Array.isArray(keyIds) || keyIds.length === 0) {
    throw new ValidationError("keyIds must be a non-empty array");
  }

  const uniqueIds = [...new Set(keyIds)];

  if (uniqueIds.length > 20) {
    throw new ValidationError("Cannot take more than 20 keys at once");
  }

  // Support two modes:
  //   1. Faculty calls directly → req.userId is the faculty member
  //   2. Security scans faculty QR → req.userId is security, requestedByUserId is faculty
  const targetUserId = requestedByUserId || req.userId;

  if (requestedByUserId) {
    console.log(`🔵 takeBulk: Security (${req.userId}) processing on behalf of faculty (${requestedByUserId})`);
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    console.error(`❌ takeBulk: Target user not found — targetUserId: ${targetUserId}, requestedByUserId: ${requestedByUserId}, caller: ${req.userId}`);
    throw new NotFoundError("User not found");
  }

  const succeeded = [];
  const failed = [];

  for (const keyId of uniqueIds) {
    if (!mongoose.Types.ObjectId.isValid(keyId)) {
      failed.push({ keyId, reason: "Invalid key ID format" });
      continue;
    }

    try {
      const key = await Key.findById(keyId);
      if (!key) { failed.push({ keyId, reason: "Key not found" }); continue; }
      if (!key.isActive) { failed.push({ keyId, keyNumber: key.keyNumber, reason: "Key is inactive" }); continue; }
      if (key.status === "unavailable") {
        failed.push({ keyId, keyNumber: key.keyNumber, keyName: key.keyName, reason: "Key is already taken" });
        continue;
      }

      await key.takeKey(user);

      // Logbook
      await Logbook.create({
        keyNumber: key.keyNumber, keyName: key.keyName, location: key.location,
        status: "unavailable", category: key.category, department: key.department,
        block: key.block, description: key.description,
        takenBy: { userId: user._id, name: user.name, email: user.email },
        takenAt: new Date(), returnedAt: null, frequentlyUsed: key.frequentlyUsed,
        isActive: true,
        recordedBy: { userId: user._id, role: user.role },
        notes: `Bulk checkout — batch of ${uniqueIds.length} keys`
      });

      // Audit — records key assigned to `user` (faculty), processed by req.userId (may be security)
      await AuditService.logKeyTaken(key, user, req, {
        isBulkOperation:  true,
        batchSize:        uniqueIds.length,
        processedBy:      req.userId,           // security scanner or faculty themselves
        assignedTo:       user._id.toString(),  // always the faculty member
      });

      // Usage count
      if (!user.keyUsage) user.keyUsage = new Map();
      user.keyUsage.set(keyId, (user.keyUsage.get(keyId) || 0) + 1);

      // Socket
      emitKeyTaken(key, req.userId);

      succeeded.push({ keyId: key._id, keyNumber: key.keyNumber, keyName: key.keyName, location: key.location });
    } catch (err) {
      failed.push({ keyId, reason: err.message || "Unknown error" });
    }
  }

  // Save updated usage counts once
  if (succeeded.length > 0) {
    await user.save();
  }

  // Emit bulk-complete to the faculty member so their QR modal auto-advances
  const { batchId } = req.body;
  if (batchId && succeeded.length > 0) {
    emitBulkComplete(
      user._id.toString(),
      batchId,
      "bulk-take",
      { succeeded, failed }
    );
  }

  // Send one summary notification
  if (succeeded.length > 0) {
    try {
      const { notifyKeyTransaction } = await import("../services/keyNotificationService.js");
      const scanner = requestedByUserId ? await User.findById(req.userId).lean() : null;
      await notifyKeyTransaction({
        eventType:     "checkout",
        isBulk:        true,
        faculty:       user,
        keys:          succeeded.map(k => ({ keyNumber: k.keyNumber, keyName: k.keyName, location: k.location })),
        processor:     scanner,
        processorRole: scanner?.role === "security" ? "Security Officer" : scanner?.role || null,
      });
    } catch (notifErr) {
      console.error("❌ Bulk take notification error:", notifErr.message);
    }
  }

  res.status(200).json({
    success: true,
    message: `Bulk checkout: ${succeeded.length} succeeded, ${failed.length} failed`,
    data: { succeeded, failed, totalRequested: uniqueIds.length }
  });
});

/**
 * Bulk Return Keys — faculty/admin returns multiple of their own keys at once
 * POST /api/keys/return-bulk
 * Body: { keyIds: string[] }
 */
export const returnBulk = asyncHandler(async (req, res) => {
  const { keyIds, requestedByUserId } = req.body;

  if (!Array.isArray(keyIds) || keyIds.length === 0) {
    throw new ValidationError("keyIds must be a non-empty array");
  }

  const uniqueIds = [...new Set(keyIds)];

  if (uniqueIds.length > 20) {
    throw new ValidationError("Cannot return more than 20 keys at once");
  }

  // returnBulk: the person physically returning (could be security scanning faculty QR)
  const returnerUser = await User.findById(req.userId);
  if (!returnerUser) throw new NotFoundError("User not found");

  // The faculty member who originally took the keys (from QR or defaults to caller)
  const originalUserId = requestedByUserId || req.userId;
  const originalUser   = requestedByUserId
    ? await User.findById(requestedByUserId)
    : returnerUser;

  const succeeded = [];
  const failed = [];

  for (const keyId of uniqueIds) {
    if (!mongoose.Types.ObjectId.isValid(keyId)) {
      failed.push({ keyId, reason: "Invalid key ID format" });
      continue;
    }

    try {
      const key = await Key.findById(keyId);
      if (!key) { failed.push({ keyId, reason: "Key not found" }); continue; }
      if (key.status === "available") {
        failed.push({ keyId, keyNumber: key.keyNumber, keyName: key.keyName, reason: "Key is already available" });
        continue;
      }
      // Ownership check: key must have been taken by the original faculty user
      if (key.takenBy?.userId?.toString() !== originalUserId.toString()) {
        failed.push({ keyId, keyNumber: key.keyNumber, keyName: key.keyName, reason: "This key was not taken by the requesting user" });
        continue;
      }

      await key.returnKey(returnerUser);

      // Update logbook
      const logEntry = await Logbook.findOne({
        keyNumber: key.keyNumber, status: "unavailable", returnedAt: null
      }).sort({ createdAt: -1 });

      if (logEntry) {
        logEntry.status = "available";
        logEntry.returnedBy = { userId: returnerUser._id, name: returnerUser.name, email: returnerUser.email };
        logEntry.returnedAt = new Date();
        await logEntry.save();
      } else {
        await Logbook.create({
          keyNumber: key.keyNumber, keyName: key.keyName, location: key.location,
          status: "available", category: key.category, department: key.department,
          block: key.block, description: key.description,
          returnedBy: { userId: returnerUser._id, name: returnerUser.name, email: returnerUser.email },
          returnedAt: new Date(), frequentlyUsed: key.frequentlyUsed, isActive: true,
          recordedBy: { userId: returnerUser._id, role: returnerUser.role },
          notes: `Bulk return — batch of ${uniqueIds.length} keys`
        });
      }

      // Audit — log original user as the key holder, returner as who processed it
      await AuditService.logKeyReturned(key, returnerUser, req, originalUser, { isBulkOperation: true, batchSize: uniqueIds.length });

      // Socket
      emitKeyReturned(key, req.userId);

      succeeded.push({ keyId: key._id, keyNumber: key.keyNumber, keyName: key.keyName, location: key.location });
    } catch (err) {
      failed.push({ keyId, reason: err.message || "Unknown error" });
    }
  }

  // Send one summary notification using the original faculty user's details
  const notifUser = originalUser || returnerUser;

  // Emit bulk-complete to the faculty member so their QR modal auto-advances
  const { batchId } = req.body;
  if (batchId && succeeded.length > 0) {
    emitBulkComplete(
      notifUser._id.toString(),
      batchId,
      "bulk-return",
      { succeeded, failed }
    );
  }

  if (succeeded.length > 0) {
    try {
      const { notifyKeyTransaction } = await import("../services/keyNotificationService.js");
      const isReturnedBySelf = returnerUser._id.toString() === notifUser._id.toString();
      const processor = isReturnedBySelf ? null : returnerUser;
      await notifyKeyTransaction({
        eventType:     "return",
        isBulk:        true,
        faculty:       notifUser,
        keys:          succeeded.map(k => ({ keyNumber: k.keyNumber, keyName: k.keyName, location: k.location })),
        processor,
        processorRole: processor?.role === "security" ? "Security Officer" : processor?.role || null,
      });
    } catch (notifErr) {
      console.error("❌ Bulk return notification error:", notifErr.message);
    }
  }

  res.status(200).json({
    success: true,
    message: `Bulk return: ${succeeded.length} succeeded, ${failed.length} failed`,
    data: { succeeded, failed, totalRequested: uniqueIds.length }
  });
});
