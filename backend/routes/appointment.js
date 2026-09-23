const express = require('express');
const router = express.Router();
const { notificationLimiter } = require('../middleware/rateLimit');
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Farm = require('../models/Farm');
const User = require('../models/User');
const CollectionRoute = require('../models/CollectionRoute');
const { protect, farmerOnly, governmentOnly } = require('../middleware/auth');
const { sendNotification } = require('../config/notifications');
const positiveNumber = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const conflict = res => res.status(409).json({ message: 'Appointment changed or this action is not allowed in its current state. Reload and try again.' });


// @route   POST /api/appointments
// @desc    Book a new appointment for straw selling
// @access  Private (Farmers only)
router.post('/', protect, farmerOnly, notificationLimiter, [
  body('farm').notEmpty().withMessage('Farm is required'),
  body('strawDetails.cropType').notEmpty().withMessage('Crop type is required'),
  body('strawDetails.quantity').isFloat({ min: 1 }).withMessage('Quantity must be greater than 0'),
  body('strawDetails.quantityUnit').isIn(['kg', 'quintal', 'ton']).withMessage('Invalid quantity unit'),
  body('preferredDate').isISO8601().withMessage('Invalid date format'),
  body('preferredTimeSlot').isIn(['morning', 'afternoon', 'evening']).withMessage('Invalid time slot')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify farm belongs to user
    const farm = await Farm.findOne({ _id: req.body.farm, farmer: req.user._id, isActive: true });
    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    // Check if user has bank details
    const user = await User.findById(req.user._id);
    if (!user.bankDetails || !user.bankDetails.accountNumber) {
      return res.status(400).json({
        message: 'Please add bank details before booking appointment',
        redirectTo: '/dashboard/bank-details'
      });
    }

    // Calculate estimated price (example: Rs 200 per quintal)
    const pricePerQuintal = 200;
    let estimatedPrice = req.body.strawDetails.quantity * pricePerQuintal;
    if (req.body.strawDetails.quantityUnit === 'kg') {
      estimatedPrice = (req.body.strawDetails.quantity / 100) * pricePerQuintal;
    } else if (req.body.strawDetails.quantityUnit === 'ton') {
      estimatedPrice = (req.body.strawDetails.quantity * 10) * pricePerQuintal;
    }

    const appointment = await Appointment.create({
      farmer: req.user._id,
      farm: req.body.farm,
      appointmentType: 'straw_selling',
      strawDetails: {
        cropType: req.body.strawDetails.cropType,
        quantity: req.body.strawDetails.quantity,
        quantityUnit: req.body.strawDetails.quantityUnit,
        estimatedPrice
      },
      preferredDate: req.body.preferredDate,
      preferredTimeSlot: req.body.preferredTimeSlot,
      remarks: req.body.remarks,
      notifications: [{
        type: 'new_booking',
        message: `New straw selling appointment from ${user.name} in ${farm.location.district}, ${farm.location.state}`
      }]
    });

    // Send notification to farmer
    try {
      await sendNotification('appointmentCreated', {
        farmerName: user.name,
        email: user.email,
        phone: user.phone,
        appointmentId: appointment._id.toString().slice(-8).toUpperCase(),
        farmName: farm.farmName,
        date: new Date(req.body.preferredDate).toLocaleDateString('en-IN'),
        quantity: req.body.strawDetails.quantity,
        unit: req.body.strawDetails.quantityUnit,
        strawType: req.body.strawDetails.cropType
      });
    } catch (notifError) {
      console.error('Notification error:', notifError.message);
    }

    res.status(201).json(appointment);
  } catch (error) {
    if (error.name === 'VersionError') return conflict(res);
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid appointment data' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/appointments
// @desc    Get all appointments for logged in farmer
// @access  Private (Farmers only)
router.get('/', protect, farmerOnly, async (req, res) => {
  try {
    const appointments = await Appointment.find({ farmer: req.user._id })
      .populate('farm', 'farmName location')
      .sort({ createdAt: -1 });
    res.json(appointments);
  } catch (error) {
    if (error.name === 'VersionError') return conflict(res);
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid appointment data' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== GOVERNMENT ROUTES ====================
// NOTE: These routes MUST come BEFORE the /:id route to avoid conflicts

// @route   GET /api/appointments/government/all
// @desc    Get all appointments (for government officers)
// @access  Private (Government only)
router.get('/government/all', protect, governmentOnly, async (req, res) => {
  try {
    const { status, state, district, date } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('farm', 'farmName location totalArea areaUnit')
      .populate('farmer', 'name phone email')
      .sort({ createdAt: -1 });

    // Filter by state if provided
    let filteredAppointments = appointments;
    if (state) {
      filteredAppointments = filteredAppointments.filter(
        apt => apt.farm && apt.farm.location && apt.farm.location.state === state
      );
    }
    if (district) {
      filteredAppointments = filteredAppointments.filter(
        apt => apt.farm && apt.farm.location && apt.farm.location.district === district
      );
    }

    res.json(filteredAppointments);
  } catch (error) {
    if (error.name === 'VersionError') return conflict(res);
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid appointment data' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/appointments/government/notifications
// @desc    Get new/unread appointment notifications
// @access  Private (Government only)
router.get('/government/notifications', protect, governmentOnly, async (req, res) => {
  try {
    const unreadAppointments = await Appointment.find({ isRead: false })
      .populate('farm', 'farmName location')
      .populate('farmer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(50);

    const count = await Appointment.countDocuments({ isRead: false });

    res.json({
      count,
      appointments: unreadAppointments
    });
  } catch (error) {
    if (error.name === 'VersionError') return conflict(res);
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid appointment data' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/appointments/government/mark-read
// @desc    Mark appointments as read
// @access  Private (Government only)
router.put('/government/mark-read', protect, governmentOnly, async (req, res) => {
  try {
    const { appointmentIds } = req.body;

    if (appointmentIds && appointmentIds.length > 0) {
      await Appointment.updateMany(
        { _id: { $in: appointmentIds } },
        { isRead: true }
      );
    } else {
      await Appointment.updateMany(
        { isRead: false },
        { isRead: true }
      );
    }

    res.json({ message: 'Marked as read' });
  } catch (error) {
    if (error.name === 'VersionError') return conflict(res);
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid appointment data' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/appointments/government/stats
// @desc    Get appointment statistics
// @access  Private (Government only)
router.get('/government/stats', protect, governmentOnly, async (req, res) => {
  try {
    const stats = await Appointment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalQuantity: { $sum: { $multiply: ['$strawDetails.quantity', { $switch: {
            branches: [
              { case: { $eq: ['$strawDetails.quantityUnit', 'kg'] }, then: 0.01 },
              { case: { $eq: ['$strawDetails.quantityUnit', 'ton'] }, then: 10 }
            ], default: 1
          } }] } },
          totalAmount: { $sum: '$strawDetails.estimatedPrice' }
        }
      }
    ]);

    const totalAppointments = await Appointment.countDocuments();
    const pendingCount = await Appointment.countDocuments({ status: 'pending' });
    const todayAppointments = await Appointment.countDocuments({
      preferredDate: {
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(23, 59, 59, 999)
      }
    });

    // Get state-wise distribution
    const stateWise = await Appointment.aggregate([
      {
        $lookup: {
          from: 'farms',
          localField: 'farm',
          foreignField: '_id',
          as: 'farmData'
        }
      },
      { $unwind: '$farmData' },
      {
        $group: {
          _id: '$farmData.location.state',
          count: { $sum: 1 },
          totalQuantity: { $sum: { $multiply: ['$strawDetails.quantity', { $switch: {
            branches: [
              { case: { $eq: ['$strawDetails.quantityUnit', 'kg'] }, then: 0.01 },
              { case: { $eq: ['$strawDetails.quantityUnit', 'ton'] }, then: 10 }
            ], default: 1
          } }] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      stats,
      totalAppointments,
      pendingCount,
      todayAppointments,
      stateWise
    });
  } catch (error) {
    if (error.name === 'VersionError') return conflict(res);
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid appointment data' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/appointments/government/:id/verify
// @desc    Verify farmer and appointment details
// @access  Private (Government only)
router.put('/government/:id/verify', protect, governmentOnly, async (req, res) => {
  try {
    const { verificationNotes } = req.body;

    const appointment = await Appointment.findById(req.params.id)
      .populate('farmer', 'name idType idNumber')
      .populate('farm', 'farmName location');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (!['pending', 'approved'].includes(appointment.status)) return conflict(res);

    appointment.verification = {
      isVerified: true,
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      verificationNotes: verificationNotes || 'Verified'
    };
    appointment.status = 'verified';
    appointment.assignedOfficer = req.user._id;

    await appointment.save();

    res.json({
      message: 'Appointment verified successfully',
      appointment
    });
  } catch (error) {
    if (error.name === 'VersionError') return conflict(res);
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid appointment data' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/appointments/government/:id/dispatch-truck
// @desc    Dispatch truck for collection
// @access  Private (Government only)
router.put('/government/:id/dispatch-truck', protect, governmentOnly, notificationLimiter, async (req, res) => {
  try {
    const { truckId, vehicleNumber, driverName, driverPhone, estimatedArrival } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status !== 'verified') return conflict(res);
    if (!appointment.verification?.isVerified) {
      return res.status(400).json({ message: 'Appointment must be verified first' });
    }

    appointment.truckDetails = {
      truckId,
      vehicleNumber,
      driverName,
      driverPhone,
      dispatchTime: new Date(),
      estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : null
    };
    appointment.status = 'truck_dispatched';

    appointment.notifications.push({
      type: 'truck_dispatched',
      message: `Truck ${vehicleNumber} dispatched. Driver: ${driverName}, Contact: ${driverPhone}`
    });

    await appointment.save();

    // Send notification to farmer
    const farmer = await User.findById(appointment.farmer);
    const farm = await Farm.findById(appointment.farm);
    try {
      await sendNotification('truckDispatched', {
        farmerName: farmer.name,
        email: farmer.email,
        phone: farmer.phone,
        vehicleNumber,
        driverName,
        driverPhone,
        expectedTime: estimatedArrival
          ? new Date(estimatedArrival).toLocaleString('en-IN')
          : 'Within a few hours'
      });
    } catch (notifError) {
      console.error('Notification error:', notifError.message);
    }

    res.json({
      message: 'Truck dispatched successfully',
      appointment
    });
  } catch (error) {
    if (error.name === 'VersionError') return conflict(res);
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid appointment data' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/appointments/government/:id/collect
// @desc    Mark straw as collected
// @access  Private (Government only)
router.put('/government/:id/collect', protect, governmentOnly, notificationLimiter, async (req, res) => {
  try {
    const { actualQuantity, qualityGrade, weighbridgeReading, collectedBy } = req.body;
    if (!positiveNumber(actualQuantity) || !['A', 'B', 'C'].includes(qualityGrade) ||
        (weighbridgeReading !== undefined && !positiveNumber(weighbridgeReading))) {
      return res.status(400).json({ message: 'Quantity and supplied weighbridge reading must be positive numbers; select grade A, B or C' });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status !== 'truck_dispatched' || !appointment.verification?.isVerified) return conflict(res);

    // Calculate final payment based on actual quantity and quality
    const pricePerQuintal = qualityGrade === 'A' ? 220 : qualityGrade === 'B' ? 200 : 180;
    let finalQuantityInQuintals = actualQuantity;
    if (appointment.strawDetails.quantityUnit === 'kg') {
      finalQuantityInQuintals = actualQuantity / 100;
    } else if (appointment.strawDetails.quantityUnit === 'ton') {
      finalQuantityInQuintals = actualQuantity * 10;
    }
    const finalPayment = Math.round(finalQuantityInQuintals * pricePerQuintal * 100) / 100;
    if (!positiveNumber(finalPayment) || finalPayment > Number.MAX_SAFE_INTEGER / 100) {
      return res.status(400).json({ message: 'Calculated payment is outside the supported range' });
    }

    appointment.strawDetails.actualQuantity = actualQuantity;
    appointment.strawDetails.qualityGrade = qualityGrade;
    appointment.collectionDetails = {
      collectedAt: new Date(),
      collectedBy: collectedBy || 'Field Officer',
      weighbridgeReading
    };
    appointment.truckDetails.actualArrival = new Date();
    appointment.status = 'collected';
    appointment.paymentAmount = finalPayment;

    appointment.notifications.push({
      type: 'collected',
      message: `Straw collected. Quantity: ${actualQuantity} ${appointment.strawDetails.quantityUnit}, Grade: ${qualityGrade}, Amount: Rs ${finalPayment}`
    });

    await appointment.save();

    // Send notification to farmer
    const farmer = await User.findById(appointment.farmer);
    try {
      await sendNotification('collectionCompleted', {
        farmerName: farmer.name,
        email: farmer.email,
        phone: farmer.phone,
        quantity: actualQuantity,
        unit: appointment.strawDetails.quantityUnit,
        quality: qualityGrade,
        date: new Date().toLocaleDateString('en-IN')
      });
    } catch (notifError) {
      console.error('Notification error:', notifError.message);
    }

    res.json({
      message: 'Collection recorded successfully',
      appointment,
      finalPayment
    });
  } catch (error) {
    if (error.name === 'VersionError') return conflict(res);
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid appointment data' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/appointments/government/:id/status
// @desc    Update appointment status (for government officers)
// @access  Private (Government only)
router.put('/government/:id/status', protect, governmentOnly, async (req, res) => {
  try {
    const { status, remarks, paymentAmount } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const allowed = {
      pending: ['approved', 'rejected'],
      approved: ['rejected'],
      verified: ['rejected']
    };
    if (!allowed[appointment.status]?.includes(status)) return conflict(res);
    if (paymentAmount !== undefined && !positiveNumber(paymentAmount)) {
      return res.status(400).json({ message: 'Payment amount must be a positive number' });
    }
    appointment.status = status;
    if (typeof remarks === 'string') appointment.remarks = remarks;
    appointment.assignedOfficer = req.user._id;
    appointment.isRead = true;
    if (status === 'approved') {
      appointment.paymentAmount = paymentAmount ?? appointment.strawDetails.estimatedPrice;
    }

    appointment.notifications.push({
      type: 'status_update',
      message: `Status updated to ${status}${remarks ? ': ' + remarks : ''}`
    });

    await appointment.save();

    res.json(appointment);
  } catch (error) {
    if (error.name === 'VersionError') return conflict(res);
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid appointment data' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/appointments/government/:id/payment
// @desc    Mark payment as completed
// @access  Private (Government only)
router.put('/government/:id/payment', protect, governmentOnly, notificationLimiter, async (req, res) => {
  try {
    const { transactionId, paymentAmount } = req.body;
    if (typeof transactionId !== 'string' || !transactionId.trim() || transactionId.length > 200 ||
        (paymentAmount !== undefined && !positiveNumber(paymentAmount))) {
      return res.status(400).json({ message: 'A transaction reference and a positive payment amount are required' });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status !== 'collected' || appointment.paymentStatus === 'completed') return conflict(res);
    if (!positiveNumber(appointment.paymentAmount) ||
        (paymentAmount !== undefined && Math.abs(paymentAmount - appointment.paymentAmount) > 0.001)) {
      return res.status(400).json({ message: 'Payment must match the amount calculated at collection' });
    }

    appointment.paymentStatus = 'completed';
    appointment.paymentDate = new Date();
    appointment.transactionId = transactionId.trim();
    appointment.status = 'completed';

    appointment.notifications.push({
      type: 'payment_completed',
      message: `Payment of Rs ${appointment.paymentAmount} completed. Transaction ID: ${transactionId}`
    });

    await appointment.save();

    // Send notification to farmer
    const farmer = await User.findById(appointment.farmer);
    try {
      await sendNotification('paymentProcessed', {
        farmerName: farmer.name,
        email: farmer.email,
        phone: farmer.phone,
        amount: appointment.paymentAmount,
        transactionId: transactionId || 'N/A',
        paymentMethod: 'Bank Transfer',
        date: new Date().toLocaleDateString('en-IN')
      });
    } catch (notifError) {
      console.error('Notification error:', notifError.message);
    }

    res.json({ message: 'Payment marked as completed', appointment });
  } catch (error) {
    if (error.name === 'VersionError') return conflict(res);
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid appointment data' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/appointments/government/pending-by-location
// @desc    Get pending appointments grouped by location for route optimization
// @access  Private (Government only)
router.get('/government/pending-by-location', protect, governmentOnly, async (req, res) => {
  try {
    const { date } = req.query;
    let dateQuery = {};

    if (date) {
      const queryDate = new Date(date);
      dateQuery = {
        preferredDate: {
          $gte: new Date(queryDate.setHours(0, 0, 0, 0)),
          $lt: new Date(queryDate.setHours(23, 59, 59, 999))
        }
      };
    }

    const appointments = await Appointment.aggregate([
      {
        $match: {
          status: { $in: ['pending', 'approved', 'verified'] },
          ...dateQuery
        }
      },
      {
        $lookup: {
          from: 'farms',
          localField: 'farm',
          foreignField: '_id',
          as: 'farmData'
        }
      },
      { $unwind: '$farmData' },
      {
        $group: {
          _id: {
            state: '$farmData.location.state',
            district: '$farmData.location.district'
          },
          appointments: { $push: '$$ROOT' },
          count: { $sum: 1 },
          totalQuantity: { $sum: { $multiply: ['$strawDetails.quantity', { $switch: {
            branches: [
              { case: { $eq: ['$strawDetails.quantityUnit', 'kg'] }, then: 0.01 },
              { case: { $eq: ['$strawDetails.quantityUnit', 'ton'] }, then: 10 }
            ], default: 1
          } }] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json(appointments);
  } catch (error) {
    if (error.name === 'VersionError') return conflict(res);
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid appointment data' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== PARAMETERIZED ROUTES ====================
// NOTE: These routes MUST come AFTER all specific routes to avoid conflicts

// @route   GET /api/appointments/:id
// @desc    Get single appointment by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('farm', 'farmName location totalArea areaUnit soilType irrigationType')
      .populate('farmer', 'name phone email bankDetails idType idNumber')
      .populate('assignedOfficer', 'name phone')
      .populate('verification.verifiedBy', 'name');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is the farmer or a government officer
    if (appointment.farmer._id.toString() !== req.user._id.toString() &&
        req.user.userType !== 'government') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(appointment);
  } catch (error) {
    if (error.name === 'VersionError') return conflict(res);
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid appointment data' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/appointments/:id/cancel
// @desc    Cancel an appointment
// @access  Private (Farmers only)
router.put('/:id/cancel', protect, farmerOnly, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      farmer: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (!['pending', 'approved'].includes(appointment.status)) {
      return res.status(400).json({ message: 'Cannot cancel this appointment' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({ message: 'Appointment cancelled successfully', appointment });
  } catch (error) {
    if (error.name === 'VersionError') return conflict(res);
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid appointment data' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
