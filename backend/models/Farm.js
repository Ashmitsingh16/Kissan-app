const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmName: {
    type: String,
    required: [true, 'Farm name is required'],
    trim: true
  },
  location: {
    state: {
      type: String,
      required: [true, 'State is required']
    },
    district: {
      type: String,
      required: [true, 'District is required']
    },
    village: String,
    pincode: {
      type: String,
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
    },
    coordinates: {
      latitude: { type: Number, min: -90, max: 90, validate: Number.isFinite },
      longitude: { type: Number, min: -180, max: 180, validate: Number.isFinite }
    }
  },
  totalArea: {
    type: Number,
    required: [true, 'Total area is required'],
    min: 0.1,
    validate: Number.isFinite
  },
  areaUnit: {
    type: String,
    enum: ['acres', 'hectares', 'bigha'],
    default: 'acres'
  },
  crops: [{
    cropName: {
      type: String,
      required: true
    },
    cropType: {
      type: String,
      enum: ['kharif', 'rabi', 'zaid'],
      required: true
    },
    sowingDate: {
      type: Date,
      required: true
    },
    expectedHarvestDate: Date,
    actualHarvestDate: Date,
    areaUnderCrop: { type: Number, min: 0.1, validate: Number.isFinite },
    estimatedYield: { type: Number, min: 0, validate: Number.isFinite },
    yieldUnit: {
      type: String,
      enum: ['kg', 'quintal', 'ton'],
      default: 'quintal'
    },
    status: {
      type: String,
      enum: ['sowing', 'growing', 'ready_to_harvest', 'harvested', 'sold'],
      default: 'sowing'
    }
  }],
  soilType: {
    type: String,
    enum: ['alluvial', 'black', 'red', 'laterite', 'desert', 'mountain', 'other']
  },
  irrigationType: {
    type: String,
    enum: ['canal', 'well', 'tubewell', 'rainfed', 'drip', 'sprinkler', 'other']
  },
  isActive: {
    type: Boolean,
    default: true
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

farmSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Farm', farmSchema);
