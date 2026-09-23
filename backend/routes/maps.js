const express = require('express');
const mongoose = require('mongoose');
function routeConflict(message) { return Object.assign(new Error(message), { status: 409 }); }
const router = express.Router();
const { protect, governmentOnly, farmerOnly } = require('../middleware/auth');
const { geocodeAddress, getDistance, getOptimizedRoute, calculateFuelCost, haversineDistance } = require('../config/maps');
const Farm = require('../models/Farm');
const Appointment = require('../models/Appointment');
const CollectionRoute = require('../models/CollectionRoute');

// NTPC Plant locations (example depot locations)
const DEPOT_LOCATIONS = {
  'Uttar Pradesh': { name: 'NTPC Dadri', latitude: 28.5494, longitude: 77.5550 },
  'Punjab': { name: 'NTPC Bathinda', latitude: 30.2110, longitude: 74.9455 },
  'Haryana': { name: 'NTPC Faridabad', latitude: 28.4089, longitude: 77.3178 },
  'Rajasthan': { name: 'NTPC Kota', latitude: 25.2138, longitude: 75.8648 },
  'Madhya Pradesh': { name: 'NTPC Vindhyachal', latitude: 24.0883, longitude: 82.6588 },
  'Bihar': { name: 'NTPC Barh', latitude: 25.4833, longitude: 85.7167 },
  'West Bengal': { name: 'NTPC Farakka', latitude: 24.8167, longitude: 87.9167 },
  'default': { name: 'NTPC Depot', latitude: 28.6139, longitude: 77.2090 } // Delhi
};

