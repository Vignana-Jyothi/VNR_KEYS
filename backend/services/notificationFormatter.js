/**
 * notificationFormatter.js
 * ─────────────────────────────────────────────────────────────────────────
 * Unified notification formatter for role-based key transaction notifications.
 *
 * Generates professional, consistent notifications for:
 * - Faculty (personalized, owner-focused)
 * - Security (processor-specific, operational)
 * - Admin (audit-style, complete information)
 *
 * Supports both single-key and batch transactions with identical formatting.
 */

import { IST } from "./keyNotificationService.js";

/**
 * Format notification message based on recipient role
 * @param {Object} ctx - Transaction context
 * @param {string} recipientRole - "faculty" | "security" | "admin"
 * @returns {Object} { title, message }
 */
export const formatNotificationMessage = (ctx, recipientRole) => {
  const {
    eventType,    // "checkout" | "return"
    faculty,      // User document
    keys,         // [{ keyNumber, keyName, location }]
    processor,    // User document | null
    processorRole, // Display string override
  } = ctx;

  const isCheckout = eventType === "checkout";
  const action = isCheckout ? "issued" : "returned";
  const actionPast = isCheckout ? "issued" : "returned";
  const actionPresent = isCheckout ? "issuing" : "returning";
  const icon = isCheckout ? "🔑" : "✅";
  const accent = isCheckout ? "blue" : "green";

  const dept = faculty.department || "N/A";
  const facId = faculty.facultyId || faculty.employeeId || "N/A";
  const procDisplayRole = processorRole || 
    (processor?.role === "security" ? "Security Officer" : processor?.role || "System");
  const procDisplayName = processor ? processor.name : "Faculty (self)";
  const now = IST();
  const statusLine = "Status:\nCompleted";

  // Format key list as bullet points
  const keyBullets = keys.map(k => `• ${k.keyNumber}`).join("\n");

  switch (recipientRole) {
    case "faculty":
      return formatFacultyNotification({
        facultyName: faculty.name,
        actionPast,
        keyBullets,
        totalKeys: keys.length,
        procDisplayName,
        procDisplayRole,
        now,
        icon,
      });

    case "security":
      return formatSecurityNotification({
        facultyName: faculty.name,
        dept,
        facId,
        actionPast,
        keyBullets,
        totalKeys: keys.length,
        isSelf: processor && ctx.currentUserId === processor._id?.toString(),
        procDisplayName,
        procDisplayRole,
        now,
        icon,
      });

    case "admin":
      return formatAdminNotification({
        facultyName: faculty.name,
        dept,
        facId,
        actionPast,
        keyBullets,
        totalKeys: keys.length,
        procDisplayName,
        procDisplayRole,
        now,
        icon,
      });

    default:
      throw new Error(`Unknown recipient role: ${recipientRole}`);
  }
};

/**
 * Format Faculty notification (personalized, owner-focused)
 */
function formatFacultyNotification({ facultyName, actionPast, keyBullets, totalKeys, procDisplayName, procDisplayRole, now, icon }) {
  const title = `${icon} Keys ${actionPast.charAt(0).toUpperCase() + actionPast.slice(1)} Successfully`;
  const statusLine = "Status:\nCompleted";
  
  const message = `Hello ${facultyName},

Your key request has been approved.

Keys ${actionPast.charAt(0).toUpperCase() + actionPast.slice(1)}:
${keyBullets}

Total Keys:
${totalKeys}

${actionPast.charAt(0).toUpperCase() + actionPast.slice(1)} By:
${procDisplayRole} ${procDisplayName}

Date & Time:
${now}

${statusLine}

Please return the keys after use.`;

  return { title, message };
}

/**
 * Format Security notification (processor-specific, operational)
 */
function formatSecurityNotification({ facultyName, dept, facId, actionPast, keyBullets, totalKeys, isSelf, procDisplayName, procDisplayRole, now, icon }) {
  const title = `${icon} Keys ${actionPast.charAt(0).toUpperCase() + actionPast.slice(1)} — ${facultyName} (${dept})`;
  const statusLine = "Status:\nCompleted";
  
  const processedBy = isSelf ? "You" : `${procDisplayRole} ${procDisplayName}`;
  
  const message = `Faculty:
${facultyName}

Faculty ID:
${facId}

Department:
${dept}

Keys ${actionPast.charAt(0).toUpperCase() + actionPast.slice(1)}:
${keyBullets}

Total Keys:
${totalKeys}

${actionPast.charAt(0).toUpperCase() + actionPast.slice(1)} By:
${processedBy}

Date & Time:
${now}

${statusLine}`;

  return { title, message };
}

