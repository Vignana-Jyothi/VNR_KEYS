import mongoose from "mongoose";
import Key from "../models/key.model.js";
import User from "../models/user.model.js";
import { Logbook } from "../models/logbook.model.js";
import { asyncHandler } from "../utils/errorHandler.js";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "../utils/errorHandler.js";
import {
  emitKeyTaken,
  emitKeyReturned,
  emitKeyCreated,
  emitKeyUpdated,
  emitKeyDeleted,
  emitFrequentlyUsedToggled,
  emitQRScanReturn,
  emitQRScanRequest
} from "../services/socketService.js";
import AuditService from "../services/auditService.js";

/**
 * Get all keys with optional filtering (respects user department access)
 */
export const getAllKeys = asyncHandler(async (req, res) => {
  const { status, category, search, frequentlyUsed } = req.query;

  // Get user to apply department-based filtering
  const user = await User.findById(req.userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Start with keys accessible to the user
  let keysQuery = Key.findAccessibleToUser(user);

  // Apply additional filters
  const additionalFilters = {};
  if (status) additionalFilters.status = status;
  if (category) additionalFilters.category = category;
  if (frequentlyUsed === 'true') additionalFilters.frequentlyUsed = true;

  // Apply additional filters if any
  if (Object.keys(additionalFilters).length > 0) {
    keysQuery = keysQuery.find(additionalFilters);
  }

  // Search functionality
  if (search) {
    keysQuery = keysQuery.find({
      $or: [
        { keyNumber: { $regex: search, $options: 'i' } },
        { keyName: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ]
    });
  }

  const keys = await keysQuery
    .populate('takenBy.userId', 'name email')
    .sort({ keyNumber: 1 });

  res.status(200).json({
    success: true,
    message: "Keys retrieved successfully",
    data: {
      keys,
      total: keys.length,
    },
  });
});

/**
 * Get available keys (respects user department access)
 */
export const getAvailableKeys = asyncHandler(async (req, res) => {
  // Get user to apply department-based filtering
  const user = await User.findById(req.userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const keys = await Key.findAvailableForUser(user)
    .sort({ keyNumber: 1 });

  res.status(200).json({
    success: true,
    message: "Available keys retrieved successfully",
    data: {
      keys,
      total: keys.length,
    },
  });
});

/**
 * Get unavailable keys
 */
export const getUnavailableKeys = asyncHandler(async (req, res) => {
  const keys = await Key.findUnavailable()
    .populate('takenBy.userId', 'name email')
    .sort({ takenAt: -1 });
  
  res.status(200).json({
    success: true,
    message: "Unavailable keys retrieved successfully",
    data: {
      keys,
      total: keys.length,
    },
  });
});

/**
 * Get keys taken by current user
 */
export const getMyTakenKeys = asyncHandler(async (req, res) => {
  const keys = await Key.findTakenByUser(req.userId)
    .sort({ takenAt: -1 });

  res.status(200).json({
    success: true,
    message: "Your taken keys retrieved successfully",
    data: {
      keys,
      total: keys.length,
    },
  });
});

/**
 * Get all currently taken keys (for collective return interface)
 * Only accessible to Security, Faculty, and Admin
 */
export const getAllTakenKeys = asyncHandler(async (req, res) => {
  // Verify user has permission to view all taken keys
  if (req.userRole !== 'admin' && req.userRole !== 'security' && req.userRole !== 'faculty') {
    throw new ValidationError("Only Security, Faculty, or Admin users can view all taken keys");
  }

  const keys = await Key.findUnavailable()
    .populate('takenBy.userId', 'name email role department')
    .sort({ takenAt: -1 });

  res.status(200).json({
    success: true,
    message: "All taken keys retrieved successfully",
    data: {
      keys,
      total: keys.length,
    },
  });
});

/**
 * Get frequently used keys
 */
export const getFrequentlyUsedKeys = asyncHandler(async (req, res) => {
  const keys = await Key.findFrequentlyUsed()
    .sort({ keyNumber: 1 });
  
  res.status(200).json({
    success: true,
    message: "Frequently used keys retrieved successfully",
    data: {
      keys,
      total: keys.length,
    },
  });
});

/**
 * Get user's most frequently used keys based on usage count
 */
export const getUserFrequentlyUsedKeys = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Get user's key usage data
  const keyUsage = user.keyUsage || new Map();
  
  // Convert Map to array and sort by usage count (descending)
  const sortedKeyUsage = Array.from(keyUsage.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10); // Limit to top 10 keys

  if (sortedKeyUsage.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No frequently used keys found",
      data: {
        keys: [],
        total: 0,
      },
    });
  }

  // Get the key IDs
  const keyIds = sortedKeyUsage.map(([keyId]) => keyId);

  // Fetch the actual key data
  const keys = await Key.find({
    _id: { $in: keyIds },
  }).sort({ keyNumber: 1 });

  // Create a mapping from keyId to usage count for response
  const usageCounts = Object.fromEntries(sortedKeyUsage);

  res.status(200).json({
    success: true,
    message: "User frequently used keys retrieved successfully",
    data: {
      keys,
      usageCounts,
      total: keys.length,
    },
  });
});

