import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path: string;
    contentType?: string;
  }>;
}

export class EmailService {
  private static transporter: nodemailer.Transporter;

  static {
    // Initialize transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send an email
   */
  static async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || "noreply@mas3ndi.com",
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      console.error("Failed to send email:", error);
      // Don't throw error to prevent registration from failing due to email issues
      // In production, you might want to queue failed emails for retry
    }
  }

  /**
   * Send verification email
   */
  static async sendVerificationEmail(
    email: string,
    name: string,
    verificationToken: string
  ): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Mas3ndi!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering with Mas3ndi. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #2E507C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This verification link will expire in 24 hours.</p>
        <p>If you didn't create an account with Mas3ndi, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This email was sent by Mas3ndi. If you have any questions, please contact our support team.
        </p>
      </div>
    `;

    const text = `
      Welcome to Mas3ndi!
      
      Hello ${name},
      
      Thank you for registering with Mas3ndi. Please verify your email address by visiting:
      ${verificationUrl}
      
      This verification link will expire in 24 hours.
      
      If you didn't create an account with Mas3ndi, please ignore this email.
    `;

    await this.sendEmail({
      to: email,
      subject: "Verify your Mas3ndi account",
      html,
      text,
    });
  }

  /**
   * Send rejection email
   */
  static async sendRejectionEmail(
    email: string,
    name: string,
    reason?: string
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Application Update</h2>
        <p>Hello ${name},</p>
        <p>Thank you for your interest in Mas3ndi. Unfortunately, we are unable to approve your application at this time.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
        <p>You are welcome to reapply in the future. If you have any questions, please contact our support team.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This email was sent by Mas3ndi. If you have any questions, please contact our support team.
        </p>
      </div>
    `;

    const text = `
      Application Update
      
      Hello ${name},
      
      Thank you for your interest in Mas3ndi. Unfortunately, we are unable to approve your application at this time.
      
      ${reason ? `Reason: ${reason}` : ""}
      
      You are welcome to reapply in the future. If you have any questions, please contact our support team.
    `;

    await this.sendEmail({
      to: email,
      subject: "Mas3ndi Application Update",
      html,
      text,
    });
  }

  /**
   * Send sender ID approval notification to Mas3ndi representatives
   */
  static async sendSenderIdApprovalNotification({
    clientName,
    clientEmail,
    companyName,
    senderId,
    purpose,
    sampleMessage,
    consentFormPath,
    consentFormOriginalName,
    consentFormMimeType,
  }: {
    clientName: string;
    clientEmail: string;
    companyName?: string;
    senderId: string;
    purpose?: string;
    sampleMessage?: string;
    consentFormPath: string;
    consentFormOriginalName: string;
    consentFormMimeType: string;
  }): Promise<void> {
    const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS?.split(",") || [
      "admin@mas3ndi.com",
    ];

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2E507C;">New Sender ID Approval Request</h2>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Client Information</h3>
          <p><strong>Name:</strong> ${clientName}</p>
          <p><strong>Email:</strong> ${clientEmail}</p>
          ${
            companyName ? `<p><strong>Company:</strong> ${companyName}</p>` : ""
          }
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Sender ID Details</h3>
          <p><strong>Requested Sender ID:</strong> ${senderId}</p>
          ${purpose ? `<p><strong>Purpose:</strong> ${purpose}</p>` : ""}
          ${
            sampleMessage
              ? `<p><strong>Sample Message:</strong> ${sampleMessage}</p>`
              : ""
          }
        </div>

        <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Consent Form</h3>
          <p><strong>File Name:</strong> ${consentFormOriginalName}</p>
          <p><strong>File Type:</strong> ${consentFormMimeType}</p>
          <p style="color: #666; font-size: 14px;">
            The consent form has been attached to this email for review.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/admin/sender-ids"
             style="background-color: #2E507C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review in Admin Panel
          </a>
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This is an automated notification from the Mas3ndi platform. Please review the sender ID request and approve or reject it through the admin panel.
        </p>
      </div>
    `;

    const text = `
      New Sender ID Approval Request

      Client Information:
      - Name: ${clientName}
      - Email: ${clientEmail}
      ${companyName ? `- Company: ${companyName}` : ""}

      Sender ID Details:
      - Requested Sender ID: ${senderId}
      ${purpose ? `- Purpose: ${purpose}` : ""}
      ${sampleMessage ? `- Sample Message: ${sampleMessage}` : ""}

      Consent Form: ${consentFormOriginalName} (${consentFormMimeType})

      Please review this request in the admin panel: ${
        process.env.FRONTEND_URL
      }/admin/sender-ids
    `;

    // Send to all admin emails
    for (const adminEmail of adminEmails) {
      try {
        await this.sendEmail({
          to: adminEmail.trim(),
          subject: `New Sender ID Request: ${senderId} - ${clientName}`,
          html,
          text,
          attachments: [
            {
              filename: consentFormOriginalName,
              path: consentFormPath,
              contentType: consentFormMimeType,
            },
          ],
        });
      } catch (error) {
        console.error(`Failed to send notification to ${adminEmail}:`, error);
      }
    }
  }
}