// @route   POST /api/maps/geocode
// @desc    Geocode an address to get coordinates
// @access  Private
router.post('/geocode', protect, async (req, res) => {
  try {
    const { address, village, district, state, pincode } = req.body;

    let fullAddress = address;
    if (!fullAddress) {
      const parts = [village, district, state, pincode, 'India'].filter(Boolean);
      fullAddress = parts.join(', ');
    }

    const result = await geocodeAddress(fullAddress);

    if (result) {
      res.json({
        success: true,
        coordinates: result
      });
    } else {
      res.status(404).json({ message: 'Could not geocode address' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Geocoding failed', error: error.message });
  }
});

// @route   PUT /api/maps/farm/:id/coordinates
// @desc    Update farm with geocoded coordinates
// @access  Private (Farmers only)
router.put('/farm/:id/coordinates', protect, farmerOnly, async (req, res) => {
  try {
    const farm = await Farm.findOne({ _id: req.params.id, farmer: req.user._id });

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    // Build address for geocoding
    const parts = [
      farm.location.village,
      farm.location.district,
      farm.location.state,
      farm.location.pincode,
      'India'
    ].filter(Boolean);
    const address = parts.join(', ');

    const result = await geocodeAddress(address);

    if (result) {
      farm.location.coordinates = {
        latitude: result.latitude,
        longitude: result.longitude
      };
      await farm.save();

      res.json({
        success: true,
        message: 'Coordinates updated',
        coordinates: farm.location.coordinates
      });
    } else {
      res.status(404).json({ message: 'Could not geocode farm address' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to update coordinates', error: error.message });
  }
});

// @route   GET /api/maps/government/pending-farms
// @desc    Get pending appointments with farm locations for route planning
// @access  Private (Government only)
router.get('/government/pending-farms', protect, governmentOnly, async (req, res) => {
  try {
    const { state, district, date } = req.query;

    let query = {
      status: { $in: ['pending', 'approved', 'verified'] },
      'truckDetails.routeId': null
    };

    if (date) {
      const queryDate = new Date(date);
      query.preferredDate = {
        $gte: new Date(queryDate.setHours(0, 0, 0, 0)),
        $lt: new Date(queryDate.setHours(23, 59, 59, 999))
      };
    }

    const appointments = await Appointment.find(query)
      .populate({
        path: 'farm',
        select: 'farmName location totalArea'
      })
      .populate('farmer', 'name phone')
      .sort({ preferredDate: 1 });

    // Filter by state/district
    let filtered = appointments;
    if (state) {
      filtered = filtered.filter(apt => apt.farm?.location?.state === state);
    }
    if (district) {
      filtered = filtered.filter(apt => apt.farm?.location?.district === district);
    }

    // Group by location and add coordinates
    const farmsWithLocations = await Promise.all(
      filtered.map(async (apt) => {
        let coordinates = apt.farm?.location?.coordinates;

        // If no coordinates, try to geocode
        if (!coordinates?.latitude && apt.farm) {
          try {
            const address = [
              apt.farm.location.village,
              apt.farm.location.district,
              apt.farm.location.state,
              'India'
            ].filter(Boolean).join(', ');

            const result = await geocodeAddress(address);
            if (result) {
              coordinates = { latitude: result.latitude, longitude: result.longitude };
              // Update farm with coordinates
              await Farm.findByIdAndUpdate(apt.farm._id, {
                'location.coordinates': coordinates
              });
            }
          } catch (e) {
            console.error('Geocoding error for farm:', apt.farm._id);
          }
        }

        return {
          appointmentId: apt._id,
          farmId: apt.farm?._id,
          farmName: apt.farm?.farmName,
          farmerName: apt.farmer?.name,
          farmerPhone: apt.farmer?.phone,
          location: apt.farm?.location,
          coordinates: coordinates || null,
          quantity: apt.strawDetails?.quantity,
          quantityUnit: apt.strawDetails?.quantityUnit,
          preferredDate: apt.preferredDate,
          preferredTimeSlot: apt.preferredTimeSlot,
          status: apt.status
        };
      })
    );

    // Filter out farms without coordinates
    const validFarms = farmsWithLocations.filter(f => f.coordinates?.latitude);

    res.json({
      total: farmsWithLocations.length,
      withCoordinates: validFarms.length,
      farms: farmsWithLocations
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch farms', error: error.message });
  }
});

// @route   POST /api/maps/government/optimize-route
// @desc    Calculate optimized route for multiple farm pickups
// @access  Private (Government only)
router.post('/government/optimize-route', protect, governmentOnly, async (req, res) => {
  try {
    const { appointmentIds, depotState } = req.body;

    if (!appointmentIds || appointmentIds.length === 0) {
      return res.status(400).json({ message: 'No appointments selected' });
    }

    // Get appointments with farm details
    const appointments = await Appointment.find({
      _id: { $in: appointmentIds }
    }).populate('farm', 'farmName location');

    // Get depot location
    const depot = DEPOT_LOCATIONS[depotState] || DEPOT_LOCATIONS['default'];

    // Prepare waypoints
    const waypoints = [];
    const waypointAppointments = [];

    for (const apt of appointments) {
      if (apt.farm?.location?.coordinates?.latitude) {
        const coords = {
          latitude: apt.farm.location.coordinates.latitude,
          longitude: apt.farm.location.coordinates.longitude
        };
        waypoints.push(coords);
        waypointAppointments.push(apt);
      }
    }

    if (waypoints.length === 0) {
      return res.status(400).json({ message: 'No farms with valid coordinates' });
    }

    // Get optimized route from Google Maps
    let optimizedRoute;
    try {
      optimizedRoute = await getOptimizedRoute(depot, waypoints, depot);
    } catch (error) {
      // Fallback: Calculate simple distances
      console.error('Google Maps API error, using fallback:', error.message);

      let totalDistance = 0;
      let currentPoint = depot;
      const orderedWaypoints = [];

      // Simple nearest neighbor algorithm
      const remaining = [...waypoints];
      while (remaining.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;

        remaining.forEach((wp, idx) => {
          const dist = haversineDistance(currentPoint, wp);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = idx;
          }
        });

        totalDistance += nearestDist;
        orderedWaypoints.push(remaining[nearestIdx]);
        currentPoint = remaining[nearestIdx];
        remaining.splice(nearestIdx, 1);
      }

      // Add return to depot
      totalDistance += haversineDistance(currentPoint, depot);

      optimizedRoute = {
        totalDistance: totalDistance,
        totalDistanceText: `${totalDistance.toFixed(1)} km`,
        totalDuration: totalDistance * 3, // Estimate: 20 km/h average = 3 min/km
        totalDurationText: `${Math.round(totalDistance * 3)} min`,
        optimizedOrder: orderedWaypoints.map(wp => waypoints.indexOf(wp)),
        legs: orderedWaypoints.map((wp, idx) => ({
          legIndex: idx,
          coordinates: wp
        }))
      };
    }

    // Calculate fuel cost
    const fuelCost = calculateFuelCost(optimizedRoute.totalDistance);

    // Calculate total straw quantity
    const totalQuantity = appointments.reduce((sum, apt) => {
      let qty = apt.strawDetails?.quantity || 0;
      if (apt.strawDetails?.quantityUnit === 'kg') qty = qty / 100;
      if (apt.strawDetails?.quantityUnit === 'ton') qty = qty * 10;
      return sum + qty;
    }, 0);

    res.json({
      success: true,
      depot: depot,
      route: {
        ...optimizedRoute,
        estimatedFuelCost: fuelCost,
        totalStops: waypoints.length,
        totalQuantity: Math.round(totalQuantity * 10) / 10,
        quantityUnit: 'quintals'
      },
      stops: optimizedRoute.optimizedOrder ?
        optimizedRoute.optimizedOrder.map((orderIdx, stopNum) => {
          const wp = waypoints[orderIdx];
          const apt = waypointAppointments[orderIdx];
          return {
            stopNumber: stopNum + 1,
            appointmentId: apt?._id,
            farmName: apt?.farm?.farmName,
            location: apt?.farm?.location,
            coordinates: wp,
            quantity: apt?.strawDetails?.quantity,
            quantityUnit: apt?.strawDetails?.quantityUnit
          };
        }) :
        waypoints.map((wp, idx) => {
          const apt = waypointAppointments[idx];
          return {
            stopNumber: idx + 1,
            appointmentId: apt?._id,
            farmName: apt?.farm?.farmName,
            location: apt?.farm?.location,
            coordinates: wp,
            quantity: apt?.strawDetails?.quantity,
            quantityUnit: apt?.strawDetails?.quantityUnit
          };
        })
    });
  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({ message: 'Route optimization failed', error: error.message });
  }
});

// @route   POST /api/maps/government/create-collection-route
// @desc    Create a new collection route with optimized stops
// @access  Private (Government only)
router.post('/government/create-collection-route', protect, governmentOnly, async (req, res) => {
  try {
    const { routeDate, appointmentIds, truckDetails, depotState } = req.body;
    if (!Array.isArray(appointmentIds) || !appointmentIds.length || appointmentIds.length > 100 ||
        appointmentIds.some(id => !mongoose.isObjectIdOrHexString(id)) ||
        new Set(appointmentIds).size !== appointmentIds.length || !routeDate || !Number.isFinite(Date.parse(routeDate))) {
      return res.status(400).json({ message: 'Supply a valid route date and 1–100 distinct appointment IDs' });
    }
    const depot = DEPOT_LOCATIONS[depotState] || DEPOT_LOCATIONS.default;
    const collectionRoute = await mongoose.connection.transaction(async session => {
      const appointments = await Appointment.find({ _id: { $in: appointmentIds } })
        .populate('farm', 'farmName location').session(session);
      if (appointments.length !== appointmentIds.length || appointments.some(apt =>
          !['pending', 'approved', 'verified'].includes(apt.status) || apt.truckDetails?.routeId || !apt.farm)) {
        throw routeConflict('All appointments must be awaiting collection and not already assigned to a route');
      }
      // Keep the selected order instead of relying on database result order.
      const ordered = appointmentIds.map(id => appointments.find(apt => String(apt._id) === id));
      const totalQuantity = ordered.reduce((sum, apt) => sum + apt.strawDetails.quantity *
        (apt.strawDetails.quantityUnit === 'kg' ? 0.01 : apt.strawDetails.quantityUnit === 'ton' ? 10 : 1), 0);
      const route = new CollectionRoute({
        routeDate: new Date(routeDate), state: ordered[0].farm.location.state,
        district: ordered[0].farm.location.district,
        stops: ordered.map((apt, idx) => ({ appointment: apt._id, farm: apt.farm._id, order: idx + 1,
          status: 'pending', coordinates: apt.farm.location.coordinates })),
        truck: truckDetails, routeStats: { totalStops: ordered.length, totalQuantity },
        startPoint: { name: depot.name, coordinates: { latitude: depot.latitude, longitude: depot.longitude } },
        endPoint: { name: depot.name, coordinates: { latitude: depot.latitude, longitude: depot.longitude } },
        assignedOfficer: req.user._id, status: 'planned'
      });
      await route.save({ session });
      for (const appointment of ordered) {
        appointment.truckDetails.routeId = route._id;
        // Planning a route must not approve, verify or reopen an appointment.
        await appointment.save({ session });
      }
      return route;
    });
    res.status(201).json({ success: true, message: 'Collection route created', route: collectionRoute });
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500))
      .json({ message: error.status ? error.message : 'Failed to create route' });
  }
});

// @route   GET /api/maps/government/routes
// @desc    Get all collection routes
// @access  Private (Government only)
router.get('/government/routes', protect, governmentOnly, async (req, res) => {
  try {
    const { status, date } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    if (date) {
      const queryDate = new Date(date);
      query.routeDate = {
        $gte: new Date(queryDate.setHours(0, 0, 0, 0)),
        $lt: new Date(queryDate.setHours(23, 59, 59, 999))
      };
    }

    const routes = await CollectionRoute.find(query)
      .populate('assignedOfficer', 'name')
      .populate({
        path: 'stops.appointment',
        select: 'strawDetails farmer status',
        populate: { path: 'farmer', select: 'name phone' }
      })
      .populate('stops.farm', 'farmName location')
      .sort({ routeDate: -1 });

    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch routes', error: error.message });
  }
});

// @route   GET /api/maps/government/routes/:id
// @desc    Get single route details
// @access  Private (Government only)
router.get('/government/routes/:id', protect, governmentOnly, async (req, res) => {
  try {
    const route = await CollectionRoute.findById(req.params.id)
      .populate('assignedOfficer', 'name phone')
      .populate({
        path: 'stops.appointment',
        populate: [
          { path: 'farmer', select: 'name phone email' },
          { path: 'farm', select: 'farmName location' }
        ]
      });

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    res.json(route);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch route', error: error.message });
  }
});

// @route   PUT /api/maps/government/routes/:id/start
// @desc    Start a collection route
// @access  Private (Government only)
router.put('/government/routes/:id/start', protect, governmentOnly, async (req, res) => {
  try {
    const route = await mongoose.connection.transaction(async session => {
      const current = await CollectionRoute.findById(req.params.id).session(session);
      if (!current) throw Object.assign(new Error('Route not found'), { status: 404 });
      if (current.status !== 'planned') throw routeConflict('Only a planned route can be started');
      const ids = current.stops.map(stop => stop.appointment);
      const appointments = await Appointment.find({ _id: { $in: ids } }).session(session);
      if (!ids.length || appointments.length !== ids.length || appointments.some(apt =>
          apt.status !== 'verified' || !apt.verification?.isVerified ||
          String(apt.truckDetails?.routeId) !== String(current._id))) {
        throw routeConflict('Every appointment on the route must be verified before dispatch');
      }
      for (const appointment of appointments) {
        appointment.status = 'truck_dispatched';
        Object.assign(appointment.truckDetails, {
          dispatchTime: new Date(), vehicleNumber: current.truck?.vehicleNumber,
          driverName: current.truck?.driverName, driverPhone: current.truck?.driverPhone
        });
        await appointment.save({ session });
      }
      current.status = 'in_progress';
      current.startTime = new Date();
      await current.save({ session });
      return current;
    });
    res.json({ success: true, message: 'Route started', route });
  } catch (error) {
    res.status(error.status || (error.name === 'CastError' ? 400 : 500))
      .json({ message: error.status ? error.message : 'Failed to start route' });
  }
});

// @route   GET /api/maps/api-key
// @desc    Get Maps API key for frontend
// @access  Private
router.get('/api-key', protect, (req, res) => {
  res.json({ apiKey: process.env.GOOGLE_MAPS_BROWSER_KEY || '' });
});

module.exports = router;
