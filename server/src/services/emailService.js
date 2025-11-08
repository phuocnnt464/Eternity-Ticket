// server/src/services/emailService.js
const nodemailer = require('nodemailer');
const pool = require('../config/database');

class EmailService {
  constructor() {
    // ✅ Validate email configuration
    this.isConfigured = false;
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('WARNING: EMAIL SERVICE NOT CONFIGURED');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('EMAIL_USER or EMAIL_PASSWORD not set in .env');
      console.error('Email functionality will be DISABLED');
      console.error('Please configure email settings to enable:');
      console.error('   - Email verification');
      console.error('   - Password reset');
      console.error('   - Order confirmations');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.transporter = null;
      return;
    }

    try{
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      this.isConfigured = true;
      console.log('Email transporter configured successfully');

    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  /**
   * Get email template from database
   * @param {String} templateName - Template name
   * @returns {Object} Template data
   */
  async getTemplate(templateName) {
    try {
      const result = await pool.query(`
        SELECT html_content, text_content, subject, variables
        FROM email_templates
        WHERE name = $1 AND is_active = true
      `, [templateName]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Get template error:', error);
      return null;
    }
  }

  /**
   * Replace template variables
   * @param {String} template - Template string
   * @param {Object} variables - Variables to replace
   * @returns {String} Processed template
   */
  replaceVariables(template, variables) {
    let result = template;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, variables[key]);
    });
    return result;
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @returns {Boolean} Success status
   */
  async sendEmail(options) {
    if (!this.isConfigured || !this.transporter) {
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.warn('Email service not configured');
      console.warn('Skipping email to:', options.to);
      console.warn('Subject:', options.subject);
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return false;
    }
    
    try {
      const { to, subject, html, text, attachments } = options;

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Eternity Ticket'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
         // Reply-To để user reply đến email khác
        replyTo: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
        to,
        subject,
        html,
        text,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent: ${info.messageId} to ${to}`);
      console.log(`   From: ${mailOptions.from}`);
      console.log(`   Reply-To: ${mailOptions.replyTo}`);
      return true;
    } catch (error) {
      console.error('Send email error:', error);
      return false;
    }
  }

  /**
   * Send verification email
   * @param {String} email - User email
   * @param {String} token - Verification token
   * @param {String} userName - User name
   */
  async sendVerificationEmail(email, token, userName) {
    const template = await this.getTemplate('email_verification');
    
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const variables = {
      user_name: userName,
      verification_link: verificationUrl,
      current_year: new Date().getFullYear()
    };

    const html = template 
      ? this.replaceVariables(template.html_content, variables)
      : `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background: #ffffff; padding: 30px; }
            .button { 
              display: inline-block; 
              background: #4F46E5; 
              color: white !important; 
              padding: 14px 28px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${userName}</strong>,</p>
              <p>Thank you for registering with Eternity Ticket! Please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${verificationUrl}" style="color: #4F46E5; word-break: break-all;">${verificationUrl}</a>
              </p>
              
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                This link will expire in 24 hours. If you didn't request this, please ignore this email.
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Eternity Ticket. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    return await this.sendEmail({
      to: email,
      subject: template?.subject || 'Verify Your Email - Eternity Ticket',
      html,
      text: `Verify your email: ${verificationUrl}`
    });
  }

  /**
   * Send password reset email
   * @param {String} email - User email
   * @param {String} token - Reset token
   * @param {String} userName - User name
   */
  async sendPasswordResetEmail(email, token, userName) {
    const template = await this.getTemplate('password_reset');
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const variables = {
      user_name: userName,
      reset_link: resetUrl,
      current_year: new Date().getFullYear()
    };

    const html = template 
      ? this.replaceVariables(template.html_content, variables)
      : `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
            .content { background: #ffffff; padding: 30px; }
            .button { 
              display: inline-block; 
              background: #DC2626; 
              color: white !important; 
              padding: 14px 28px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Reset Your Password</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${userName}</strong>,</p>
              <p>We received a request to reset your password. Click the button below to set a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">
                  Reset Password
                </a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong> This link will expire in 1 hour.
              </div>
              
              <p style="color: #666; font-size: 14px;">
                If the button doesn't work, copy and paste this link:<br>
                <a href="${resetUrl}" style="color: #DC2626; word-break: break-all;">${resetUrl}</a>
              </p>
              
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                If you didn't request this password reset, please ignore this email or contact support if you're concerned.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

    return await this.sendEmail({
      to: email,
      subject: template?.subject || 'Reset Your Password - Eternity Ticket',
      html,
      text: `Reset your password: ${resetUrl}`
    });
  }

  /**
   * Send order confirmation email with tickets
   * @param {Object} orderData - Order data
   */
  async sendOrderConfirmationEmail(orderData) {
    const template = await this.getTemplate('order_confirmation');
    
    const { 
      user_email, 
      user_name, 
      order_number, 
      event_title, 
      total_amount,
      tickets 
    } = orderData;

    const variables = {
      user_name,
      order_number,
      event_title,
      total_amount,
      order_url: `${process.env.FRONTEND_URL}/orders/${orderData.order_id}`,
      current_year: new Date().getFullYear()
    };

    // Build tickets HTML
    let ticketsHTML = tickets.map(ticket => `
      <div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd;">
        <strong>${ticket.ticket_type_name}</strong><br>
        Ticket Code: ${ticket.ticket_code}<br>
        Holder: ${ticket.holder_name}
      </div>
    `).join('');

    const html = template 
      ? this.replaceVariables(template.html_content, variables) + ticketsHTML
      : `
        <h1>Order Confirmation</h1>
        <p>Hello ${user_name},</p>
        <p>Your order ${order_number} has been confirmed!</p>
        <h3>Order Details:</h3>
        <p>Event: ${event_title}</p>
        <p>Total: ${total_amount} VND</p>
        <h3>Tickets:</h3>
        ${ticketsHTML}
      `;

    return await this.sendEmail({
      to: user_email,
      subject: template?.subject || `Order Confirmation - ${order_number}`,
      html
    });
  }

  /**
   * Send event approval email
   * @param {Object} eventData - Event data
   */
  async sendEventApproved(eventData) {
    const { organizer_email, organizer_name, event_title, event_id } = eventData;

    const dashboardUrl = `${process.env.FRONTEND_URL}/events/${event_id}/dashboard`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { background: #ffffff; padding: 30px; }
          .button { 
            display: inline-block; 
            background: #10B981; 
            color: white !important; 
            padding: 14px 28px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Event Approved!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${organizer_name}</strong>,</p>
            <p>Great news! Your event "<strong>${event_title}</strong>" has been approved and is now live!</p>
            
            <p>You can now:</p>
            <ul>
              <li>Manage event sessions and tickets</li>
              <li>View real-time statistics</li>
              <li>Start selling tickets immediately</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">
                Go to Event Dashboard
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Dashboard link: <a href="${dashboardUrl}" style="color: #10B981;">${dashboardUrl}</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: organizer_email,
      subject: `Event Approved - ${event_title}`,
      html
    });
  }

  /**
   * Send event rejection email
   * @param {Object} eventData - Event data with rejection reason
   */
  async sendEventRejected(eventData) {
    const { organizer_email, organizer_name, event_title, rejection_reason } = eventData;
    
    const html = `
      <h1>Event Review Update</h1>
      <p>Hello ${organizer_name},</p>
      <p>Unfortunately, your event "<strong>${event_title}</strong>" was not approved.</p>
      <h3>Reason:</h3>
      <p>${rejection_reason}</p>
      <p>Please review our guidelines and submit a new event.</p>
    `;

    return await this.sendEmail({
      to: organizer_email,
      subject: `Event Not Approved - ${event_title}`,
      html
    });
  }

  /**
   * Send refund approval email
   * @param {Object} refundData - Refund data
   */
  async sendRefundApprovalEmail(refundData) {
    const { user_email, first_name, event_title, refund_amount, order_number } = refundData;
    
    const html = `
      <h1>Refund Request Approved</h1>
      <p>Hello ${first_name},</p>
      <p>Your refund request for "<strong>${event_title}</strong>" has been approved.</p>
      <p>Order Number: ${order_number}</p>
      <p>Refund Amount: ${refund_amount} VND</p>
      <p>Processing time: 5-7 business days.</p>
    `;

    return await this.sendEmail({
      to: user_email,
      subject: `Refund Approved - ${order_number}`,
      html
    });
  }

  /**
   * Send refund rejection email
   * @param {Object} refundData - Refund data
   * @param {String} reason - Rejection reason
   */
  async sendRefundRejectionEmail(refundData, reason) {
    const { user_email, first_name, event_title, order_number } = refundData;
    
    const html = `
      <h1>Refund Request Rejected</h1>
      <p>Hello ${first_name},</p>
      <p>Unfortunately, your refund request for "<strong>${event_title}</strong>" has been rejected.</p>
      <p>Order Number: ${order_number}</p>
      <h3>Reason:</h3>
      <p>${reason}</p>
      <p>If you have questions, please contact support.</p>
    `;

    return await this.sendEmail({
      to: user_email,
      subject: `Refund Request Rejected - ${order_number}`,
      html
    });
  }

  /**
   * Send membership activation email
   */
  async sendMembershipActivationEmail(user, membership) {
    const subject = `🎉 Welcome to ${membership.tier.toUpperCase()} Membership!`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Membership Activated!</h2>
        
        <p>Hi ${user.first_name},</p>
        
        <p>Your <strong>${membership.tier.toUpperCase()}</strong> membership has been successfully activated!</p>
        
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Membership Details:</h3>
          <p><strong>Tier:</strong> ${membership.tier.toUpperCase()}</p>
          <p><strong>Start Date:</strong> ${new Date(membership.start_date).toLocaleDateString()}</p>
          <p><strong>End Date:</strong> ${new Date(membership.end_date).toLocaleDateString()}</p>
          <p><strong>Billing Period:</strong> ${membership.billing_period}</p>
        </div>
        
        <h3>Your Benefits:</h3>
        <ul>
          ${membership.features ? JSON.parse(membership.features).map(f => `<li>${f}</li>`).join('') : ''}
        </ul>
        
        <p>Start enjoying your exclusive benefits now!</p>
        
        <a href="${process.env.FRONTEND_URL}/membership" 
          style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin: 20px 0;">
          View Membership
        </a>
        
        <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
          Questions? Contact us at ${process.env.SUPPORT_EMAIL}
        </p>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject,
      html
    });
  }

  /**
   * Send membership expiry reminder
   */
  async sendMembershipExpiryReminder(user, membership, daysLeft) {
    const subject = `⏰ Your ${membership.tier.toUpperCase()} Membership Expires in ${daysLeft} Days`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F59E0B;">Membership Expiring Soon</h2>
        
        <p>Hi ${user.first_name},</p>
        
        <p>Your <strong>${membership.tier.toUpperCase()}</strong> membership will expire in <strong>${daysLeft} days</strong>.</p>
        
        <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Expiry Date:</strong> ${new Date(membership.end_date).toLocaleDateString()}</p>
        </div>
        
        <p>Renew now to continue enjoying your exclusive benefits!</p>
        
        <a href="${process.env.FRONTEND_URL}/membership/renew" 
          style="display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Renew Membership
        </a>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject,
      html
    });
  }
  
  /**
   * Send event team invitation
   */
  async sendEventInvitation(data) {
    const { email, event_title, inviter_name, role, invitation_token } = data;
    
    const invitationUrl = `${process.env.FRONTEND_URL}/invitations/${invitation_token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; }
          .content { background: #ffffff; padding: 30px; }
          .button { 
            display: inline-block; 
            background: #8B5CF6; 
            color: white !important; 
            padding: 14px 28px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
            font-weight: bold;
          }
          .info-box { background: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Event Team Invitation</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p><strong>${inviter_name}</strong> has invited you to join the team for the event:</p>
            
            <div class="info-box">
              <strong>Event:</strong> ${event_title}<br>
              <strong>Role:</strong> ${role.replace('_', ' ').toUpperCase()}
            </div>
            
            <p>To accept this invitation, you'll need to register/login and click the link below:</p>
            
            <div style="text-align: center;">
              <a href="${invitationUrl}" class="button">
                Accept Invitation
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Invitation link: <a href="${invitationUrl}" style="color: #8B5CF6;">${invitationUrl}</a>
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              This invitation will expire in 7 days.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject: `Invitation to join ${event_title} - Eternity Ticket`,
      html
    });
  }
  /**
   * Send admin/sub-admin account created email
   */
  async sendAdminAccountCreated(data) {
    const { email, first_name, last_name, role, temporary_password } = data;
    
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    const roleLabel = role === 'sub_admin' ? 'Sub-Administrator' : 'Administrator';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #7C3AED; color: white; padding: 20px; text-align: center; }
          .content { background: #ffffff; padding: 30px; }
          .button { 
            display: inline-block; 
            background: #7C3AED; 
            color: white !important; 
            padding: 14px 28px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
            font-weight: bold;
          }
          .credentials { 
            background: #F3F4F6; 
            padding: 15px; 
            border-radius: 6px; 
            margin: 20px 0;
            border-left: 4px solid #7C3AED;
          }
          .warning {
            background: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 15px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 ${roleLabel} Account Created</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${first_name} ${last_name}</strong>,</p>
            <p>An ${roleLabel.toLowerCase()} account has been created for you on Eternity Ticket.</p>
            
            <div class="credentials">
              <h3 style="margin-top: 0;">Your Login Credentials:</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Role:</strong> ${roleLabel}</p>
              <p><strong>Temporary Password:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 4px;">${temporary_password}</code></p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong>
              <ul style="margin: 10px 0;">
                <li>Please change your password immediately after your first login</li>
                <li>Do not share this email or your credentials with anyone</li>
                <li>Enable two-factor authentication if available</li>
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">
                Login to Admin Panel
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Login URL: <a href="${loginUrl}" style="color: #7C3AED;">${loginUrl}</a>
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              If you did not expect this email, please contact the system administrator immediately.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject: `${roleLabel} Account Created - Eternity Ticket`,
      html
    });
  }
}

// Export singleton instance
module.exports = new EmailService();