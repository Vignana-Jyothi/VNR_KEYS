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

/** Build the notification message for a recipient role */
function buildMessage(ctx, recipientRole) {
  const {
    eventType, faculty, keys,
    processor, processorRole,
  } = ctx;

  const isCheckout   = eventType === "checkout";
  const action       = isCheckout ? "issued" : "returned";
  const keyBullets   = keys.map(k => `  • ${k.keyNumber} — ${k.keyName} (${k.location})`).join("\n");
  const dept         = faculty.department || "N/A";
  const facId        = faculty.facultyId  || faculty.employeeId || "N/A";
  const procLine     = processor
    ? `\nProcessed By:  ${processorRole || processor.role}: ${processor.name}`
    : "";
  const now          = IST();

  if (recipientRole === "faculty") {
    return (
      `Keys ${action} successfully.\n\n` +
      `Department:    ${dept}\n` +
      `Faculty ID:    ${facId}\n\n` +
      `Keys ${isCheckout ? "Issued" : "Returned"}:\n${keyBullets}\n\n` +
      `Total:  ${keys.length} key${keys.length > 1 ? "s" : ""}\n` +
      `Time:   ${now}` +
      procLine
    );
  }

  // security / admin
  return (
    `Faculty Details:\n` +
    `  Name:        ${faculty.name}\n` +
    `  Faculty ID:  ${facId}\n` +
    `  Department:  ${dept}\n\n` +
    `Keys ${isCheckout ? "Issued" : "Returned"}:\n${keyBullets}\n\n` +
    `Total:  ${keys.length} key${keys.length > 1 ? "s" : ""}\n` +
    `Time:   ${now}` +
    procLine
  );
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

  const title  = isCheckout
    ? `${isBulk ? "Bulk " : ""}Key${count > 1 ? "s" : ""} Issued — ${count} Key${count > 1 ? "s" : ""}`
    : `${isBulk ? "Bulk " : ""}Key${count > 1 ? "s" : ""} Returned — ${count} Key${count > 1 ? "s" : ""}`;

  const metadata = buildMetadata({ eventType, isBulk, faculty, keys, processor });
  const type     = isCheckout ? "key_taken" : "key_returned";

  // ── 1. FACULTY notification + email ─────────────────────────────────
  await safely("faculty-db", async () => {
    const msg = buildMessage({ eventType, faculty, keys, processor, processorRole: procDisplayRole }, "faculty");
    const notif = await createNotification({
      recipient: {
        userId: faculty._id,
        name:   faculty.name,
        email:  faculty.email,
        role:   faculty.role,
      },
      title,
      message:  msg,
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
  const securityUsers = await User.find({ role: "security", isVerified: true }).lean();
  const secMsg        = buildMessage({ eventType, faculty, keys, processor, processorRole: procDisplayRole }, "security");
  const secTitle      = isCheckout
    ? `Keys Issued — ${faculty.name} (${dept})`
    : `Keys Returned — ${faculty.name} (${dept})`;

  for (const su of securityUsers) {
    // Skip notifying the processor themselves (they already know)
    const isSelf = processor && su._id.toString() === processor._id.toString();

    await safely(`security-db-${su._id}`, async () => {
      const notif = await createNotification({
        recipient: { userId: su._id, name: su.name, email: su.email, role: su.role },
        title:     secTitle,
        message:   secMsg,
        type,
        priority:  "low",
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

    if (!isSelf) {
      await safely(`security-email-${su._id}`, async () => {
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
  const adminMsg   = buildMessage({ eventType, faculty, keys, processor, processorRole: procDisplayRole }, "admin");
  const adminTitle = isCheckout
    ? `[Audit] Key Checkout — ${faculty.name} · ${count} Key${count > 1 ? "s" : ""}`
    : `[Audit] Key Return — ${faculty.name} · ${count} Key${count > 1 ? "s" : ""}`;

  for (const au of adminUsers) {
    await safely(`admin-db-${au._id}`, async () => {
      const notif = await createNotification({
        recipient: { userId: au._id, name: au.name, email: au.email, role: au.role },
        title:     adminTitle,
        message:   adminMsg,
        type,
        priority:  "low",
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

  console.log(`✅ keyNotificationService: ${eventType} · ${count} key(s) · faculty:${faculty.name} · notified security(${securityUsers.length}) admin(${adminUsers.length})`);
};
