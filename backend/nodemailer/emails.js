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
	} = data;

	const isCheckout   = eventType === "checkout";
	const eventLabel   = isCheckout ? "Keys Successfully Issued" : "Keys Successfully Returned";
	const eventIcon    = isCheckout ? "🔑" : "✅";
	const statusLabel  = "Completed";
	const statusColor  = "#16a34a";   // green

	// Subject line per role
	const subjectMap = {
		faculty:  isCheckout ? `🔑 Keys Successfully Issued — VNR Keys` : `✅ Keys Successfully Returned — VNR Keys`,
		security: isCheckout ? `Keys Issued to ${facultyName}` : `Keys Returned by ${facultyName}`,
		admin:    isCheckout ? `Key Transaction Audit — Checkout` : `Key Transaction Audit — Return`,
	};
	const subject = subjectMap[recipientRole] ?? eventLabel;

	// Key table rows
	const keyRowsHtml = keys.map((k, i) => `
		<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
			<td style="padding:10px 14px;font-size:13px;color:#1e293b;
			            font-weight:600;border-bottom:1px solid #e2e8f0;">
				${k.keyNumber || "—"}
			</td>
			<td style="padding:10px 14px;font-size:13px;color:#374151;
			            border-bottom:1px solid #e2e8f0;">
				${k.keyName || "—"}
			</td>
			<td style="padding:10px 14px;font-size:13px;color:#374151;
			            border-bottom:1px solid #e2e8f0;">
				${k.location || "—"}
			</td>
		</tr>
	`).join("");

	const dateTime = new Date().toLocaleString("en-IN", {
		timeZone: "Asia/Kolkata",
		day:      "2-digit",
		month:    "short",
		year:     "numeric",
		hour:     "2-digit",
		minute:   "2-digit",
		hour12:   true,
	});

	const vars = {
		subject,
		recipientName,
		eventLabel,
		eventIcon,
		keyRowsHtml,
		totalKeys:       String(keys.length),
		facultyName,
		facultyId,
		department,
		processedBy,
		processedByRole,
		dateTime,
		statusLabel,
		statusColor,
		currentYear:     String(new Date().getFullYear()),
	};

	let html = KEY_TRANSACTION_EMAIL_TEMPLATE;
	Object.entries(vars).forEach(([k, v]) => {
		html = html.split(`{${k}}`).join(v ?? "");
	});

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