/**
 * Get a single key by ID
 */
export const getKeyById = asyncHandler(async (req, res) => {
  const { keyId } = req.params;

  const key = await Key.findById(keyId)
    .populate('takenBy.userId', 'name email');

  if (!key) {
    throw new NotFoundError("Key not found");
  }

  res.status(200).json({
    success: true,
    message: "Key retrieved successfully",
    data: { key },
  });
});

/**
 * Take a key (for faculty/admin) - Atomic operation to prevent race condition
 * Uses findOneAndUpdate to ensure only one checkout can succeed for the same key
 */
export const takeKey = asyncHandler(async (req, res) => {
  const { keyId } = req.params;

  const user = await User.findById(req.userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // SECURITY: Atomic checkout using findOneAndUpdate to prevent race condition
  // Only succeeds if key exists AND status is 'available'
  const updatedKey = await Key.findOneAndUpdate(
    { _id: keyId, status: 'available', isActive: true },
    {
      $set: {
        status: 'unavailable',
        takenBy: {
          userId: user._id,
          name: user.name,
          email: user.email
        },
        takenAt: new Date()
      }
    },
    { new: true } // Return the updated document
  );

  if (!updatedKey) {
    // Key not found OR already taken (race condition or genuinely taken)
    const keyExists = await Key.findById(keyId);
    if (!keyExists) {
      throw new NotFoundError("Key not found");
    }
    if (!keyExists.isActive) {
      throw new ConflictError("Key is inactive");
    }
    throw new ConflictError("Key is already taken");
  }

  const key = updatedKey;

  // Log the take operation
  await AuditService.logKeyTaken(key, user, req);

  // Create a detailed logbook entry for key taken
  await Logbook.create({
    keyNumber: key.keyNumber,
    keyName: key.keyName,
    location: key.location,
    status: 'unavailable',
    category: key.category,
    department: key.department,
    block: key.block,
    description: key.description,
    takenBy: {
      userId: user._id,
      name: user.name,
      email: user.email
    },
    takenAt: new Date(),
    returnedAt: null,
    frequentlyUsed: key.frequentlyUsed,
    isActive: true,
    recordedBy: {
      userId: user._id,
      role: user.role
    }
  });

  // Create notification for key taken
  try {
    const { notifyKeyTransaction } = await import('../services/keyNotificationService.js');
    await notifyKeyTransaction({
      eventType: "checkout",
      isBulk:    false,
      faculty:   user,
      keys:      [{ keyNumber: key.keyNumber, keyName: key.keyName, location: key.location }],
      processor: null,   // faculty took it themselves
    });
  } catch (notificationError) {
    console.error('❌ Error sending key taken notification:', notificationError);
  }

  // Increment usage count for the user
  if (!user.keyUsage) {
    user.keyUsage = new Map();
  }
  const currentCount = user.keyUsage.get(keyId) || 0;
  user.keyUsage.set(keyId, currentCount + 1);
  await user.save();

  // Emit real-time update
  emitKeyTaken(key, req.userId);

  res.status(200).json({
    success: true,
    message: `Key ${key.keyNumber} (${key.keyName}) taken successfully`,
    data: { key },
  });
});

/**
 * Return a key - Authorization check to prevent unauthorized returns
 * Admin can return any key
 * Security can return any key
 * Faculty and Student can only return keys currently assigned to themselves
 */
export const returnKey = asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  const { returnerId } = req.body;
  const requestingUserId = req.userId;
  const requestingUserRole = req.userRole;

  const key = await Key.findById(keyId);
  if (!key) {
    throw new NotFoundError("Key not found");
  }

  // If key is already available, return success (no-op)
  if (key.status === 'available') {
    console.log(`⚠️ Key ${key.keyNumber} is already available, skipping return`);
    return res.status(200).json({
      success: true,
      message: `Key ${key.keyNumber} is already available`,
      data: { key },
    });
  }

  // Authorization check: Only admin and security can return keys for other users
  // Faculty can only return keys assigned to themselves
  if (requestingUserRole !== 'admin' && requestingUserRole !== 'security') {
    // Check if the key is assigned to the requesting user
    if (!key.takenBy?.userId || key.takenBy.userId.toString() !== requestingUserId) {
      throw new ValidationError("Access denied: You can only return keys assigned to yourself");
    }
  }

  // Get the original user who had the key for audit logging
  const originalUser = key.takenBy?.userId ? await User.findById(key.takenBy.userId) : null;
  
  // If returnerId is provided and the current user is security/admin, use that as the returner
  // Otherwise, use the current user as the returner
  const returnedBy = (returnerId && (requestingUserRole === 'admin' || requestingUserRole === 'security')) 
    ? await User.findById(returnerId)
    : await User.findById(requestingUserId);

  await key.returnKey(returnedBy);

  // Create notifications for all roles
  try {
    const { notifyKeyTransaction } = await import('../services/keyNotificationService.js');
    const isSelf = originalUser && returnedBy &&
      originalUser._id.toString() === returnedBy._id.toString();
    await notifyKeyTransaction({
      eventType:     "return",
      isBulk:        false,
      faculty:       originalUser || returnedBy,
      keys:          [{ keyNumber: key.keyNumber, keyName: key.keyName, location: key.location }],
      processor:     isSelf ? null : returnedBy,
      processorRole: !isSelf && returnedBy?.role === "security" ? "Security Officer" : returnedBy?.role || null,
    });
  } catch (notificationError) {
    console.error('❌ Error sending key return notification:', notificationError);
  }

  // Log the return operation
  await AuditService.logKeyReturned(key, returnedBy, req, originalUser);

  // Update the existing logbook entry for key return (instead of creating new one)
  
  // Find the most recent logbook entry for this key that hasn't been returned yet
  const existingLogEntry = await Logbook.findOne({
    keyNumber: key.keyNumber,
    status: 'unavailable',
    returnedAt: null
  }).sort({ createdAt: -1 });

  if (existingLogEntry) {
    // Update the existing entry with return information
    existingLogEntry.status = 'available';
    existingLogEntry.returnedBy = {
      userId: returnedBy._id,
      name: returnedBy.name,
      email: returnedBy.email
    };
    existingLogEntry.returnedAt = new Date();
    await existingLogEntry.save();
  } else {
    // Fallback: Create new entry if no existing entry found (shouldn't happen normally)
    await Logbook.create({
      keyNumber: key.keyNumber,
      keyName: key.keyName,
      location: key.location,
      status: 'available',
      category: key.category,
      department: key.department,
      block: key.block,
      description: key.description,
      takenBy: originalUser ? {
        userId: originalUser._id,
        name: originalUser.name,
        email: originalUser.email
      } : null,
      takenAt: key.takenAt,
      returnedBy: {
        userId: returnedBy._id,
        name: returnedBy.name,
        email: returnedBy.email
      },
      returnedAt: new Date(),
      frequentlyUsed: key.frequentlyUsed,
      isActive: true,
      recordedBy: {
        userId: returnedBy._id,
        role: returnedBy.role
      }
    });
  }

  // Emit real-time update - use qr-return action if this is a security/admin processing a return
  const isQRReturn = (requestingUserRole === 'admin' || requestingUserRole === 'security') && !returnerId;
  if (isQRReturn) {
    const { emitQRScanReturn } = await import('../services/socketService.js');
    emitQRScanReturn(key, req.userId, originalUser?._id?.toString());
  } else {
    emitKeyReturned(key, req.userId);
  }

  res.status(200).json({
    success: true,
    message: `Key ${key.keyNumber} (${key.keyName}) returned successfully`,
    data: { key },
  });
});