/**
 * Format Admin notification (audit-style, complete information)
 */
function formatAdminNotification({ facultyName, dept, facId, actionPast, keyBullets, totalKeys, procDisplayName, procDisplayRole, now, icon }) {
  const title = `${icon} Keys ${actionPast.charAt(0).toUpperCase() + actionPast.slice(1)} — ${facultyName} (${dept})`;
  const statusLine = "Status:\nCompleted";
  
  const message = `Faculty:
${facultyName}

Faculty ID:
${facId}

Department:
${dept}

Keys ${actionPast.charAt(0).toUpperCase() + actionPast.slice(1)}:
${keyBullets}

Total Keys:
${totalKeys}

Processed By:
${procDisplayRole} ${procDisplayName}

Date & Time:
${now}

${statusLine}`;

  return { title, message };
}

/**
 * Format email HTML content based on recipient role
 * @param {Object} ctx - Transaction context
 * @param {string} recipientRole - "faculty" | "security" | "admin"
 * @returns {Object} { subject, html }
 */
export const formatEmailContent = (ctx, recipientRole) => {
  const {
    eventType,
    faculty,
    keys,
    processor,
    processorRole,
  } = ctx;

  const isCheckout = eventType === "checkout";
  const action = isCheckout ? "Issued" : "Returned";
  const actionPast = isCheckout ? "issued" : "returned";
  const icon = isCheckout ? "🔑" : "✅";
  const accentColor = isCheckout ? "#2563eb" : "#16a34a";

  const dept = faculty.department || "N/A";
  const facId = faculty.facultyId || faculty.employeeId || "N/A";
  const procDisplayRole = processorRole || 
    (processor?.role === "security" ? "Security Officer" : processor?.role || "System");
  const procDisplayName = processor ? processor.name : "Faculty (self)";

  const now = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const statusText = "Completed";

  // Format key list as HTML bullets
  const keyListHtml = keys.map(k => `<li>${k.keyNumber}</li>`).join("");

  switch (recipientRole) {
    case "faculty":
      return formatFacultyEmail({
        facultyName: faculty.name,
        action,
        actionPast,
        keyListHtml,
        totalKeys: keys.length,
        procDisplayName,
        procDisplayRole,
        now,
        icon,
        accentColor,
        statusText,
      });

    case "security":
      return formatSecurityEmail({
        facultyName: faculty.name,
        dept,
        facId,
        action,
        actionPast,
        keyListHtml,
        totalKeys: keys.length,
        isSelf: processor && ctx.currentUserId === processor._id?.toString(),
        procDisplayName,
        procDisplayRole,
        now,
        icon,
        accentColor,
        statusText,
      });

    case "admin":
      return formatAdminEmail({
        facultyName: faculty.name,
        dept,
        facId,
        action,
        actionPast,
        keyListHtml,
        totalKeys: keys.length,
        procDisplayName,
        procDisplayRole,
        now,
        icon,
        accentColor,
        statusText,
      });

    default:
      throw new Error(`Unknown recipient role: ${recipientRole}`);
  }
};

/**
 * Format Faculty email HTML
 */
