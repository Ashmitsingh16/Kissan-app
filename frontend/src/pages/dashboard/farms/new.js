import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import DashboardLayout from '../../../components/DashboardLayout';
import LocationPicker from '../../../components/LocationPicker';
import { farmAPI, mapsAPI } from '../../../utils/api';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaTractor, FaPlus, FaTrash, FaMapMarkerAlt } from 'react-icons/fa';

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const soilTypes = ['alluvial', 'black', 'red', 'laterite', 'desert', 'mountain', 'other'];
const irrigationTypes = ['canal', 'well', 'tubewell', 'rainfed', 'drip', 'sprinkler', 'other'];
const cropTypes = ['kharif', 'rabi', 'zaid'];

export default function NewFarm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    farmName: '',
    location: {
      state: '',
      district: '',
      village: '',
      pincode: '',
      coordinates: {
        latitude: null,
        longitude: null
      }
    },
    totalArea: '',
    areaUnit: 'acres',
    soilType: '',
    irrigationType: '',
    crops: []
  });

  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [newCrop, setNewCrop] = useState({
    cropName: '',
    cropType: 'kharif',
    sowingDate: '',
    areaUnderCrop: '',
    estimatedYield: '',
    yieldUnit: 'quintal'
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    } else if (user?.userType !== 'farmer') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCropChange = (e) => {
    const { name, value } = e.target;
    setNewCrop(prev => ({ ...prev, [name]: value }));
  };

  const handleCoordinatesChange = (coords) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        coordinates: coords
      }
    }));
  };

  // Build address from location parts for geocoding
  const getFullAddress = () => {
    const parts = [
      formData.location.village,
      formData.location.district,
      formData.location.state,
      formData.location.pincode,
      'India'
    ].filter(Boolean);
    return parts.join(', ');
  };

  const addCrop = () => {
    if (!newCrop.cropName || !newCrop.sowingDate || !newCrop.areaUnderCrop) {
      toast.error('Please fill crop name, sowing date, and area');
      return;
    }

    setFormData(prev => ({
      ...prev,
      crops: [...prev.crops, { ...newCrop, status: 'sowing' }]
    }));

    setNewCrop({
      cropName: '',
      cropType: 'kharif',
      sowingDate: '',
      areaUnderCrop: '',
      estimatedYield: '',
      yieldUnit: 'quintal'
    });

    toast.success('Crop added');
  };

  const removeCrop = (index) => {
    setFormData(prev => ({
      ...prev,
      crops: prev.crops.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.farmName.trim()) {
      newErrors.farmName = 'Farm name is required';
    }
    if (!formData.location.state) {
      newErrors['location.state'] = 'State is required';
    }
    if (!formData.location.district.trim()) {
      newErrors['location.district'] = 'District is required';
    }
    if (!formData.totalArea || parseFloat(formData.totalArea) <= 0) {
      newErrors.totalArea = 'Valid area is required';
    }
    if (formData.location.pincode && !/^\d{6}$/.test(formData.location.pincode)) {
      newErrors['location.pincode'] = 'Pincode must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        totalArea: parseFloat(formData.totalArea),
        location: {
          ...formData.location,
          coordinates: formData.location.coordinates?.latitude
            ? formData.location.coordinates
            : undefined
        },
        crops: formData.crops.map(crop => ({
          ...crop,
          areaUnderCrop: parseFloat(crop.areaUnderCrop),
          estimatedYield: crop.estimatedYield ? parseFloat(crop.estimatedYield) : undefined
        }))
      };

      await farmAPI.create(submitData);
      toast.success('Farm registered successfully!');
      router.push('/dashboard/farms');
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Failed to register farm';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/farms" className="inline-flex items-center text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white mb-4">
          <FaArrowLeft className="mr-2" />
          Back to Farms
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Register New Farm</h1>
        <p className="text-gray-600 dark:text-gray-400">Add your farm details and crops</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
            <FaTractor className="mr-2 text-primary-600 dark:text-primary-400" />
            Farm Details
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Farm Name *</label>
              <input
                type="text"
                name="farmName"
                value={formData.farmName}
                onChange={handleChange}
                className={`input-field ${errors.farmName ? 'border-red-500' : ''}`}
                placeholder="e.g., Green Valley Farm"
              />
              {errors.farmName && <p className="error-text">{errors.farmName}</p>}
            </div>

            <div>
              <label className="form-label">Total Area *</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  name="totalArea"
                  value={formData.totalArea}
                  onChange={handleChange}
                  className={`input-field flex-1 ${errors.totalArea ? 'border-red-500' : ''}`}
                  placeholder="e.g., 5"
                  step="0.1"
                />
                <select
                  name="areaUnit"
                  value={formData.areaUnit}
                  onChange={handleChange}
                  className="input-field w-32"
                >
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                  <option value="bigha">Bigha</option>
                </select>
              </div>
              {errors.totalArea && <p className="error-text">{errors.totalArea}</p>}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Location Details</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">State *</label>
              <select
                name="location.state"
                value={formData.location.state}
                onChange={handleChange}
                className={`input-field ${errors['location.state'] ? 'border-red-500' : ''}`}
              >
                <option value="">Select State</option>
                {indianStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              {errors['location.state'] && <p className="error-text">{errors['location.state']}</p>}
            </div>

            <div>
              <label className="form-label">District *</label>
              <input
                type="text"
                name="location.district"
                value={formData.location.district}
                onChange={handleChange}
                className={`input-field ${errors['location.district'] ? 'border-red-500' : ''}`}
                placeholder="Enter district"
              />
              {errors['location.district'] && <p className="error-text">{errors['location.district']}</p>}
            </div>

            <div>
              <label className="form-label">Village (Optional)</label>
              <input
                type="text"
                name="location.village"
                value={formData.location.village}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter village name"
              />
            </div>

            <div>
              <label className="form-label">Pincode (Optional)</label>
              <input
                type="text"
                name="location.pincode"
                value={formData.location.pincode}
                onChange={handleChange}
                className={`input-field ${errors['location.pincode'] ? 'border-red-500' : ''}`}
                placeholder="6-digit pincode"
                maxLength={6}
              />
              {errors['location.pincode'] && <p className="error-text">{errors['location.pincode']}</p>}
            </div>
          </div>

          {/* GPS Location Toggle */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowLocationPicker(!showLocationPicker)}
              className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
            >
              <FaMapMarkerAlt />
              {showLocationPicker ? 'Hide GPS Location Picker' : 'Add GPS Location (Recommended for faster pickup)'}
            </button>

            {formData.location.coordinates?.latitude && !showLocationPicker && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                GPS coordinates set: {formData.location.coordinates.latitude.toFixed(4)}, {formData.location.coordinates.longitude.toFixed(4)}
              </p>
            )}
          </div>

          {/* Location Picker */}
          {showLocationPicker && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <LocationPicker
                coordinates={formData.location.coordinates}
                onCoordinatesChange={handleCoordinatesChange}
                address={getFullAddress()}
              />
            </div>
          )}
        </div>

        {/* Soil & Irrigation */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Farm Characteristics (Optional)</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Soil Type</label>
              <select
                name="soilType"
                value={formData.soilType}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select Soil Type</option>
                {soilTypes.map(type => (
                  <option key={type} value={type} className="capitalize">{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Irrigation Type</label>
              <select
                name="irrigationType"
                value={formData.irrigationType}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select Irrigation Type</option>
                {irrigationTypes.map(type => (
                  <option key={type} value={type} className="capitalize">{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Crops */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Crops (Optional - can add later)</h2>

          {/* Add Crop Form */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-3">Add a Crop</h3>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="form-label">Crop Name</label>
                <input
                  type="text"
                  name="cropName"
                  value={newCrop.cropName}
                  onChange={handleCropChange}
                  className="input-field"
                  placeholder="e.g., Wheat, Rice"
                />
              </div>

              <div>
                <label className="form-label">Season Type</label>
                <select
                  name="cropType"
                  value={newCrop.cropType}
                  onChange={handleCropChange}
                  className="input-field"
                >
                  {cropTypes.map(type => (
                    <option key={type} value={type} className="capitalize">{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Sowing Date</label>
                <input
                  type="date"
                  name="sowingDate"
                  value={newCrop.sowingDate}
                  onChange={handleCropChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="form-label">Area Under Crop ({formData.areaUnit})</label>
                <input
                  type="number"
                  name="areaUnderCrop"
                  value={newCrop.areaUnderCrop}
                  onChange={handleCropChange}
                  className="input-field"
                  placeholder="e.g., 2"
                  step="0.1"
                />
              </div>

              <div>
                <label className="form-label">Estimated Yield</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    name="estimatedYield"
                    value={newCrop.estimatedYield}
                    onChange={handleCropChange}
                    className="input-field flex-1"
                    placeholder="e.g., 20"
                  />
                  <select
                    name="yieldUnit"
                    value={newCrop.yieldUnit}
                    onChange={handleCropChange}
                    className="input-field w-28"
                  >
                    <option value="kg">kg</option>
                    <option value="quintal">quintal</option>
                    <option value="ton">ton</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={addCrop}
              className="btn-outline flex items-center"
            >
              <FaPlus className="mr-2" />
              Add Crop
            </button>
          </div>

          {/* Added Crops List */}
          {formData.crops.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-gray-700 dark:text-gray-200">Added Crops:</h3>
              {formData.crops.map((crop, index) => (
                <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <div>
                    <span className="font-medium text-gray-800 dark:text-white">{crop.cropName}</span>
                    <span className="mx-2 text-gray-400 dark:text-gray-500">|</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">{crop.cropType}</span>
                    <span className="mx-2 text-gray-400 dark:text-gray-500">|</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{crop.areaUnderCrop} {formData.areaUnit}</span>
                    <span className="mx-2 text-gray-400 dark:text-gray-500">|</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Sowing: {new Date(crop.sowingDate).toLocaleDateString('en-IN')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCrop(index)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Link href="/dashboard/farms" className="btn-outline">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className={`btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Registering...' : 'Register Farm'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