/**
 * Volunteer Key Return - allows Security and Faculty to return any key
 */
export const collectiveReturnKey = asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  const { reason } = req.body;

  // Verify user has permission for collective returns (Security or Faculty)
  if (req.userRole !== 'admin' && req.userRole !== 'security' && req.userRole !== 'faculty') {
    throw new ValidationError("Only Security, Faculty, or Admin users can perform Volunteer Key Returns");
  }

  const key = await Key.findById(keyId);
  if (!key) {
    throw new NotFoundError("Key not found");
  }

  // If key is already available, return success (no-op)
  if (key.status === 'available') {
    console.log(`⚠️ Key ${key.keyNumber} is already available, skipping volunteer return`);
    return res.status(200).json({
      success: true,
      message: `Key ${key.keyNumber} is already available`,
      data: { key },
    });
  }

  // Get the original user who had the key
  const originalUser = key.takenBy?.userId ? await User.findById(key.takenBy.userId) : null;
  const returnedBy = await User.findById(req.userId);

  if (!returnedBy) {
    throw new NotFoundError("User not found");
  }

  // Store original user info before returning the key
  const originalUserInfo = originalUser ? {
    id: originalUser._id,
    name: originalUser.name,
    email: originalUser.email,
    role: originalUser.role
  } : null;

  await key.returnKey(returnedBy);

  // Send appropriate notification based on who is returning the key
  try {
    const { createKeySelfReturnedNotification, createKeyPendingReturnNotification } = await import('../services/notificationService.js');

    if (originalUser && returnedBy) {
      if (originalUser._id.toString() === returnedBy._id.toString()) {
        // Original faculty volunteering to return their own key
        await createKeySelfReturnedNotification(key, originalUser);
      } else {
        // Send pending notification if key is being returned after hours
        const now = new Date();
        const keyTakenTime = new Date(key.takenAt);
        if (keyTakenTime.getDate() === now.getDate() && now.getHours() >= 17) {
          await createKeyPendingReturnNotification(key, originalUser);
        }
      }
    }
  } catch (notificationError) {
    console.error('❌ Error sending key return notification:', notificationError);
  }

  // Log the Volunteer Key Return operation with additional metadata
  await AuditService.logKeyReturned(key, returnedBy, req, originalUser, {
    reason: reason || "Volunteer Key Return",
    isCollectiveReturn: true
  });

  // Update the existing logbook entry for volunteer key return (instead of creating new one)
  
  // Find the most recent logbook entry for this key that hasn't been returned yet
  const existingLogEntry = await Logbook.findOne({
    keyNumber: key.keyNumber,
    status: 'unavailable',
    returnedAt: null
  }).sort({ createdAt: -1 });

  if (existingLogEntry) {
    // Update the existing entry with return information
    existingLogEntry.status = 'available';
    existingLogEntry.returnedBy = {
      userId: returnedBy._id,
      name: returnedBy.name,
      email: returnedBy.email
    };
    existingLogEntry.returnedAt = new Date();
    await existingLogEntry.save();
  } else {
    // Fallback: Create new entry if no existing entry found (shouldn't happen normally)
    await Logbook.create({
      keyNumber: key.keyNumber,
      keyName: key.keyName,
      location: key.location,
      status: 'available',
      category: key.category,
      department: key.department,
      block: key.block,
      description: key.description,
      takenBy: originalUser ? {
        userId: originalUser._id,
        name: originalUser.name,
        email: originalUser.email
      } : null,
      takenAt: key.takenAt,
      returnedBy: {
        userId: returnedBy._id,
        name: returnedBy.name,
        email: returnedBy.email
      },
      returnedAt: new Date(),
      frequentlyUsed: key.frequentlyUsed,
      isActive: true,
      recordedBy: {
        userId: returnedBy._id,
        role: returnedBy.role
      }
    });
  }

  // Emit real-time update - use qr-return action if this is a security/admin processing a return
  const isQRReturn = (requestingUserRole === 'admin' || requestingUserRole === 'security') && !reason;
  if (isQRReturn) {
    const { emitQRScanReturn } = await import('../services/socketService.js');
    emitQRScanReturn(key, req.userId, originalUser?._id?.toString());
  } else {
    emitKeyReturned(key, req.userId);
  }

  res.status(200).json({
    success: true,
    message: `Key ${key.keyNumber} (${key.keyName}) returned successfully via collective return`,
    data: {
      key,
      originalUser: originalUserInfo,
      returnedBy: {
        id: returnedBy._id,
        name: returnedBy.name,
        email: returnedBy.email,
        role: returnedBy.role
      },
      reason: reason || "Volunteer Key Return"
    },
  });
});

