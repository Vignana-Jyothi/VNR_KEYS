export const VERIFICATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Verify Your Email</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello,</p>
    <p>Thank you for signing up! Your verification code is:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50;">{verificationCode}</span>
    </div>
    <p>Enter this code on the verification page to complete your registration.</p>
    <p>This code will expire in 24 hours for security reasons.</p>
    <p>If you didn't create an account with us, please ignore this email.</p>
    <p>Best regards,<br>Your App Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

export const WELCOME_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome!</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Welcome to {companyName}!</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello {name},</p>
    <p>Welcome to our platform! We're excited to have you on board.</p>
    <p>Your email has been successfully verified and your account is now active.</p>
    <p>You can now enjoy all the features our platform has to offer.</p>
    <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
    <p>Best regards,<br>The {companyName} Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

export const PASSWORD_RESET_SUCCESS_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Password Reset Successful</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello,</p>
    <p>We're writing to confirm that your password has been successfully reset.</p>
    <p>If you did not initiate this password reset, please contact our support team immediately.</p>
    <p>For security reasons, we recommend that you:</p>
    <ul>
      <li>Use a strong, unique password</li>
      <li>Enable two-factor authentication if available</li>
      <li>Avoid using the same password across multiple sites</li>
    </ul>
    <p>Thank you for helping us keep your account secure.</p>
    <p>Best regards,<br>Your App Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

export const PASSWORD_RESET_REQUEST_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Password Reset</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello,</p>
    <p>We received a request to reset your password. If you didn't make this request, please ignore this email.</p>
    <p>To reset your password, click the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{resetURL}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
    </div>
    <p>Or copy and paste this URL into your browser:</p>
    <p style="word-break: break-all; color: #666;">{resetURL}</p>
    <p>This link will expire in 1 hour for security reasons.</p>
    <p>Best regards,<br>Your App Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

export const NOTIFICATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #FF6B35, #F7931E); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">🔑 VNR Keys Notification</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <h2 style="color: #FF6B35; margin-top: 0;">{title}</h2>
    <p>Hello {name},</p>
    <div style="background-color: #fff; padding: 15px; border-left: 4px solid #FF6B35; margin: 20px 0;">
      <p style="margin: 0; font-size: 16px;">{message}</p>
    </div>

    <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
      <h3 style="margin-top: 0; color: #856404;">📋 Notification Details</h3>
      <p><strong>Type:</strong> {type}</p>
      <p><strong>Time:</strong> {currentDate}</p>
      <p><strong>Priority:</strong> High</p>
    </div>

    <p style="margin-top: 30px;">Please take appropriate action as soon as possible.</p>
    <p>If you have any questions or need assistance, please contact the security office.</p>
    <p>Best regards,<br>The {companyName} Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated notification from the VNR Keys Management System.</p>
    <p>© {currentYear} {companyName}. All rights reserved.</p>
  </div>
</body>
</html>
`;

// ─── Key Transaction Email Template ────────────────────────────────────────
// Used for all checkout / return events (single and batch)
// Variables: {subject} {recipientName} {eventLabel} {eventIcon}
//            {keyRowsHtml} {totalKeys} {facultyName} {facultyId}
//            {department} {processedBy} {processedByRole}
//            {dateTime} {statusLabel} {statusColor}
export const KEY_TRANSACTION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
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
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);
                        padding:28px 32px;text-align:center;">
              <p style="color:#93c5fd;font-size:13px;margin:0 0 6px;letter-spacing:1px;
                         text-transform:uppercase;">VNR VJIET Key Management</p>
              <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;">
                {eventIcon} {eventLabel}
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="font-size:15px;color:#374151;margin:0;">
                Hello <strong>{recipientName}</strong>,
              </p>
              <p style="font-size:14px;color:#6b7280;margin:8px 0 0;">
                The following key transaction has been recorded.
              </p>
            </td>
          </tr>

          <!-- Status badge -->
          <tr>
            <td style="padding:16px 32px 0;">
              <span style="display:inline-block;padding:5px 14px;border-radius:999px;
                            background:{statusColor}22;color:{statusColor};
                            font-size:12px;font-weight:700;letter-spacing:0.5px;">
                ● {statusLabel}
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
                      {facultyName}
                    </p>
                  </td>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Faculty ID</p>
                    <p style="font-size:15px;color:#1e293b;font-weight:600;margin:0;">
                      {facultyId}
                    </p>
                  </td>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Department</p>
                    <p style="font-size:15px;color:#1e293b;font-weight:600;margin:0;">
                      {department}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Processed By</p>
                    <p style="font-size:14px;color:#1e293b;font-weight:600;margin:0;">
                      {processedBy}
                    </p>
                    <p style="font-size:12px;color:#64748b;margin:2px 0 0;">{processedByRole}</p>
                  </td>
                  <td colspan="2" style="padding:14px 18px;">
                    <p style="font-size:11px;color:#94a3b8;margin:0 0 2px;
                               text-transform:uppercase;letter-spacing:0.5px;">Date &amp; Time</p>
                    <p style="font-size:14px;color:#1e293b;font-weight:600;margin:0;">{dateTime}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Keys issued/returned -->
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="font-size:13px;color:#64748b;font-weight:700;margin:0 0 10px;
                         text-transform:uppercase;letter-spacing:0.5px;">
                Keys ({totalKeys})
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <tr style="background:#f1f5f9;">
                  <th style="padding:10px 14px;text-align:left;font-size:11px;
                              color:#64748b;text-transform:uppercase;letter-spacing:0.5px;
                              font-weight:600;border-bottom:1px solid #e2e8f0;">Key No.</th>
                  <th style="padding:10px 14px;text-align:left;font-size:11px;
                              color:#64748b;text-transform:uppercase;letter-spacing:0.5px;
                              font-weight:600;border-bottom:1px solid #e2e8f0;">Key Name</th>
                  <th style="padding:10px 14px;text-align:left;font-size:11px;
                              color:#64748b;text-transform:uppercase;letter-spacing:0.5px;
                              font-weight:600;border-bottom:1px solid #e2e8f0;">Location</th>
                </tr>
                {keyRowsHtml}
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
                © {currentYear} VNR VJIET Key Management · All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
