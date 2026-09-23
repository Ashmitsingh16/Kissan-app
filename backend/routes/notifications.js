const express = require('express');
const router = express.Router();
const { notificationLimiter, notificationIpLimiter } = require('../middleware/rateLimit');
const { protect, governmentOnly } = require('../middleware/auth');
const { sendSMS, sendEmail, sendNotification, sendBulkSMS } = require('../config/notifications');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// @route   POST /api/notifications/send-sms
// @desc    Send SMS to a single recipient
// @access  Private (Government only)
router.post('/send-sms', protect, governmentOnly, notificationIpLimiter, notificationLimiter, async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ message: 'Phone number and message are required' });
    }

    const result = await sendSMS(phone, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send SMS', error: error.message });
  }
});

// @route   POST /api/notifications/send-email
// @desc    Send email to a single recipient
// @access  Private (Government only)
router.post('/send-email', protect, governmentOnly, notificationIpLimiter, notificationLimiter, async (req, res) => {
  try {
    const { to, subject, content } = req.body;

    if (!to || !subject || !content) {
      return res.status(400).json({ message: 'Recipient, subject, and content are required' });
    }

    if (typeof to !== 'string' || to.split(',').length > 20) return res.status(400).json({ message: 'Send to at most 20 recipients' });
    const result = await sendEmail(to, subject, content);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
});

// @route   POST /api/notifications/bulk-sms
// @desc    Send SMS to multiple farmers
// @access  Private (Government only)
router.post('/bulk-sms', protect, governmentOnly, notificationIpLimiter, notificationLimiter, async (req, res) => {
  try {
    const { farmerIds, message, filterByState, filterByDistrict } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    let recipients = [];

    if (farmerIds && farmerIds.length > 0) {
      // Send to specific farmers
      const farmers = await User.find({ _id: { $in: farmerIds }, userType: 'farmer' });
      recipients = farmers.map(f => f.phone).filter(Boolean);
    } else {
      // Send to farmers filtered by location
      const query = { userType: 'farmer' };

      // Get farmers from appointments with farms in specified locations
      if (filterByState || filterByDistrict) {
        const appointmentQuery = {};
        const appointments = await Appointment.find(appointmentQuery)
          .populate({
            path: 'farm',
            match: {
              ...(filterByState && { 'location.state': filterByState }),
              ...(filterByDistrict && { 'location.district': filterByDistrict })
            }
          })
          .populate('farmer', 'phone');

        recipients = [...new Set(
          appointments
            .filter(a => a.farm) // Only appointments where farm matched the filter
            .map(a => a.farmer?.phone)
            .filter(Boolean)
        )];
      } else {
        const farmers = await User.find(query);
        recipients = farmers.map(f => f.phone).filter(Boolean);
      }
    }

    if (recipients.length === 0) {
      return res.status(400).json({ message: 'No recipients found' });
    }

    if (recipients.length > 20) return res.status(400).json({ message: 'Send to at most 20 recipients per batch' });

    const results = await sendBulkSMS(recipients, message);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      total: recipients.length,
      successful,
      failed,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send bulk SMS', error: error.message });
  }
});

// @route   POST /api/notifications/appointment/:id
// @desc    Send notification for appointment status change
// @access  Private (Government only)
router.post('/appointment/:id', protect, governmentOnly, notificationIpLimiter, notificationLimiter, async (req, res) => {
  try {
    const { notificationType } = req.body;

    const appointment = await Appointment.findById(req.params.id)
      .populate('farmer', 'name email phone')
      .populate('farm', 'farmName location');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const data = {
      farmerName: appointment.farmer.name,
      email: appointment.farmer.email,
      phone: appointment.farmer.phone,
      appointmentId: appointment._id.toString().slice(-8).toUpperCase(),
      farmName: appointment.farm.farmName,
      quantity: appointment.strawDetails?.quantity,
      unit: appointment.strawDetails?.quantityUnit,
      strawType: appointment.strawDetails?.strawType,
      date: appointment.preferredDate?.toLocaleDateString('en-IN')
    };

    // Add type-specific data
    if (notificationType === 'truckDispatched' && appointment.truckDetails) {
      data.vehicleNumber = appointment.truckDetails.vehicleNumber;
      data.driverName = appointment.truckDetails.driverName;
      data.driverPhone = appointment.truckDetails.driverPhone;
      data.expectedTime = appointment.truckDetails.dispatchTime
        ? new Date(appointment.truckDetails.dispatchTime).toLocaleString('en-IN')
        : 'Soon';
    }

    if (notificationType === 'collectionCompleted' && appointment.collectionDetails) {
      data.quantity = appointment.collectionDetails.actualQuantity || data.quantity;
      data.quality = appointment.collectionDetails.qualityGrade || 'A';
    }

    if (notificationType === 'paymentProcessed' && appointment.paymentDetails) {
      data.amount = appointment.paymentDetails.amount;
      data.transactionId = appointment.paymentDetails.transactionId || 'N/A';
      data.paymentMethod = appointment.paymentDetails.paymentMethod || 'Bank Transfer';
    }

    if (notificationType === 'appointmentRejected') {
      data.reason = req.body.reason || 'Please contact support for details';
    }

    const result = await sendNotification(notificationType, data);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send notification', error: error.message });
  }
});

// @route   POST /api/notifications/weather-alert
// @desc    Send weather alert to farmer
// @access  Private (Government only)
router.post('/weather-alert', protect, governmentOnly, notificationIpLimiter, notificationLimiter, async (req, res) => {
  try {
    const { farmerId, farmName, alertMessage, recommendation, temperature } = req.body;

    const farmer = await User.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    const data = {
      farmerName: farmer.name,
      email: farmer.email,
      phone: farmer.phone,
      farmName,
      alertMessage,
      recommendation,
      temperature
    };

    const result = await sendNotification('weatherAlert', data);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send weather alert', error: error.message });
  }
});

// @route   GET /api/notifications/templates
// @desc    Get available notification templates
// @access  Private (Government only)
router.get('/templates', protect, governmentOnly, (req, res) => {
  const templateNames = [
    'appointmentCreated',
    'appointmentApproved',
    'truckDispatched',
    'collectionCompleted',
    'paymentProcessed',
    'appointmentRejected',
    'weatherAlert',
    'newBookingAlert'
  ];

  res.json({ templates: templateNames });
});

// @route   POST /api/notifications/test
// @desc    Test notification setup
// @access  Private (Government only)
router.post('/test', protect, governmentOnly, notificationIpLimiter, notificationLimiter, async (req, res) => {
  try {
    const { phone, email } = req.body;

    const results = {};

    if (phone) {
      results.sms = await sendSMS(phone, 'Kisan App: This is a test notification. Your notification system is working!');
    }

    if (email) {
      results.email = await sendEmail(
        email,
        'Test Notification - Kisan App',
        '<h2>Test Notification</h2><p>Your email notification system is working correctly!</p>'
      );
    }

    res.json({ success: true, ...results });
  } catch (error) {
    res.status(500).json({ message: 'Notification test failed', error: error.message });
  }
});

module.exports = router;