/**
 * Create a new key (admin or security)
 */
export const createKey = asyncHandler(async (req, res) => {
  const {
    keyNumber,
    keyName,
    location,
    description,
    category,
    block,
    department,
    frequentlyUsed,
  } = req.body;

  // Check if key number already exists (only check active keys)
  const existingKey = await Key.findOne({ keyNumber, isActive: true });
  if (existingKey) {
    throw new ConflictError("Key number already exists");
  }

  const key = new Key({
    keyNumber,
    keyName,
    location,
    description,
    category,
    block,
    department: department || 'Other',
    frequentlyUsed: frequentlyUsed || false,
  });

  await key.save();

  // Notify security about new key
  try {
    const { notifySecurityUsers } = await import('../services/notificationService.js');
    const admin = await User.findById(req.userId);
    await notifySecurityUsers(
      'New Key Added',
      `Admin ${admin?.name || 'Admin'} has added a new key: ${key.keyName} (${key.keyNumber}) in ${key.location}`,
      'general', 'low',
      { keyId: key._id, keyNumber: key.keyNumber, keyName: key.keyName }
    );
  } catch (notificationError) {
    console.error('❌ Error sending new key notification:', notificationError);
  }

  // Emit real-time update
  emitKeyCreated(key, req.userId);

  res.status(201).json({
    success: true,
    message: "Key created successfully",
    data: { key },
  });
});

/**
 * Update a key (admin only) - Field whitelisting to prevent mass assignment
 * Only allows legitimate editable fields, rejects protected/security-related fields
 */
