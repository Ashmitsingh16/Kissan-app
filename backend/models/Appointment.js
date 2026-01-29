const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true
  },
  appointmentType: {
    type: String,
    enum: ['straw_selling', 'crop_inspection', 'other'],
    default: 'straw_selling'
  },
  strawDetails: {
    cropType: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required']
    },
    quantityUnit: {
      type: String,
      enum: ['kg', 'quintal', 'ton'],
      default: 'quintal'
    },
    estimatedPrice: Number,
    actualQuantity: Number,
    qualityGrade: {
      type: String,
      enum: ['A', 'B', 'C'],
    }
  },
  preferredDate: {
    type: Date,
    required: [true, 'Preferred date is required']
  },
  preferredTimeSlot: {
    type: String,
    enum: ['morning', 'afternoon', 'evening'],
    default: 'morning'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'verified', 'truck_dispatched', 'collected', 'completed', 'rejected', 'cancelled'],
    default: 'pending'
  },
  assignedOfficer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Truck dispatch details
  truckDetails: {
    truckId: String,
    driverName: String,
    driverPhone: String,
    vehicleNumber: String,
    dispatchTime: Date,
    estimatedArrival: Date,
    actualArrival: Date,
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CollectionRoute'
    }
  },
  // Collection details
  collectionDetails: {
    collectedAt: Date,
    collectedBy: String,
    weighbridgeReading: Number,
    photos: [String],
    farmerSignature: String
  },
  // Verification details
  verification: {
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    verificationNotes: String
  },
  remarks: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  paymentAmount: Number,
  paymentDate: Date,
  transactionId: String,
  // Notification tracking
  notifications: [{
    type: { type: String },
    message: String,
    sentAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

appointmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying
appointmentSchema.index({ status: 1, preferredDate: 1 });
appointmentSchema.index({ farmer: 1, createdAt: -1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
