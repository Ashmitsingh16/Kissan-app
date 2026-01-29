const express = require('express');
const router = express.Router();
const { protect, governmentOnly } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Farm = require('../models/Farm');
const User = require('../models/User');
const CollectionRoute = require('../models/CollectionRoute');

// @route   GET /api/analytics/overview
// @desc    Get overall statistics
// @access  Private (Government only)
router.get('/overview', protect, governmentOnly, async (req, res) => {
  try {
    const { startDate, endDate, state, district } = req.query;

    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get counts
    const totalFarmers = await User.countDocuments({ userType: 'farmer', ...dateFilter });
    const totalFarms = await Farm.countDocuments({ isActive: true });
    const totalAppointments = await Appointment.countDocuments(dateFilter);

    // Appointment status breakdown
    const appointmentStats = await Appointment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$strawDetails.quantity' }
        }
      }
    ]);

    // Calculate straw collection totals
    const collectedAppointments = await Appointment.find({
      status: 'collected',
      ...dateFilter
    });

    let totalStrawCollected = 0;
    let totalPaymentProcessed = 0;

    collectedAppointments.forEach(apt => {
      let qty = apt.collectionDetails?.actualQuantity || apt.strawDetails?.quantity || 0;
      const unit = apt.collectionDetails?.quantityUnit || apt.strawDetails?.quantityUnit;
      // Convert to quintals
      if (unit === 'kg') qty = qty / 100;
      if (unit === 'ton') qty = qty * 10;
      totalStrawCollected += qty;

      if (apt.paymentDetails?.amount) {
        totalPaymentProcessed += apt.paymentDetails.amount;
      }
    });

    // Get monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Appointment.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          appointments: { $sum: 1 },
          collected: {
            $sum: { $cond: [{ $eq: ['$status', 'collected'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      overview: {
        totalFarmers,
        totalFarms,
        totalAppointments,
        totalStrawCollected: Math.round(totalStrawCollected * 10) / 10,
        totalPaymentProcessed: Math.round(totalPaymentProcessed)
      },
      appointmentsByStatus: appointmentStats.reduce((acc, stat) => {
        acc[stat._id] = { count: stat.count, quantity: stat.totalQuantity };
        return acc;
      }, {}),
      monthlyTrend: monthlyTrend.map(m => ({
        month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
        appointments: m.appointments,
        collected: m.collected
      }))
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
});

// @route   GET /api/analytics/by-location
// @desc    Get statistics grouped by state/district
// @access  Private (Government only)
router.get('/by-location', protect, governmentOnly, async (req, res) => {
  try {
    const { groupBy = 'state' } = req.query; // state or district

    // Get farm distribution
    const farmsByLocation = await Farm.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: groupBy === 'district'
            ? { state: '$location.state', district: '$location.district' }
            : '$location.state',
          farmCount: { $sum: 1 },
          totalArea: { $sum: '$totalArea' }
        }
      },
      { $sort: { farmCount: -1 } }
    ]);

    // Get appointment distribution with straw quantity
    const appointmentsByLocation = await Appointment.aggregate([
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
          _id: groupBy === 'district'
            ? { state: '$farmData.location.state', district: '$farmData.location.district' }
            : '$farmData.location.state',
          totalAppointments: { $sum: 1 },
          pendingAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          collectedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'collected'] }, 1, 0] }
          },
          totalQuantity: { $sum: '$strawDetails.quantity' }
        }
      },
      { $sort: { totalAppointments: -1 } }
    ]);

    res.json({
      groupBy,
      farmDistribution: farmsByLocation.map(f => ({
        location: groupBy === 'district' ? `${f._id.district}, ${f._id.state}` : f._id,
        state: groupBy === 'district' ? f._id.state : f._id,
        district: groupBy === 'district' ? f._id.district : null,
        farmCount: f.farmCount,
        totalArea: Math.round(f.totalArea * 10) / 10
      })),
      appointmentDistribution: appointmentsByLocation.map(a => ({
        location: groupBy === 'district' ? `${a._id.district}, ${a._id.state}` : a._id,
        state: groupBy === 'district' ? a._id.state : a._id,
        district: groupBy === 'district' ? a._id.district : null,
        totalAppointments: a.totalAppointments,
        pending: a.pendingAppointments,
        collected: a.collectedAppointments,
        totalQuantity: a.totalQuantity
      }))
    });
  } catch (error) {
    console.error('Location analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch location analytics', error: error.message });
  }
});