export const updateKey = asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  const updates = req.body;
  
  const key = await Key.findById(keyId);
  if (!key) {
    throw new NotFoundError("Key not found");
  }
  
  // SECURITY: Field whitelisting to prevent mass assignment attacks
  // Only allow these legitimate editable fields
  const allowedFields = [
    'keyNumber',
    'keyName',
    'roomNumber',
    'block',
    'floor',
    'description',
    'location',
    'category',
    'department',
    'frequentlyUsed'
  ];
  
  // Protected fields that should never be modified through this endpoint
  const protectedFields = [
    'status',
    'takenBy',
    'takenAt',
    'returnedAt',
    'history',
    'auditLogs',
    'createdBy',
    'createdAt',
    'updatedAt',
    'isActive',
    'notifications',
    'qrCode',
    '_id',
    '__v'
  ];
  
  // Build sanitized updates object with only allowed fields
  const sanitizedUpdates = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      sanitizedUpdates[field] = updates[field];
    }
  }
  
  // Log if any protected fields were attempted to be modified
  const attemptedProtectedFields = protectedFields.filter(field => updates[field] !== undefined);
  if (attemptedProtectedFields.length > 0) {
    console.warn('⚠️ SECURITY: Attempted to modify protected fields:', attemptedProtectedFields);
    // Do not throw error - just ignore these fields to maintain API compatibility
  }
  
  // If updating key number, check for duplicates (only check active keys)
  if (sanitizedUpdates.keyNumber && sanitizedUpdates.keyNumber !== key.keyNumber) {
    const existingKey = await Key.findOne({ keyNumber: sanitizedUpdates.keyNumber, isActive: true });
    if (existingKey) {
      throw new ConflictError("Key number already exists");
    }
  }
  
  // Apply only sanitized updates
  Object.assign(key, sanitizedUpdates);
  await key.save();
  
  res.status(200).json({
    success: true,
    message: "Key updated successfully",
    data: { key },
  });
});

/**
 * Delete a key (admin only) - soft delete by default, hard delete with ?hard=true
 */
export const deleteKey = asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  const { hard } = req.query; // Check for hard delete parameter

  const key = await Key.findById(keyId);
  if (!key) {
    throw new NotFoundError("Key not found");
  }

  // Check if key is currently taken
  if (key.status === 'unavailable') {
    throw new ConflictError("Cannot delete a key that is currently taken. Please return the key first.");
  }

  if (hard === 'true') {
    // Hard delete - completely remove from database
    await Key.findByIdAndDelete(keyId);

    // Notify security about key removal
    try {
      const { notifySecurityUsers } = await import('../services/notificationService.js');
      await notifySecurityUsers(
        'Key Removed',
        `Key ${key.keyName} (${key.keyNumber}) has been removed from the system`,
        'general', 'low',
        { keyNumber: key.keyNumber, keyName: key.keyName }
      );
    } catch (notificationError) {
      console.error('❌ Error sending key removed notification:', notificationError);
    }

    // Emit real-time update
    emitKeyDeleted(key, req.userId);

    res.status(200).json({
      success: true,
      message: "Key permanently deleted successfully",
      data: { keyId, deleted: true },
    });
  } else {
    // Soft delete - mark as inactive
    key.isActive = false;
    await key.save();

    // Notify security about key removal
    try {
      const { notifySecurityUsers } = await import('../services/notificationService.js');
      await notifySecurityUsers(
        'Key Removed',
        `Key ${key.keyName} (${key.keyNumber}) has been removed from the system`,
        'general', 'low',
        { keyNumber: key.keyNumber, keyName: key.keyName }
      );
    } catch (notificationError) {
      console.error('❌ Error sending key removed notification:', notificationError);
    }

    // Emit real-time update
    emitKeyDeleted(key, req.userId);

    res.status(200).json({
      success: true,
      message: "Key deleted successfully (soft delete)",
      data: { key },
    });
  }
});

/**
 * Toggle frequently used status
 */
export const toggleFrequentlyUsed = asyncHandler(async (req, res) => {
  const { keyId } = req.params;

  const key = await Key.findById(keyId);
  if (!key) {
    throw new NotFoundError("Key not found");
  }

  key.frequentlyUsed = !key.frequentlyUsed;
  await key.save();

  // Emit real-time update
  emitFrequentlyUsedToggled(key, req.userId);

  res.status(200).json({
    success: true,
    message: `Key ${key.frequentlyUsed ? 'added to' : 'removed from'} frequently used`,
    data: { key },
  });
});

/**
 * Handle QR code scan for key return (security/admin only)
 */
