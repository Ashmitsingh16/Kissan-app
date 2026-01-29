const mongoose = require('mongoose');

const collectionRouteSchema = new mongoose.Schema({
  routeDate: {
    type: Date,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  // Stops in this route (multiple farms)
  stops: [{
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true
    },
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: true
    },
    order: Number, // Order of visit
    estimatedArrival: Date,
    actualArrival: Date,
    status: {
      type: String,
      enum: ['pending', 'in_transit', 'arrived', 'collected', 'skipped'],
      default: 'pending'
    },
    distanceFromPrevious: Number, // in km
    estimatedTimeFromPrevious: Number, // in minutes
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  }],
  // Truck details
  truck: {
    truckId: String,
    vehicleNumber: String,
    capacity: Number, // in quintals
    driverName: String,
    driverPhone: String
  },
  // Route statistics
  routeStats: {
    totalDistance: Number, // in km
    totalStops: Number,
    totalQuantity: Number, // in quintals
    estimatedDuration: Number, // in minutes
    estimatedFuelCost: Number,
    actualDistance: Number,
    actualDuration: Number
  },
  // Starting point (NTPC plant or depot)
  startPoint: {
    name: String,
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  // Ending point
  endPoint: {
    name: String,
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'completed', 'cancelled'],
    default: 'planned'
  },
  assignedOfficer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startTime: Date,
  endTime: Date,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

collectionRouteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying
collectionRouteSchema.index({ routeDate: 1, state: 1, district: 1 });
collectionRouteSchema.index({ status: 1 });

module.exports = mongoose.model('CollectionRoute', collectionRouteSchema);