// @route   GET /api/analytics/collection-performance
// @desc    Get collection route performance metrics
// @access  Private (Government only)
router.get('/collection-performance', protect, governmentOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.routeDate = {};
      if (startDate) dateFilter.routeDate.$gte = new Date(startDate);
      if (endDate) dateFilter.routeDate.$lte = new Date(endDate);
    }

    const routeStats = await CollectionRoute.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalStops: { $sum: '$routeStats.totalStops' },
          totalQuantity: { $sum: '$routeStats.totalQuantity' },
          totalDistance: { $sum: '$routeStats.totalDistance' }
        }
      }
    ]);

    // Get daily collection trend
    const dailyCollection = await CollectionRoute.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$routeDate' } },
          routes: { $sum: 1 },
          stops: { $sum: '$routeStats.totalStops' },
          quantity: { $sum: '$routeStats.totalQuantity' }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    // Calculate averages
    const completedRoutes = await CollectionRoute.find({ status: 'completed', ...dateFilter });
    let avgStopsPerRoute = 0;
    let avgQuantityPerRoute = 0;
    let avgDistancePerRoute = 0;

    if (completedRoutes.length > 0) {
      const totals = completedRoutes.reduce((acc, route) => ({
        stops: acc.stops + (route.routeStats?.totalStops || 0),
        quantity: acc.quantity + (route.routeStats?.totalQuantity || 0),
        distance: acc.distance + (route.routeStats?.totalDistance || 0)
      }), { stops: 0, quantity: 0, distance: 0 });

      avgStopsPerRoute = Math.round(totals.stops / completedRoutes.length * 10) / 10;
      avgQuantityPerRoute = Math.round(totals.quantity / completedRoutes.length * 10) / 10;
      avgDistancePerRoute = Math.round(totals.distance / completedRoutes.length * 10) / 10;
    }

    res.json({
      routesByStatus: routeStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalStops: stat.totalStops,
          totalQuantity: Math.round(stat.totalQuantity * 10) / 10,
          totalDistance: Math.round(stat.totalDistance * 10) / 10
        };
        return acc;
      }, {}),
      averages: {
        stopsPerRoute: avgStopsPerRoute,
        quantityPerRoute: avgQuantityPerRoute,
        distancePerRoute: avgDistancePerRoute
      },
      dailyTrend: dailyCollection
    });
  } catch (error) {
    console.error('Collection performance error:', error);
    res.status(500).json({ message: 'Failed to fetch collection performance', error: error.message });
  }
});

