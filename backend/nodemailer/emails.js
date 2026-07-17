import { createTransporter, emailConfig } from "./nodemailer.config.js";
import {
	VERIFICATION_EMAIL_TEMPLATE,
	PASSWORD_RESET_REQUEST_TEMPLATE,
	PASSWORD_RESET_SUCCESS_TEMPLATE,
	WELCOME_EMAIL_TEMPLATE,
	NOTIFICATION_EMAIL_TEMPLATE,
	KEY_TRANSACTION_EMAIL_TEMPLATE,
} from "./emailTemplates.js";

// Send verification email
export const sendVerificationEmail = async (email, verificationToken) => {
	const transporter = createTransporter();
	
	const mailOptions = {
		from: emailConfig.from,
		to: email,
		subject: "Verify your email",
		html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken),
	};

	try {
		const info = await transporter.sendMail(mailOptions);
		console.log("✅ Verification email sent successfully:", info.messageId);
		return info;
	} catch (error) {
		console.error("❌ Error sending verification email:", error);
		throw new Error(`Error sending verification email: ${error.message}`);
	}
};

// Send welcome email
export const sendWelcomeEmail = async (email, name) => {
	const transporter = createTransporter();
	
	const mailOptions = {
		from: emailConfig.from,
		to: email,
		subject: "Welcome to our platform!",
		html: WELCOME_EMAIL_TEMPLATE.replace("{name}", name).replace("{companyName}", emailConfig.from.name),
	};

	try {
		const info = await transporter.sendMail(mailOptions);
		console.log("✅ Welcome email sent successfully:", info.messageId);
		return info;
	} catch (error) {
		console.error("❌ Error sending welcome email:", error);
		throw new Error(`Error sending welcome email: ${error.message}`);
	}
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetURL) => {
	const transporter = createTransporter();
	
	const mailOptions = {
		from: emailConfig.from,
		to: email,
		subject: "Reset your password",
		html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
	};

	try {
		const info = await transporter.sendMail(mailOptions);
		console.log("✅ Password reset email sent successfully:", info.messageId);
		return info;
	} catch (error) {
		console.error("❌ Error sending password reset email:", error);
		throw new Error(`Error sending password reset email: ${error.message}`);
	}
};

// Send password reset success email
export const sendResetSuccessEmail = async (email) => {
	const transporter = createTransporter();

	const mailOptions = {
		from: emailConfig.from,
		to: email,
		subject: "Password Reset Successful",
		html: PASSWORD_RESET_SUCCESS_TEMPLATE,
	};

	try {
		const info = await transporter.sendMail(mailOptions);
		console.log("✅ Password reset success email sent successfully:", info.messageId);
		return info;
	} catch (error) {
		console.error("❌ Error sending password reset success email:", error);
		throw new Error(`Error sending password reset success email: ${error.message}`);
	}
};

// Send notification email
export const sendNotificationEmail = async (email, name, title, message, type, metadata = {}) => {
	const transporter = createTransporter();

	// Customize subject based on notification type
	let subject = title;
	if (type === 'key_reminder') {
		subject = `🔑 Key Return Reminder - ${title}`;
	} else if (type === 'security_alert') {
		subject = `🚨 Security Alert - ${title}`;
	} else if (type === 'key_overdue') {
		subject = `⚠️ Overdue Key Alert - ${title}`;
	}

	// Prepare template variables
	const templateVars = {
		name,
		title,
		message,
		type,
		metadata: JSON.stringify(metadata, null, 2),
		currentDate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
		currentYear: new Date().getFullYear(),
		companyName: emailConfig.from.name || 'VNR Keys'
	};

	// Replace template variables
	let htmlContent = NOTIFICATION_EMAIL_TEMPLATE;
	Object.keys(templateVars).forEach(key => {
		const regex = new RegExp(`{${key}}`, 'g');
		htmlContent = htmlContent.replace(regex, templateVars[key]);
	});

	const mailOptions = {
		from: emailConfig.from,
		to: email,
		subject: subject,
		html: htmlContent,
	};

	try {
		const info = await transporter.sendMail(mailOptions);
		console.log("✅ Notification email sent successfully:", info.messageId);
		return info;
	} catch (error) {
		console.error("❌ Error sending notification email:", error);
		throw new Error(`Error sending notification email: ${error.message}`);
	}
};

/**
 * Send a structured key-transaction email (checkout or return).
 * This function now uses the unified formatter for consistent role-based formatting.
 *
 * @param {string}   toEmail
 * @param {string}   recipientName
 * @param {object}   data
 * @param {string}   data.eventType       - "checkout" | "return"
 * @param {string}   data.facultyName
 * @param {string}   data.facultyId
 * @param {string}   data.department
 * @param {Array}    data.keys            - [{keyNumber, keyName, location}]
 * @param {string}   data.processedBy     - display name of the person who scanned
 * @param {string}   data.processedByRole - e.g. "Security Officer" | "Faculty"
 * @param {string}   data.recipientRole   - "faculty" | "security" | "admin"
 */
export const sendKeyTransactionEmail = async (toEmail, recipientName, data) => {
	const transporter = createTransporter();

	const {
		eventType,
		facultyName,
		facultyId    = "N/A",
		department   = "N/A",
		keys         = [],
		processedBy,
		processedByRole = "",
		recipientRole   = "faculty",
		currentUserId   = null,
	} = data;

	// Import the formatter dynamically to avoid circular dependencies
	const { formatEmailContent } = await import("../services/notificationFormatter.js");

	// Build context for formatter
	const ctx = {
		eventType,
		faculty: {
			name: facultyName,
			facultyId,
			department,
		},
		keys,
		processor: processedBy ? { name: processedBy, role: processedByRole || null } : null,
		processorRole: processedByRole,
		currentUserId,
	};

	// Get formatted email content from the unified formatter
	const { subject, html } = formatEmailContent(ctx, recipientRole);

	const mailOptions = {
		from:    emailConfig.from,
		to:      toEmail,
		subject,
		html,
	};

	try {
		const info = await transporter.sendMail(mailOptions);
		console.log(`✅ Key transaction email sent to ${toEmail} (${recipientRole}):`, info.messageId);
		return info;
	} catch (error) {
		console.error(`❌ Error sending key transaction email to ${toEmail}:`, error.message);
		throw error;
	}
};

