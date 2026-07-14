import mongoose from "mongoose";
import Key from "../models/key.model.js";
import User from "../models/user.model.js";
import { Logbook } from "../models/logbook.model.js";
import { asyncHandler } from "../utils/errorHandler.js";
import { ValidationError, NotFoundError } from "../utils/errorHandler.js";
import {
  emitKeyTaken,
  emitKeyReturned,
} from "../services/socketService.js";
import AuditService from "../services/auditService.js";

/**
 * Bulk Take Keys — faculty/admin takes multiple keys at once
 * POST /api/keys/take-bulk
 * Body: { keyIds: string[] }
 */
export const takeBulk = asyncHandler(async (req, res) => {
  const { keyIds } = req.body;

  if (!Array.isArray(keyIds) || keyIds.length === 0) {
    throw new ValidationError("keyIds must be a non-empty array");
  }

  // Deduplicate
  const uniqueIds = [...new Set(keyIds)];

  if (uniqueIds.length > 20) {
    throw new ValidationError("Cannot take more than 20 keys at once");
  }

  const user = await User.findById(req.userId);
  if (!user) throw new NotFoundError("User not found");

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

      // Audit
      await AuditService.logKeyTaken(key, user, req, { isBulkOperation: true, batchSize: uniqueIds.length });

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

  // Send one summary notification
  if (succeeded.length > 0) {
    try {
      const keyList = succeeded.map(k => k.keyNumber).join(", ");
      const { createAndSendNotification, notifySecurityUsers, notifyAdminUsers } = await import("../services/notificationService.js");

      // Faculty notification
      await createAndSendNotification({
        recipient: { userId: user._id, name: user.name, email: user.email, role: user.role },
        title: `${succeeded.length} Key${succeeded.length > 1 ? "s" : ""} Taken`,
        message: `You have successfully taken ${succeeded.length} key${succeeded.length > 1 ? "s" : ""}: ${keyList}`,
        type: "key_taken",
        priority: "low",
        metadata: { keyIds: succeeded.map(k => k.keyId), keyNumbers: succeeded.map(k => k.keyNumber), isBulk: true }
      }, { email: true, realTime: true });

      // Security & admin
      await notifySecurityUsers(
        `Bulk Key Checkout — ${succeeded.length} Keys`,
        `${user.name} has taken ${succeeded.length} key${succeeded.length > 1 ? "s" : ""}: ${keyList}`,
        "key_taken", "low",
        { facultyId: user._id, facultyName: user.name, keyNumbers: succeeded.map(k => k.keyNumber), isBulk: true }
      );
      await notifyAdminUsers(
        `Bulk Key Checkout — ${succeeded.length} Keys`,
        `${user.name} (${user.role}) has taken ${succeeded.length} key${succeeded.length > 1 ? "s" : ""}: ${keyList}`,
        "key_taken", "low",
        { facultyId: user._id, facultyName: user.name, keyNumbers: succeeded.map(k => k.keyNumber), isBulk: true }
      );
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
  const { keyIds } = req.body;

  if (!Array.isArray(keyIds) || keyIds.length === 0) {
    throw new ValidationError("keyIds must be a non-empty array");
  }

  const uniqueIds = [...new Set(keyIds)];

  if (uniqueIds.length > 20) {
    throw new ValidationError("Cannot return more than 20 keys at once");
  }

  const user = await User.findById(req.userId);
  if (!user) throw new NotFoundError("User not found");

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
      // Ensure this user actually owns the key
      if (key.takenBy?.userId?.toString() !== req.userId) {
        failed.push({ keyId, keyNumber: key.keyNumber, keyName: key.keyName, reason: "This key was not taken by you" });
        continue;
      }

      await key.returnKey(user);

      // Update logbook
      const logEntry = await Logbook.findOne({
        keyNumber: key.keyNumber, status: "unavailable", returnedAt: null
      }).sort({ createdAt: -1 });

      if (logEntry) {
        logEntry.status = "available";
        logEntry.returnedBy = { userId: user._id, name: user.name, email: user.email };
        logEntry.returnedAt = new Date();
        await logEntry.save();
      } else {
        await Logbook.create({
          keyNumber: key.keyNumber, keyName: key.keyName, location: key.location,
          status: "available", category: key.category, department: key.department,
          block: key.block, description: key.description,
          returnedBy: { userId: user._id, name: user.name, email: user.email },
          returnedAt: new Date(), frequentlyUsed: key.frequentlyUsed, isActive: true,
          recordedBy: { userId: user._id, role: user.role },
          notes: `Bulk return — batch of ${uniqueIds.length} keys`
        });
      }

      // Audit
      await AuditService.logKeyReturned(key, user, req, user, { isBulkOperation: true, batchSize: uniqueIds.length });

      // Socket
      emitKeyReturned(key, req.userId);

      succeeded.push({ keyId: key._id, keyNumber: key.keyNumber, keyName: key.keyName, location: key.location });
    } catch (err) {
      failed.push({ keyId, reason: err.message || "Unknown error" });
    }
  }

  // Send one summary notification
  if (succeeded.length > 0) {
    try {
      const keyList = succeeded.map(k => k.keyNumber).join(", ");
      const { createAndSendNotification, notifySecurityUsers, notifyAdminUsers } = await import("../services/notificationService.js");

      // Faculty notification
      await createAndSendNotification({
        recipient: { userId: user._id, name: user.name, email: user.email, role: user.role },
        title: `${succeeded.length} Key${succeeded.length > 1 ? "s" : ""} Returned`,
        message: `You have successfully returned ${succeeded.length} key${succeeded.length > 1 ? "s" : ""}: ${keyList}`,
        type: "key_returned",
        priority: "low",
        metadata: { keyIds: succeeded.map(k => k.keyId), keyNumbers: succeeded.map(k => k.keyNumber), isBulk: true }
      }, { email: true, realTime: true });

      // Security & admin
      await notifySecurityUsers(
        `Bulk Key Return — ${succeeded.length} Keys`,
        `${user.name} has returned ${succeeded.length} key${succeeded.length > 1 ? "s" : ""}: ${keyList}`,
        "key_returned", "low",
        { facultyId: user._id, facultyName: user.name, keyNumbers: succeeded.map(k => k.keyNumber), isBulk: true }
      );
      await notifyAdminUsers(
        `Bulk Key Return — ${succeeded.length} Keys`,
        `${user.name} (${user.role}) returned ${succeeded.length} key${succeeded.length > 1 ? "s" : ""}: ${keyList}`,
        "key_returned", "low",
        { facultyId: user._id, facultyName: user.name, keyNumbers: succeeded.map(k => k.keyNumber), isBulk: true }
      );
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