// @route   GET /api/analytics/straw-types
// @desc    Get straw type distribution
// @access  Private (Government only)
router.get('/straw-types', protect, governmentOnly, async (req, res) => {
  try {
    const strawStats = await Appointment.aggregate([
      {
        $group: {
          _id: '$strawDetails.strawType',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$strawDetails.quantity' },
          avgMoistureContent: { $avg: '$strawDetails.moistureContent' }
        }
      },
      { $sort: { totalQuantity: -1 } }
    ]);

    // Quality distribution
    const qualityStats = await Appointment.aggregate([
      { $match: { 'collectionDetails.qualityGrade': { $exists: true } } },
      {
        $group: {
          _id: '$collectionDetails.qualityGrade',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$collectionDetails.actualQuantity' }
        }
      }
    ]);

    res.json({
      byStrawType: strawStats.map(s => ({
        type: s._id || 'Unknown',
        appointments: s.count,
        totalQuantity: Math.round(s.totalQuantity * 10) / 10,
        avgMoisture: Math.round(s.avgMoistureContent * 10) / 10 || 'N/A'
      })),
      byQualityGrade: qualityStats.reduce((acc, q) => {
        acc[q._id] = { count: q.count, quantity: Math.round(q.totalQuantity * 10) / 10 };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Straw types analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch straw analytics', error: error.message });
  }
});

// @route   GET /api/analytics/payment-summary
// @desc    Get payment statistics
// @access  Private (Government only)
router.get('/payment-summary', protect, governmentOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter['paymentDetails.paymentDate'] = {};
      if (startDate) dateFilter['paymentDetails.paymentDate'].$gte = new Date(startDate);
      if (endDate) dateFilter['paymentDetails.paymentDate'].$lte = new Date(endDate);
    }

    // Payment status breakdown
    const paymentStats = await Appointment.aggregate([
      { $match: { 'paymentDetails.status': { $exists: true } } },
      {
        $group: {
          _id: '$paymentDetails.status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$paymentDetails.amount' }
        }
      }
    ]);

    // Monthly payment trend
    const monthlyPayments = await Appointment.aggregate([
      {
        $match: {
          'paymentDetails.status': 'completed',
          'paymentDetails.paymentDate': { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDetails.paymentDate' },
            month: { $month: '$paymentDetails.paymentDate' }
          },
          payments: { $sum: 1 },
          totalAmount: { $sum: '$paymentDetails.amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Payment method breakdown
    const paymentMethods = await Appointment.aggregate([
      { $match: { 'paymentDetails.paymentMethod': { $exists: true } } },
      {
        $group: {
          _id: '$paymentDetails.paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$paymentDetails.amount' }
        }
      }
    ]);

    res.json({
      byStatus: paymentStats.reduce((acc, p) => {
        acc[p._id] = { count: p.count, amount: Math.round(p.totalAmount) };
        return acc;
      }, {}),
      monthlyTrend: monthlyPayments.map(m => ({
        month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
        payments: m.payments,
        amount: Math.round(m.totalAmount)
      })),
      byMethod: paymentMethods.reduce((acc, m) => {
        acc[m._id] = { count: m.count, amount: Math.round(m.totalAmount) };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Payment summary error:', error);
    res.status(500).json({ message: 'Failed to fetch payment summary', error: error.message });
  }
});

// @route   GET /api/analytics/export
// @desc    Export analytics data as CSV
// @access  Private (Government only)
router.get('/export', protect, governmentOnly, async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    let data = [];
    let filename = 'export.csv';
    let headers = [];

    let dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    switch (type) {
      case 'appointments':
        const appointments = await Appointment.find(
          hasDateFilter ? { createdAt: dateFilter } : {}
        )
          .populate('farmer', 'name phone email')
          .populate('farm', 'farmName location')
          .lean();

        headers = ['Date', 'Farmer Name', 'Phone', 'Farm', 'State', 'District', 'Straw Type', 'Quantity', 'Unit', 'Status', 'Payment Status', 'Payment Amount'];
        data = appointments.map(a => [
          new Date(a.createdAt).toLocaleDateString(),
          a.farmer?.name || '',
          a.farmer?.phone || '',
          a.farm?.farmName || '',
          a.farm?.location?.state || '',
          a.farm?.location?.district || '',
          a.strawDetails?.strawType || '',
          a.strawDetails?.quantity || '',
          a.strawDetails?.quantityUnit || '',
          a.status,
          a.paymentDetails?.status || 'N/A',
          a.paymentDetails?.amount || 0
        ]);
        filename = 'appointments_export.csv';
        break;

      case 'farmers':
        const farmers = await User.find({ userType: 'farmer' }).lean();
        headers = ['Name', 'Email', 'Phone', 'Registered Date', 'Verified'];
        data = farmers.map(f => [
          f.name,
          f.email,
          f.phone,
          new Date(f.createdAt).toLocaleDateString(),
          f.isVerified ? 'Yes' : 'No'
        ]);
        filename = 'farmers_export.csv';
        break;

      case 'farms':
        const farms = await Farm.find({ isActive: true })
          .populate('farmer', 'name phone')
          .lean();
        headers = ['Farm Name', 'Farmer', 'Phone', 'State', 'District', 'Village', 'Area', 'Unit', 'Soil Type', 'Irrigation'];
        data = farms.map(f => [
          f.farmName,
          f.farmer?.name || '',
          f.farmer?.phone || '',
          f.location?.state || '',
          f.location?.district || '',
          f.location?.village || '',
          f.totalArea,
          f.areaUnit,
          f.soilType || '',
          f.irrigationType || ''
        ]);
        filename = 'farms_export.csv';
        break;

      default:
        return res.status(400).json({ message: 'Invalid export type' });
    }

    // Generate CSV
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Failed to export data', error: error.message });
  }
});

module.exports = router;