function formatFacultyEmail({ facultyName, action, actionPast, keyListHtml, totalKeys, procDisplayName, procDisplayRole, now, icon, accentColor, statusText }) {
  const subject = `${icon} Keys ${action} Successfully`;
    // Format key list as table rows
  const keyTableRows = keyListHtml
    .split('<li>').filter(Boolean)
    .map(item => {
      const keyNumber = item.replace('</li>', '').trim();
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;text-align:center;">
            <span style="font-size:13px;color:#1e293b;font-weight:600;">${keyNumber}</span>
          </td>
        </tr>
      `;
    })
    .join('');
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:10px;overflow:hidden;
                      box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,${accentColor} 100%);
                        padding:28px 32px;text-align:center;">
              <p style="color:#93c5fd;font-size:13px;margin:0 0 6px;letter-spacing:1px;
                         text-transform:uppercase;">VNR VJIET Key Management</p>
              <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;">
                ${icon} Keys ${action} Successfully
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="font-size:15px;color:#374151;margin:0;">
                Hello <strong>${facultyName}</strong>,
              </p>
              <p style="font-size:14px;color:#6b7280;margin:8px 0 0;">
                Your key request has been approved.
              </p>
            </td>
          </tr>

          <!-- Status badge -->
          <tr>
            <td style="padding:16px 32px 0;">
              <span style="display:inline-block;padding:5px 14px;border-radius:999px;
                            background:${accentColor}22;color:${accentColor};
                            font-size:12px;font-weight:700;letter-spacing:0.5px;">
                ● Completed
              </span>
            </td>
          </tr>

          <!-- Keys section -->
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="font-size:13px;color:#64748b;font-weight:700;margin:0 0 10px;
                         text-transform:uppercase;letter-spacing:0.5px;">
                Keys ${action}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;
                             border-radius:8px;padding:16px;">
                <tr>
                  <td>
                    <ul style="margin:0;padding-left:20px;font-size:14px;color:#1e293b;
                               line-height:1.8;">
                      ${keyListHtml}
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Details section -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;
                             border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Total Keys</p>
                    <p style="font-size:15px;color:#1e293b;font-weight:600;margin:0;">
                      ${totalKeys}
                    </p>
                  </td>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">${action} By</p>
                    <p style="font-size:14px;color:#1e293b;font-weight:600;margin:0;">
                      ${procDisplayRole} ${procDisplayName}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:14px 18px;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Date & Time</p>
                    <p style="font-size:14px;color:#1e293b;font-weight:600;margin:0;">${now}</p>
                    <p style="font-size:11px;color:#94a3b8;margin:8px 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Status</p>
                    <p style="font-size:14px;color:#1e293b;font-weight:600;margin:0;">${statusText}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer note -->
          <tr>
            <td style="padding:24px 32px 32px;">
              <p style="font-size:14px;color:#6b7280;margin:0;line-height:1.6;">
                Please return the keys after use.
              </p>
              <p style="font-size:12px;color:#9ca3af;margin:16px 0 0;line-height:1.6;">
                This is an automated notification from the VNR VJIET Key Management System.
                Please do not reply to this email.
              </p>
            </td>
          </tr>

          <!-- Footer bar -->
          <tr>
            <td style="background:#1e3a5f;padding:14px 32px;text-align:center;">
              <p style="font-size:12px;color:#93c5fd;margin:0;">
                © ${new Date().getFullYear()} VNR VJIET Key Management · All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

/**
 * Format Security email HTML
 */
function formatSecurityEmail({ facultyName, dept, facId, action, actionPast, keyListHtml, totalKeys, isSelf, procDisplayName, procDisplayRole, now, icon, accentColor, statusText }) {
  // Format key list as table rows
  const keyTableRows = keyListHtml
    .split('<li>').filter(Boolean)
    .map(item => {
      const keyNumber = item.replace('</li>', '').trim();
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;text-align:center;">
            <span style="font-size:13px;color:#1e293b;font-weight:600;">${keyNumber}</span>
          </td>
        </tr>
      `;
    })
    .join('');
  const subject = `${icon} Keys ${action} — ${facultyName} (${dept})`;
  const processedBy = isSelf ? "You" : `${procDisplayRole} ${procDisplayName}`;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:10px;overflow:hidden;
                      box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,${accentColor} 100%);
                        padding:28px 32px;text-align:center;">
              <p style="color:#93c5fd;font-size:13px;margin:0 0 6px;letter-spacing:1px;
                         text-transform:uppercase;">VNR VJIET Key Management</p>
              <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;">
                ${icon} Keys ${action} — ${facultyName} (${dept})
              </h1>
            </td>
          </tr>

          <!-- Status badge -->
          <tr>
            <td style="padding:16px 32px 0;">
              <span style="display:inline-block;padding:5px 14px;border-radius:999px;
                            background:${accentColor}22;color:${accentColor};
                            font-size:12px;font-weight:700;letter-spacing:0.5px;">
                ● Completed
              </span>
            </td>
          </tr>

          <!-- Faculty card -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;
                             border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Faculty</p>
                    <p style="font-size:15px;color:#1e293b;font-weight:600;margin:0;">
                      ${facultyName}
                    </p>
                  </td>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Faculty ID</p>
                    <p style="font-size:15px;color:#1e293b;font-weight:600;margin:0;">
                      ${facId}
                    </p>
                  </td>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Department</p>
                    <p style="font-size:15px;color:#1e293b;font-weight:600;margin:0;">
                      ${dept}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Keys section -->
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="font-size:13px;color:#64748b;font-weight:700;margin:0 0 10px;
                         text-transform:uppercase;letter-spacing:0.5px;">
                Keys ${action}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;
                             border-radius:8px;padding:16px;">
                <tr>
                  <td>
                    <ul style="margin:0;padding-left:20px;font-size:14px;color:#1e293b;
                               line-height:1.8;">
                      ${keyListHtml}
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Details section -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;
                             border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Total Keys</p>
                    <p style="font-size:15px;color:#1e293b;font-weight:600;margin:0;">
                      ${totalKeys}
                    </p>
                  </td>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">${action} By</p>
                    <p style="font-size:14px;color:#1e293b;font-weight:600;margin:0;">
                      ${processedBy}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:14px 18px;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Date & Time</p>
                    <p style="font-size:14px;color:#1e293b;font-weight:600;margin:0;">${now}</p>
                    <p style="font-size:11px;color:#94a3b8;margin:8px 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Status</p>
                    <p style="font-size:14px;color:#1e293b;font-weight:600;margin:0;">${statusText}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer note -->
          <tr>
            <td style="padding:24px 32px 32px;">
              <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">
                This is an automated notification from the VNR VJIET Key Management System.
                Please do not reply to this email.
              </p>
            </td>
          </tr>

          <!-- Footer bar -->
          <tr>
            <td style="background:#1e3a5f;padding:14px 32px;text-align:center;">
              <p style="font-size:12px;color:#93c5fd;margin:0;">
                © ${new Date().getFullYear()} VNR VJIET Key Management · All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

