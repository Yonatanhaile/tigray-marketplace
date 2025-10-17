const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send email
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@tigraymarket.com',
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Email sending error:', error);
    throw error;
  }
};

/**
 * Send order notification email
 */
const sendOrderNotification = async (userEmail, orderDetails) => {
  const subject = `New Order: ${orderDetails.listingTitle}`;
  const html = `
    <h2>Order Notification</h2>
    <p>You have a new order request.</p>
    <ul>
      <li><strong>Listing:</strong> ${orderDetails.listingTitle}</li>
      <li><strong>Price:</strong> ${orderDetails.price} ${orderDetails.currency}</li>
      <li><strong>Payment Method:</strong> ${orderDetails.paymentMethod}</li>
      <li><strong>Status:</strong> ${orderDetails.status}</li>
    </ul>
    <p>Please log in to the marketplace to view details and respond.</p>
  `;
  
  return sendEmail({
    to: userEmail,
    subject,
    html,
    text: `You have a new order request for ${orderDetails.listingTitle}`,
  });
};

/**
 * Send dispute notification to admin
 */
const sendDisputeNotification = async (adminEmail, disputeDetails) => {
  const subject = `New Dispute Filed: Order ${disputeDetails.orderId}`;
  const html = `
    <h2>Dispute Notification</h2>
    <p>A new dispute has been filed.</p>
    <ul>
      <li><strong>Order ID:</strong> ${disputeDetails.orderId}</li>
      <li><strong>Reporter:</strong> ${disputeDetails.reporterName}</li>
      <li><strong>Reason:</strong> ${disputeDetails.reason}</li>
      <li><strong>Category:</strong> ${disputeDetails.category}</li>
    </ul>
    <p>Please review and take appropriate action.</p>
  `;
  
  return sendEmail({
    to: adminEmail,
    subject,
    html,
    text: `New dispute filed for order ${disputeDetails.orderId}`,
  });
};

/**
 * Send KYC approval notification
 */
const sendKYCNotification = async (userEmail, status, notes = '') => {
  const subject = `KYC ${status === 'approved' ? 'Approved' : 'Rejected'}`;
  const html = `
    <h2>KYC ${status === 'approved' ? 'Approval' : 'Review'}</h2>
    <p>Your KYC verification has been ${status}.</p>
    ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
    ${status === 'approved' 
      ? '<p>You can now create listings as a seller.</p>'
      : '<p>Please contact support for more information.</p>'
    }
  `;
  
  return sendEmail({
    to: userEmail,
    subject,
    html,
    text: `Your KYC has been ${status}`,
  });
};

module.exports = {
  sendEmail,
  sendOrderNotification,
  sendDisputeNotification,
  sendKYCNotification,
};

