/**
 * keyNotificationService.js
 * ─────────────────────────────────────────────────────────────────────────
 * Central notification hub for ALL key checkout / return events.
 *
 * Every successful transaction must call ONE function from this file.
 * It then takes care of:
 *   1. Creating DB notification(s)
 *   2. Broadcasting real-time Socket.IO events
 *   3. Sending HTML emails (faculty / security / admin)
 *
 * ─── Public API ───────────────────────────────────────────────────────────
 *
 *   notifyKeyTransaction(ctx)
 *
 *   ctx = {
 *     eventType    : "checkout" | "return"        // required
 *     isBulk       : boolean                       // false for single-key
 *     faculty      : User document                 // the key holder
 *     keys         : [{ keyNumber, keyName, location }]  // issued/returned keys
 *     processor    : User document | null           // who scanned (security) or null
 *     processorRole: string                         // "Security Officer" | "Faculty" etc.
 *   }
 */

import User from "../models/user.model.js";
import { createNotification } from "./notificationService.js";
import { emitNotificationToRole } from "./socketService.js";
import { sendKeyTransactionEmail } from "../nodemailer/emails.js";
import { formatNotificationMessage, formatEmailContent } from "./notificationFormatter.js";

// ── helpers ───────────────────────────────────────────────────────────────

const IST = (d = new Date()) =>
  d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day:      "2-digit",
    month:    "short",
    year:     "numeric",
    hour:     "2-digit",
    minute:   "2-digit",
    hour12:   true,
  });

/** Build the notification message for a recipient role using the unified formatter */
function buildMessage(ctx, recipientRole) {
  return formatNotificationMessage(ctx, recipientRole);
}

/** Build the structured metadata payload stored on every notification */
function buildMetadata(ctx) {
  const { eventType, isBulk, faculty, keys, processor } = ctx;
  return {
    eventType,
    isBulk,
    facultyId:       faculty._id?.toString(),
    facultyName:     faculty.name,
    facultyDbId:     faculty.facultyId || faculty.employeeId || null,
    department:      faculty.department || "N/A",
    keys:            keys.map(k => ({ keyNumber: k.keyNumber, keyName: k.keyName, location: k.location })),
    totalKeys:       keys.length,
    processedBy:     processor?._id?.toString() || null,
    processedByName: processor?.name || null,
    processedByRole: processor?.role || null,
    timestamp:       new Date().toISOString(),
    status:          "completed",
  };
}

/** Safe wrapper — errors don't crash the main transaction */
async function safely(label, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`❌ keyNotificationService [${label}]:`, err.message);
  }
}

// ── Main export ───────────────────────────────────────────────────────────

/**
 * Notify all relevant parties about a key transaction.
 * Always call after a successful DB write; never before.
 *
 * @param {object} ctx
 */