/**
 * Format Admin email HTML
 */
function formatAdminEmail({ facultyName, dept, facId, action, actionPast, keyListHtml, totalKeys, procDisplayName, procDisplayRole, now, icon, accentColor, statusText }) {
  // Format key list as table rows
  const keyTableRows = keyListHtml
    .split('<li>').filter(Boolean)
    .map(item => {
      const keyNumber = item.replace('</li>', '').trim();
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;text-align:center;">
            <span style="font-size:13px;color:#1e293b;font-weight:600;">${keyNumber}</span>
          </td>
        </tr>
      `;
    })
    .join('');
  const subject = `${icon} Keys ${action} — ${facultyName} (${dept})`;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:10px;overflow:hidden;
                      box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,${accentColor} 100%);
                        padding:28px 32px;text-align:center;">
              <p style="color:#93c5fd;font-size:13px;margin:0 0 6px;letter-spacing:1px;
                         text-transform:uppercase;">VNR VJIET Key Management</p>
              <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;">
                ${icon} Keys ${action} — ${facultyName} (${dept})
              </h1>
            </td>
          </tr>

          <!-- Status badge -->
          <tr>
            <td style="padding:16px 32px 0;">
              <span style="display:inline-block;padding:5px 14px;border-radius:999px;
                            background:${accentColor}22;color:${accentColor};
                            font-size:12px;font-weight:700;letter-spacing:0.5px;">
                ● Audit Record
              </span>
            </td>
          </tr>

          <!-- Faculty card -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;
                             border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Faculty</p>
                    <p style="font-size:15px;color:#1e293b;font-weight:600;margin:0;">
                      ${facultyName}
                    </p>
                  </td>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Faculty ID</p>
                    <p style="font-size:15px;color:#1e293b;font-weight:600;margin:0;">
                      ${facId}
                    </p>
                  </td>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Department</p>
                    <p style="font-size:15px;color:#1e293b;font-weight:600;margin:0;">
                      ${dept}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Keys section -->
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="font-size:13px;color:#64748b;font-weight:700;margin:0 0 10px;
                         text-transform:uppercase;letter-spacing:0.5px;">
                Keys ${action}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;
                             border-radius:8px;padding:16px;">
                <tr>
                  <td>
                    <ul style="margin:0;padding-left:20px;font-size:14px;color:#1e293b;
                               line-height:1.8;">
                      ${keyListHtml}
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Details section -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;
                             border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Total Keys</p>
                    <p style="font-size:15px;color:#1e293b;font-weight:600;margin:0;">
                      ${totalKeys}
                    </p>
                  </td>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Processed By</p>
                    <p style="font-size:14px;color:#1e293b;font-weight:600;margin:0;">
                      ${procDisplayRole} ${procDisplayName}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:14px 18px;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Date & Time</p>
                    <p style="font-size:14px;color:#1e293b;font-weight:600;margin:0;">${now}</p>
                    <p style="font-size:11px;color:#94a3b8;margin:8px 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Status</p>
                    <p style="font-size:14px;color:#1e293b;font-weight:600;margin:0;">${statusText}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer note -->
          <tr>
            <td style="padding:24px 32px 32px;">
              <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">
                This is an automated audit notification from the VNR VJIET Key Management System.
                Please do not reply to this email.
              </p>
            </td>
          </tr>

          <!-- Footer bar -->
          <tr>
            <td style="background:#1e3a5f;padding:14px 32px;text-align:center;">
              <p style="font-size:12px;color:#93c5fd;margin:0;">
                © ${new Date().getFullYear()} VNR VJIET Key Management · All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