export const qrScanReturn = asyncHandler(async (req, res) => {
  console.log('🔍 qrScanReturn function called');
  console.log('🔍 Request URL:', req.originalUrl);
  console.log('🔍 Request method:', req.method);
  console.log('🔍 Request body:', req.body);

  const { qrData } = req.body;

  if (!qrData) {
    console.log('❌ No QR data provided');
    throw new ValidationError("QR data is required");
  }

  // Parse QR data
  let parsedData;
  try {
    parsedData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    console.log('✅ Parsed QR data:', parsedData);
  } catch (error) {
    console.log('❌ QR data parsing error:', error);
    throw new ValidationError("Invalid QR code format");
  }

  const { keyId, userId, returnId } = parsedData;
  console.log('🔍 Extracted IDs:', { keyId, userId, returnId });

  if (!keyId || !userId || !returnId) {
    console.log('❌ Missing required fields');
    throw new ValidationError("Invalid QR code data - missing required fields");
  }

  // Validate MongoDB ObjectId format
  console.log('🔍 Validating ObjectId formats...');
  if (!mongoose.Types.ObjectId.isValid(keyId)) {
    console.log('❌ Invalid keyId format:', keyId);
    throw new ValidationError("Invalid key ID format");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.log('❌ Invalid userId format:', userId);
    throw new ValidationError("Invalid user ID format");
  }

  console.log('✅ ObjectId validation passed');

  // Find the key
  console.log('🔍 Looking up key with ID:', keyId);
  const key = await Key.findById(keyId);
  if (!key) {
    console.log('❌ Key not found with ID:', keyId);
    throw new NotFoundError("Key not found");
  }
  console.log('✅ Key found:', key.keyNumber, key.keyName, 'Status:', key.status);

  // Verify the key is currently taken by the specified user
  if (key.status === 'available') {
    console.log('❌ Key is already available');
    throw new ConflictError("Key is already available");
  }

  console.log('🔍 Checking if key is taken by user:', userId);
  console.log('🔍 Key takenBy:', key.takenBy);
  if (!key.takenBy.userId || key.takenBy.userId.toString() !== userId) {
    console.log('❌ Key is not taken by the specified user');
    console.log('🔍 Expected userId:', userId);
    console.log('🔍 Actual takenBy.userId:', key.takenBy.userId?.toString());
    throw new ValidationError("Key is not currently taken by the specified user");
  }

  // Get the original user who took the key
  console.log('🔍 Looking up original user with ID:', userId);
  const originalUser = await User.findById(userId);
  if (!originalUser) {
    console.log('❌ Original user not found with ID:', userId);
    throw new NotFoundError("Original user not found");
  }
  console.log('✅ Original user found:', originalUser.name, originalUser.email);

  // Get the user performing the return (the security/admin who scanned the QR)
  // returnId is a transaction identifier, not a user ID - use req.userId for the processor
  console.log('🔍 Looking up returning user (scanner) with ID:', req.userId);
  const returnedBy = await User.findById(req.userId);
  if (!returnedBy) {
    console.log('❌ Returning user not found with ID:', req.userId);
    throw new NotFoundError("Returning user not found");
  }
  console.log('✅ Returning user found:', returnedBy.name);

  // Return the key
  await key.returnKey(returnedBy);

  // Update the existing logbook entry for QR-based key return (instead of creating new one)
  
  // Find the most recent logbook entry for this key that hasn't been returned yet
  const existingLogEntry = await Logbook.findOne({
    keyNumber: key.keyNumber,
    status: 'unavailable',
    returnedAt: null
  }).sort({ createdAt: -1 });

  if (existingLogEntry) {
    // Update the existing entry with return information
    existingLogEntry.status = 'available';
    existingLogEntry.returnedBy = {
      userId: returnedBy._id,
      name: returnedBy.name,
      email: returnedBy.email
    };
    existingLogEntry.returnedAt = new Date();
    await existingLogEntry.save();
  } else {
    // Fallback: Create new entry if no existing entry found (shouldn't happen normally)
    await Logbook.create({
      keyNumber: key.keyNumber,
      keyName: key.keyName,
      location: key.location,
      status: 'available',
      category: key.category,
      department: key.department,
      block: key.block,
      description: key.description,
      takenBy: {
        userId: originalUser._id,
        name: originalUser.name,
        email: originalUser.email
      },
      takenAt: key.takenAt,
      returnedBy: {
        userId: returnedBy._id,
        name: returnedBy.name,
        email: returnedBy.email
      },
      returnedAt: new Date(),
      frequentlyUsed: key.frequentlyUsed,
      isActive: true,
      recordedBy: {
        userId: req.userId,
        role: req.userRole
      }
    });
  }

  // Send notification — centralised service handles faculty + security + admin
  try {
    const scanner = await User.findById(req.userId);
    const isSelf  = originalUser._id.toString() === scanner._id.toString();
    const { notifyKeyTransaction } = await import('../services/keyNotificationService.js');
    await notifyKeyTransaction({
      eventType:     "return",
      isBulk:        false,
      faculty:       originalUser,
      keys:          [{ keyNumber: key.keyNumber, keyName: key.keyName, location: key.location }],
      processor:     isSelf ? null : scanner,
      processorRole: !isSelf && scanner?.role === "security" ? "Security Officer" : scanner?.role || null,
    });
  } catch (notificationError) {
    console.error('❌ Error sending key return notification:', notificationError);
  }

  // Emit real-time update for QR scan return
  emitQRScanReturn(key, req.userId, userId);

  res.status(200).json({
    success: true,
    message: `Key ${key.keyNumber} (${key.keyName}) returned successfully via QR scan`,
    data: {
      key,
      originalUser: {
        id: originalUser._id,
        name: originalUser.name,
        email: originalUser.email
      },
      scannedBy: {
        id: returnedBy._id,
        name: returnedBy.name,
        email: returnedBy.email,
        role: returnedBy.role
      }
    },
  });
});