export const notifyKeyTransaction = async (ctx) => {
  const {
    eventType,            // "checkout" | "return"
    isBulk   = false,
    faculty,              // User doc — who the keys belong to
    keys     = [],        // [{ keyNumber, keyName, location }]
    processor = null,     // User doc — who processed (security) or null
    processorRole = null, // display string override
  } = ctx;

  if (!faculty || keys.length === 0) return;

  const isCheckout     = eventType === "checkout";
  const count          = keys.length;
  const dept           = faculty.department || "N/A";
  const facId          = faculty.facultyId  || faculty.employeeId || "N/A";
  const procDisplayRole = processorRole
    || (processor?.role === "security" ? "Security Officer" : processor?.role || "System");
  const procDisplayName = processor ? `${procDisplayRole}: ${processor.name}` : "Faculty (self)";

  const metadata = buildMetadata({ eventType, isBulk, faculty, keys, processor });
  const type     = isCheckout ? "key_taken" : "key_returned";

  // Context for formatter
  const ctx = {
    eventType,
    faculty,
    keys,
    processor,
    processorRole: procDisplayRole,
    currentUserId: processor?._id?.toString(),
  };

  // ── 1. FACULTY notification + email ─────────────────────────────────
  await safely("faculty-db", async () => {
    const { title, message } = formatNotificationMessage(ctx, "faculty");
    const notif = await createNotification({
      recipient: {
        userId: faculty._id,
        name:   faculty.name,
        email:  faculty.email,
        role:   faculty.role,
      },
      title,
      message,
      type,
      priority: "low",
      metadata,
    });
    emitNotificationToRole(faculty.role, notif);
    // also emit to personal room for immediate bell-icon update
    if (global.io) global.io.to(`user-${faculty._id}`).emit("notification", {
      id:        notif._id,
      type:      notif.type,
      title:     notif.title,
      message:   notif.message,
      priority:  notif.priority,
      metadata:  notif.metadata,
      createdAt: notif.createdAt,
      isRead:    false,
      timestamp: new Date().toISOString(),
    });
  });

  await safely("faculty-email", async () => {
    const { subject, html } = formatEmailContent(ctx, "faculty");
    await sendKeyTransactionEmail(faculty.email, faculty.name, {
      eventType,
      facultyName:     faculty.name,
      facultyId:       facId,
      department:      dept,
      keys,
      processedBy:     procDisplayName,
      processedByRole: procDisplayRole,
      recipientRole:   "faculty",
    });
  });

  // ── 2. SECURITY notifications + emails ──────────────────────────────
  // If a security officer processed the transaction, notify only that officer
  // If faculty took the key themselves (processor is null), notify all security users for awareness
  if (processor && processor.role === "security") {
    // Notify only the specific security officer who processed it
    await safely("security-db", async () => {
      const { title, message } = formatNotificationMessage(ctx, "security");
      const notif = await createNotification({
        recipient: { userId: processor._id, name: processor.name, email: processor.email, role: processor.role },
        title,
        message,
        type,
        priority: "low",
        metadata,
      });
      emitNotificationToRole("security", notif);
      if (global.io) global.io.to(`user-${processor._id}`).emit("notification", {
        id: notif._id, type: notif.type, title: notif.title,
        message: notif.message, priority: notif.priority,
        metadata: notif.metadata, createdAt: notif.createdAt,
        isRead: false, timestamp: new Date().toISOString(),
      });
    });

    await safely("security-email", async () => {
      const { subject, html } = formatEmailContent(ctx, "security");
      await sendKeyTransactionEmail(processor.email, processor.name, {
        eventType,
        facultyName:     faculty.name,
        facultyId:       facId,
        department:      dept,
        keys,
        processedBy:     procDisplayName,
        processedByRole: procDisplayRole,
        recipientRole:   "security",
      });
    });
  } else if (!processor) {
    // Faculty took the key themselves - notify all security users for awareness
    const securityUsers = await User.find({ role: "security", isVerified: true }).lean();
    for (const su of securityUsers) {
      await safely(`security-db-${su._id}`, async () => {
        const { title, message } = formatNotificationMessage(ctx, "security");
        const notif = await createNotification({
          recipient: { userId: su._id, name: su.name, email: su.email, role: su.role },
          title,
          message,
          type,
          priority: "low",
          metadata,
        });
        emitNotificationToRole("security", notif);
        if (global.io) global.io.to(`user-${su._id}`).emit("notification", {
          id: notif._id, type: notif.type, title: notif.title,
          message: notif.message, priority: notif.priority,
          metadata: notif.metadata, createdAt: notif.createdAt,
          isRead: false, timestamp: new Date().toISOString(),
        });
      });

      await safely(`security-email-${su._id}`, async () => {
        const { subject, html } = formatEmailContent(ctx, "security");
        await sendKeyTransactionEmail(su.email, su.name, {
          eventType,
          facultyName:     faculty.name,
          facultyId:       facId,
          department:      dept,
          keys,
          processedBy:     procDisplayName,
          processedByRole: procDisplayRole,
          recipientRole:   "security",
        });
      });
    }
  }

  // ── 3. ADMIN notifications + emails ──────────────────────────────────
  const adminUsers = await User.find({ role: "admin", isVerified: true }).lean();

  for (const au of adminUsers) {
    await safely(`admin-db-${au._id}`, async () => {
      const { title, message } = formatNotificationMessage(ctx, "admin");
      const notif = await createNotification({
        recipient: { userId: au._id, name: au.name, email: au.email, role: au.role },
        title,
        message,
        type,
        priority: "low",
        metadata,
      });
      emitNotificationToRole("admin", notif);
      if (global.io) global.io.to(`user-${au._id}`).emit("notification", {
        id: notif._id, type: notif.type, title: notif.title,
        message: notif.message, priority: notif.priority,
        metadata: notif.metadata, createdAt: notif.createdAt,
        isRead: false, timestamp: new Date().toISOString(),
      });
    });

    await safely(`admin-email-${au._id}`, async () => {
      const { subject, html } = formatEmailContent(ctx, "admin");
      await sendKeyTransactionEmail(au.email, au.name, {
        eventType,
        facultyName:     faculty.name,
        facultyId:       facId,
        department:      dept,
        keys,
        processedBy:     procDisplayName,
        processedByRole: procDisplayRole,
        recipientRole:   "admin",
      });
    });
  }

  const securityCount = processor && processor.role === 'security' ? 1 : 
                         (!processor ? (await User.find({ role: 'security', isVerified: true }).lean()).length : 0);
  console.log(`✅ keyNotificationService: ${eventType} · ${count} key(s) · faculty:${faculty.name} · notified security(${securityCount}) admin(${adminUsers.length})`);
};
