import express from "express";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markMultipleAsRead,
  markAllAsRead,
  triggerKeyReminders,
  getNotificationStats,
  cleanupNotifications,
  getNotificationById,
  getNotificationHistory,
  archiveNotification,
  unarchiveNotification,
  deleteNotification
} from "../controllers/notification.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { rolePermissions } from "../middleware/roleAuth.js";
import { asyncHandler } from "../utils/errorHandler.js";
import { createDailySummaryNotifications } from "../services/notificationService.js";

const router = express.Router();

// All notification routes require authentication
router.use(verifyToken);

// GET routes - accessible to all authenticated users
router.get("/", getMyNotifications); // Get user's notifications with optional filtering
router.get("/unread-count", getUnreadCount); // Get unread notification count
router.get("/history/list", getNotificationHistory); // Get notification history (archived & read)
router.get("/:notificationId", getNotificationById); // Get specific notification by ID

// POST routes - accessible to all authenticated users
router.post("/mark-multiple-read", markMultipleAsRead); // Mark multiple notifications as read

// DELETE routes - accessible to all authenticated users
router.delete("/:notificationId", deleteNotification); // Permanently delete a notification

// PUT/PATCH routes - accessible to all authenticated users
router.patch("/:notificationId/read", markAsRead); // Mark specific notification as read
router.patch("/:notificationId/unread", markAsUnread); // Mark specific notification as unread
router.patch("/:notificationId/archive", archiveNotification); // Archive a notification
router.patch("/:notificationId/unarchive", unarchiveNotification); // Unarchive a notification
router.patch("/mark-all-read", markAllAsRead); // Mark all notifications as read


// Admin-only routes
router.post("/trigger-reminders", rolePermissions.adminOnly, triggerKeyReminders); // Manually trigger key reminders
router.get("/admin/stats", rolePermissions.adminOnly, getNotificationStats); // Get notification statistics
router.post("/admin/cleanup", rolePermissions.adminOnly, cleanupNotifications); // Cleanup expired notifications

// Security & Admin route for resending daily summary
router.post(
  "/resend-daily-summary",
  rolePermissions.adminOrSecurity,
  asyncHandler(async (req, res) => {
    // Generate and send notifications to ALL recipients (Admin, Security, HOD)
    // Pass userId for logging context but sendToAll=true to send to everyone
    const result = await createDailySummaryNotifications(req.userId, true);

    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate daily summary. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: `Daily summary sent to ${result.totalNotifications} recipients — ${result.totalUnreturnedKeys ?? 0} unreturned key(s) at this time`,
      data: result
    });
  })
);

export default router;