/**
 * Handle QR code scan for key request (security/admin only) - Atomic operation to prevent race condition
 */
export const qrScanRequest = asyncHandler(async (req, res) => {
  const { qrData } = req.body;

  if (!qrData) {
    throw new ValidationError("QR data is required");
  }

  // Parse QR data
  let parsedData;
  try {
    parsedData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
  } catch (error) {
    throw new ValidationError("Invalid QR code format");
  }

  const { keyId, userId, requestId } = parsedData;

  if (!keyId || !userId || !requestId) {
    throw new ValidationError("Invalid QR code data - missing required fields");
  }

  // Validate MongoDB ObjectId format
  if (!mongoose.Types.ObjectId.isValid(keyId)) {
    throw new ValidationError("Invalid key ID format");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ValidationError("Invalid user ID format");
  }

  // Get the user who requested the key
  const requestingUser = await User.findById(userId);
  if (!requestingUser) {
    throw new NotFoundError("Requesting user not found");
  }

  // SECURITY: Atomic checkout using findOneAndUpdate to prevent race condition
  // Only succeeds if key exists AND status is 'available'
  const updatedKey = await Key.findOneAndUpdate(
    { _id: keyId, status: 'available', isActive: true },
    {
      $set: {
        status: 'unavailable',
        takenBy: {
          userId: requestingUser._id,
          name: requestingUser.name,
          email: requestingUser.email
        },
        takenAt: new Date()
      }
    },
    { new: true }
  );

  if (!updatedKey) {
    // Key not found OR already taken (race condition or genuinely taken)
    const keyExists = await Key.findById(keyId);
    if (!keyExists) {
      throw new NotFoundError("Key not found");
    }
    if (!keyExists.isActive) {
      throw new ConflictError("Key is inactive");
    }
    throw new ConflictError("Key is already taken");
  }

  const key = updatedKey;

  // Create a detailed logbook entry for QR-based key request
  await Logbook.create({
    keyNumber: key.keyNumber,
    keyName: key.keyName,
    location: key.location,
    status: 'unavailable',
    category: key.category,
    department: key.department,
    block: key.block,
    description: key.description,
    takenBy: {
      userId: requestingUser._id,
      name: requestingUser.name,
      email: requestingUser.email
    },
    takenAt: new Date(),
    returnedAt: null,
    frequentlyUsed: key.frequentlyUsed,
    isActive: true,
    recordedBy: {
      userId: req.userId,
      role: req.userRole
    }
  });

  // Create notification for key taken (security scanned on behalf of faculty)
  try {
    const scanner = await User.findById(req.userId);
    const { notifyKeyTransaction } = await import('../services/keyNotificationService.js');
    await notifyKeyTransaction({
      eventType:     "checkout",
      isBulk:        false,
      faculty:       requestingUser,
      keys:          [{ keyNumber: key.keyNumber, keyName: key.keyName, location: key.location }],
      processor:     scanner,
      processorRole: scanner?.role === "security" ? "Security Officer" : scanner?.role || null,
    });
  } catch (notificationError) {
    console.error('❌ Error sending key taken notification:', notificationError);
  }

  // Increment usage count for the requesting user
  if (!requestingUser.keyUsage) {
    requestingUser.keyUsage = new Map();
  }
  const currentCount = requestingUser.keyUsage.get(keyId) || 0;
  requestingUser.keyUsage.set(keyId, currentCount + 1);
  await requestingUser.save();

  // Emit real-time update for QR scan request
  emitQRScanRequest(key, req.userId, userId);

  res.status(200).json({
    success: true,
    message: `Key ${key.keyNumber} (${key.keyName}) assigned successfully via QR scan`,
    data: {
      key,
      requestingUser: {
        id: requestingUser._id,
        name: requestingUser.name,
        email: requestingUser.email
      },
      scannedBy: {
        id: req.userId,
        name: req.userName || 'Security',
        role: req.userRole
      }
    },
  });
});

/**
 * Manually assign a key to a person (security only)
 */
