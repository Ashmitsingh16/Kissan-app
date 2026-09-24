const { createTransporter } = require('../utils/mailTransport');

// Twilio configuration
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;

// Initialize Twilio client only if credentials are provided
if (twilioAccountSid && twilioAuthToken && twilioAccountSid !== 'your_twilio_account_sid') {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(twilioAccountSid, twilioAuthToken);
  } catch (error) {
    console.log('Twilio not configured, SMS notifications disabled');
  }
}

// Email transporter
const emailTransporter = createTransporter();

// Send SMS via Twilio
async function sendSMS(phoneNumber, message) {
  if (!twilioClient) {
    return { success: false, error: 'SMS service is not configured' };
  }

  try {
    // Format Indian phone number
    let formattedNumber = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      formattedNumber = '+91' + phoneNumber.replace(/^0+/, '');
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedNumber
    });

    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS send error:', error.message);
    return { success: false, error: error.message };
  }
}

// Send email notification
async function sendEmail(to, subject, htmlContent, textContent) {
  try {
    const mailOptions = {
      from: `"Kisan App" <${process.env.SUPPORT_EMAIL}>`,
      to,
      subject,
      text: textContent || htmlContent.replace(/<[^>]*>/g, ''),
      html: htmlContent
    };

    const result = await emailTransporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
}

// Notification templates
const templates = {
  // Farmer notifications
  appointmentCreated: (data) => ({
    sms: `Kisan App: Your straw selling appointment has been booked for ${data.date}. Appointment ID: ${data.appointmentId}. We will contact you soon.`,
    email: {
      subject: 'Appointment Confirmed - Kisan App',
      html: `
        <h2>Appointment Confirmed</h2>
        <p>Dear ${data.farmerName},</p>
        <p>Your straw selling appointment has been successfully booked.</p>
        <ul>
          <li><strong>Appointment ID:</strong> ${data.appointmentId}</li>
          <li><strong>Farm:</strong> ${data.farmName}</li>
          <li><strong>Preferred Date:</strong> ${data.date}</li>
          <li><strong>Quantity:</strong> ${data.quantity} ${data.unit}</li>
          <li><strong>Straw Type:</strong> ${data.strawType}</li>
        </ul>
        <p>Our team will review your appointment and contact you shortly.</p>
        <p>Thank you for choosing Kisan App!</p>
      `
    }
  }),

  appointmentApproved: (data) => ({
    sms: `Kisan App: Good news! Your appointment (${data.appointmentId}) has been approved. Truck dispatch details will be shared soon.`,
    email: {
      subject: 'Appointment Approved - Kisan App',
      html: `
        <h2>Appointment Approved</h2>
        <p>Dear ${data.farmerName},</p>
        <p>Your straw selling appointment has been approved by our team.</p>
        <ul>
          <li><strong>Appointment ID:</strong> ${data.appointmentId}</li>
          <li><strong>Farm:</strong> ${data.farmName}</li>
        </ul>
        <p>Our collection truck will be dispatched soon. You will receive another notification with the driver details.</p>
        <p>Thank you!</p>
      `
    }
  }),

  truckDispatched: (data) => ({
    sms: `Kisan App: Truck dispatched for your straw collection! Vehicle: ${data.vehicleNumber}, Driver: ${data.driverName} (${data.driverPhone}). Expected arrival: ${data.expectedTime}`,
    email: {
      subject: 'Truck Dispatched - Kisan App',
      html: `
        <h2>Truck On The Way</h2>
        <p>Dear ${data.farmerName},</p>
        <p>A collection truck has been dispatched to your farm.</p>
        <ul>
          <li><strong>Vehicle Number:</strong> ${data.vehicleNumber}</li>
          <li><strong>Driver Name:</strong> ${data.driverName}</li>
          <li><strong>Driver Phone:</strong> <a href="tel:${data.driverPhone}">${data.driverPhone}</a></li>
          <li><strong>Expected Arrival:</strong> ${data.expectedTime}</li>
        </ul>
        <p>Please ensure the straw is ready for collection.</p>
        <p>For any issues, contact the driver directly.</p>
      `
    }
  }),

  collectionCompleted: (data) => ({
    sms: `Kisan App: Straw collection completed! Quantity: ${data.quantity} ${data.unit}, Quality: Grade ${data.quality}. Payment will be processed within 3-5 days.`,
    email: {
      subject: 'Collection Completed - Kisan App',
      html: `
        <h2>Collection Completed</h2>
        <p>Dear ${data.farmerName},</p>
        <p>Your straw has been successfully collected.</p>
        <ul>
          <li><strong>Collected Quantity:</strong> ${data.quantity} ${data.unit}</li>
          <li><strong>Quality Grade:</strong> ${data.quality}</li>
          <li><strong>Collection Date:</strong> ${data.date}</li>
        </ul>
        <p>Payment will be processed and credited to your registered bank account within 3-5 working days.</p>
        <p>Thank you for selling your straw through Kisan App!</p>
      `
    }
  }),

  paymentProcessed: (data) => ({
    sms: `Kisan App: Payment of Rs. ${data.amount} has been processed for your straw sale. Transaction ID: ${data.transactionId}. Amount will be credited to your bank account.`,
    email: {
      subject: 'Payment Processed - Kisan App',
      html: `
        <h2>Payment Processed</h2>
        <p>Dear ${data.farmerName},</p>
        <p>Your payment has been successfully processed.</p>
        <ul>
          <li><strong>Amount:</strong> Rs. ${data.amount}</li>
          <li><strong>Transaction ID:</strong> ${data.transactionId}</li>
          <li><strong>Payment Method:</strong> ${data.paymentMethod}</li>
          <li><strong>Payment Date:</strong> ${data.date}</li>
        </ul>
        <p>The amount will be credited to your registered bank account within 1-2 business days.</p>
        <p>Thank you for using Kisan App!</p>
      `
    }
  }),

  appointmentRejected: (data) => ({
    sms: `Kisan App: We're sorry, your appointment (${data.appointmentId}) could not be approved. Reason: ${data.reason}. Please contact support for assistance.`,
    email: {
      subject: 'Appointment Status Update - Kisan App',
      html: `
        <h2>Appointment Update</h2>
        <p>Dear ${data.farmerName},</p>
        <p>We regret to inform you that your appointment could not be approved at this time.</p>
        <ul>
          <li><strong>Appointment ID:</strong> ${data.appointmentId}</li>
          <li><strong>Reason:</strong> ${data.reason}</li>
        </ul>
        <p>You can book a new appointment or contact our support team for assistance.</p>
        <p>We apologize for any inconvenience.</p>
      `
    }
  }),

  // Weather alerts
  weatherAlert: (data) => ({
    sms: `Kisan App Weather Alert: ${data.alertMessage} for your farm "${data.farmName}". ${data.recommendation}`,
    email: {
      subject: `Weather Alert - ${data.farmName}`,
      html: `
        <h2>Weather Alert</h2>
        <p>Dear ${data.farmerName},</p>
        <p><strong>Alert:</strong> ${data.alertMessage}</p>
        <p><strong>Farm:</strong> ${data.farmName}</p>
        <p><strong>Current Temperature:</strong> ${data.temperature}°C</p>
        <p><strong>Recommendation:</strong> ${data.recommendation}</p>
        <p>Please take necessary precautions to protect your crops.</p>
      `
    }
  }),

  // Government notifications
  newBookingAlert: (data) => ({
    sms: `Kisan App: New booking received from ${data.district}, ${data.state}. Farmer: ${data.farmerName}, Quantity: ${data.quantity} ${data.unit}.`,
    email: {
      subject: 'New Booking Alert - Kisan App',
      html: `
        <h2>New Booking Alert</h2>
        <p>A new straw selling booking has been received.</p>
        <ul>
          <li><strong>Farmer:</strong> ${data.farmerName}</li>
          <li><strong>Phone:</strong> ${data.farmerPhone}</li>
          <li><strong>Location:</strong> ${data.district}, ${data.state}</li>
          <li><strong>Farm:</strong> ${data.farmName}</li>
          <li><strong>Quantity:</strong> ${data.quantity} ${data.unit}</li>
          <li><strong>Straw Type:</strong> ${data.strawType}</li>
          <li><strong>Preferred Date:</strong> ${data.preferredDate}</li>
        </ul>
        <p>Please review and process this booking.</p>
      `
    }
  })
};

// Send notification using template
async function sendNotification(templateName, data, channels = ['sms', 'email']) {
  const template = templates[templateName];
  if (!template) {
    console.error(`Template "${templateName}" not found`);
    return { success: false, error: 'Template not found' };
  }

  const content = template(data);
  const results = {};

  if (channels.includes('sms') && data.phone) {
    results.sms = await sendSMS(data.phone, content.sms);
  }

  if (channels.includes('email') && data.email) {
    results.email = await sendEmail(data.email, content.email.subject, content.email.html);
  }

  return results;
}

// Bulk SMS for multiple recipients
async function sendBulkSMS(recipients, message) {
  const results = [];
  for (const phone of recipients) {
    const result = await sendSMS(phone, message);
    results.push({ phone, ...result });
    // Rate limiting - wait 100ms between messages
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return results;
}

module.exports = {
  sendSMS,
  sendEmail,
  sendNotification,
  sendBulkSMS,
  templates
};
