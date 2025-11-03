// server/src/services/emailService.js
const nodemailer = require('nodemailer');
const pool = require('../config/database');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
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
    try {
      const { to, subject, html, text, attachments } = options;

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Eternity Ticket'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent: ${info.messageId} to ${to}`);
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
      verification_url: verificationUrl,
      current_year: new Date().getFullYear()
    };

    const html = template 
      ? this.replaceVariables(template.html_content, variables)
      : `
        <h1>Verify Your Email</h1>
        <p>Hello ${userName},</p>
        <p>Please click the link below to verify your email:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
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
      reset_url: resetUrl,
      current_year: new Date().getFullYear()
    };

    const html = template 
      ? this.replaceVariables(template.html_content, variables)
      : `
        <h1>Reset Your Password</h1>
        <p>Hello ${userName},</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
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
    
    const html = `
      <h1>Your Event Has Been Approved!</h1>
      <p>Hello ${organizer_name},</p>
      <p>Congratulations! Your event "<strong>${event_title}</strong>" has been approved.</p>
      <p>You can now manage your event and start selling tickets.</p>
      <p><a href="${process.env.FRONTEND_URL}/events/${event_id}/dashboard">View Event Dashboard</a></p>
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
}

// Export singleton instance
module.exports = new EmailService();