export const manualAssignKey = asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  const { keyTakerName } = req.body;

  if (!keyTakerName || !keyTakerName.trim()) {
    throw new ValidationError("Key taker name is required");
  }

  const key = await Key.findById(keyId);
  if (!key) {
    throw new NotFoundError("Key not found");
  }

  if (key.status === 'unavailable') {
    throw new ConflictError("Key is already taken");
  }

  const assignedBy = await User.findById(req.userId);
  if (!assignedBy) {
    throw new NotFoundError("User not found");
  }

  // Create a temporary user object for the manual assignment
  const manualUser = {
    _id: new mongoose.Types.ObjectId(), // Generate a temporary ID
    name: keyTakerName.trim(),
    email: `manual-@temp.local`, // Temporary email
    role: 'manual'
  };

  // Update key with manual assignment
  key.status = 'unavailable';
  key.takenBy = {
    userId: manualUser._id,
    name: manualUser.name,
    email: manualUser.email
  };
  key.takenAt = new Date();

  await key.save();

  // Log the manual assignment
  await AuditService.logKeyTaken(key, manualUser, req, {
    isManualAssignment: true,
    assignedBy: assignedBy._id
  });

  // Create a detailed logbook entry for manual key assignment
  const Logbook = mongoose.model('Logbook');
  await Logbook.create({
    keyNumber: key.keyNumber,
    keyName: key.keyName,
    location: key.location,
    status: 'unavailable',
    category: key.category,
    department: key.department,
    block: key.block,
    description: key.description,
    takenBy: {
      userId: manualUser._id,
      name: manualUser.name,
      email: manualUser.email
    },
    takenAt: new Date(),
    returnedAt: null,
    frequentlyUsed: key.frequentlyUsed,
    isActive: true,
    recordedBy: {
      userId: assignedBy._id,
      role: assignedBy.role
    },
    notes: `Manual assignment by ${assignedBy.name} (${assignedBy.role})`
  });

  // Emit real-time update
  emitKeyTaken(key, req.userId);

  res.status(200).json({
    success: true,
    message: `Key ${key.keyNumber} (${key.keyName}) assigned to ${keyTakerName} successfully`,
    data: { 
      key,
      assignedTo: {
        name: manualUser.name,
        isManualAssignment: true
      },
      assignedBy: {
        id: assignedBy._id,
        name: assignedBy.name,
        role: assignedBy.role
      }
    },
  });
});

/**
 * Cleanup inactive keys (admin only) - permanently delete keys that have been inactive for more than 30 days
 */
export const cleanupInactiveKeys = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Find inactive keys older than 30 days
  const inactiveKeys = await Key.find({
    isActive: false,
    updatedAt: { $lt: thirtyDaysAgo }
  });

  if (inactiveKeys.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No inactive keys found for cleanup",
      data: { deletedCount: 0 }
    });
  }

  // Delete the inactive keys
  const result = await Key.deleteMany({
    isActive: false,
    updatedAt: { $lt: thirtyDaysAgo }
  });

  res.status(200).json({
    success: true,
    message: `Cleanup completed: ${result.deletedCount} inactive keys permanently deleted`,
    data: {
      deletedCount: result.deletedCount,
      deletedKeys: inactiveKeys.map(key => ({ keyNumber: key.keyNumber, keyName: key.keyName }))
    }
  });
});

/**
 * Add a key to user's favorites
 */
export const addFavoriteKey = asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  const userId = req.userId;

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const key = await Key.findById(keyId);
  if (!key) {
    throw new NotFoundError("Key not found");
  }

  // Check if key is already in favorites
  if (user.favoriteKeys && user.favoriteKeys.includes(keyId)) {
    return res.status(200).json({
      success: true,
      message: "Key is already in favorites",
      data: { favoriteKeys: user.favoriteKeys },
    });
  }

  // Add key to favorites
  if (!user.favoriteKeys) {
    user.favoriteKeys = [];
  }
  user.favoriteKeys.push(keyId);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Key added to favorites",
    data: { favoriteKeys: user.favoriteKeys },
  });
});

/**
 * Remove a key from user's favorites
 */
export const removeFavoriteKey = asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  const userId = req.userId;

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check if key is in favorites
  if (!user.favoriteKeys || !user.favoriteKeys.includes(keyId)) {
    return res.status(200).json({
      success: true,
      message: "Key is not in favorites",
      data: { favoriteKeys: user.favoriteKeys || [] },
    });
  }

  // Remove key from favorites
  user.favoriteKeys = user.favoriteKeys.filter(id => id !== keyId);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Key removed from favorites",
    data: { favoriteKeys: user.favoriteKeys },
  });
});

/**
 * Get user's favorite keys
 */
export const getFavoriteKeys = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!user.favoriteKeys || user.favoriteKeys.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No favorite keys found",
      data: { keys: [], favoriteKeys: [] },
    });
  }

  // Get the actual key objects for favorite key IDs
  const keys = await Key.find({
    _id: { $in: user.favoriteKeys },
    isActive: true
  }).populate('takenBy.userId', 'name email');

  res.status(200).json({
    success: true,
    message: "Favorite keys retrieved successfully",
    data: {
      keys,
      favoriteKeys: user.favoriteKeys,
    },
  });
});