/**
 * Send daily key return summary email with professional HTML formatting
 * @param {string} toEmail - Recipient email address
 * @param {string} recipientName - Recipient name
 * @param {object} summaryData - Summary data
 * @param {number} summaryData.totalUnreturnedKeys - Total count of unreturned keys
 * @param {object} summaryData.keysByDepartment - Keys grouped by department
 * @param {string} summaryData.generatedAt - ISO timestamp when summary was generated
 * @param {string} summaryData.department - Optional department for HOD-specific summaries
 */
export const sendDailySummaryEmail = async (toEmail, recipientName, summaryData) => {
	const transporter = createTransporter();

	const {
		totalUnreturnedKeys,
		keysByDepartment,
		generatedAt,
		department = null // Optional department for HOD-specific summaries
	} = summaryData;

	console.log(`📧 sendDailySummaryEmail called:`);
	console.log(`   To: ${toEmail}`);
	console.log(`   Recipient: ${recipientName}`);
	console.log(`   Department: ${department || 'All departments'}`);
	console.log(`   Total keys: ${totalUnreturnedKeys}`);

	// Format the generated date
	const generatedDate = new Date(generatedAt).toLocaleString("en-IN", {
		timeZone: "Asia/Kolkata",
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});

	// Build department rows HTML
	const departmentRows = Object.entries(keysByDepartment).map(([dept, keys]) => {
		const keyRows = keys.map(k => `
			<tr>
				<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">
					<span style="font-size:13px;color:#1e293b;font-weight:600;">${k.keyNumber}</span>
				</td>
				<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">
					<span style="font-size:13px;color:#64748b;">${k.keyName}</span>
				</td>
				<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">
					<span style="font-size:13px;color:#1e293b;">${k.holder}</span>
				</td>
			</tr>
		`).join('');

		return `
			<tr>
				<td colspan="3" style="padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;">
					<div style="display:flex;justify-content:space-between;align-items:center;">
						<span style="font-size:15px;font-weight:700;color:#1e293b;">${dept}</span>
						<span style="font-size:13px;color:#64748b;background:#e2e8f0;padding:4px 12px;border-radius:999px;">${keys.length} keys</span>
					</div>
				</td>
			</tr>
			${keyRows}
		`;
	}).join('');

	const subject = department 
		? `📊 Daily Key Return Summary - ${department} - ${totalUnreturnedKeys} Keys Pending`
		: `📊 Daily Key Return Summary - ${totalUnreturnedKeys} Keys Pending`;
	
	const summaryTitle = department 
		? `📊 Daily Key Return Summary - ${department} Department`
		: `📊 Daily Key Return Summary`;
	
	const summaryDescription = department
		? `Here's the daily summary of unreturned keys for the ${department} department as of ${generatedDate}.`
		: `Here's the daily summary of unreturned keys as of ${generatedDate}.`;

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
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,#7c3aed 100%);
                        padding:28px 32px;text-align:center;">
              <p style="color:#93c5fd;font-size:13px;margin:0 0 6px;letter-spacing:1px;
                         text-transform:uppercase;">VNR VJIET Key Management</p>
              <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;">
                ${summaryTitle}
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="font-size:15px;color:#374151;margin:0;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="font-size:14px;color:#6b7280;margin:8px 0 0;">
                ${summaryDescription}
              </p>
            </td>
          </tr>

          <!-- Summary Stats -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;
                             border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:18px 24px;text-align:center;">
                    <p style="font-size:32px;font-weight:700;color:#7c3aed;margin:0;">
                      ${totalUnreturnedKeys}
                    </p>
                    <p style="font-size:13px;color:#64748b;margin:4px 0 0;text-transform:uppercase;letter-spacing:0.5px;">
                      Total Unreturned Keys
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Keys by Department -->
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="font-size:13px;color:#64748b;font-weight:700;margin:0 0 10px;
                         text-transform:uppercase;letter-spacing:0.5px;">
                ${department ? 'Keys' : 'Keys by Department'}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#ffffff;border:1px solid #e2e8f0;
                             border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#f1f5f9;">
                    <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">
                      Key Number
                    </th>
                    <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">
                      Key Name
                    </th>
                    <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">
                      Held By
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${departmentRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Footer note -->
          <tr>
            <td style="padding:24px 32px 32px;">
              <p style="font-size:14px;color:#6b7280;margin:0;line-height:1.6;">
                ${department 
                  ? 'Please follow up with faculty members in your department to ensure timely key returns.'
                  : 'Please follow up with faculty members to ensure timely key returns.'}
              </p>
              <p style="font-size:12px;color:#9ca3af;margin:16px 0 0;line-height:1.6;">
                This is an automated daily summary from the VNR VJIET Key Management System.
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

	const mailOptions = {
		from: emailConfig.from,
		to: toEmail,
		subject,
		html,
	};

	try {
		const info = await transporter.sendMail(mailOptions);
		console.log(`✅ Daily summary email sent successfully to ${toEmail}:`, info.messageId);
		return info;
	} catch (error) {
		console.error(`❌ Error sending daily summary email to ${toEmail}:`, error.message);
		console.error(`   Error details:`, error);
		throw error;
	}
};
