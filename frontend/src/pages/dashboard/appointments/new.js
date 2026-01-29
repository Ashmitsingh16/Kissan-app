import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import DashboardLayout from '../../../components/DashboardLayout';
import { farmAPI, appointmentAPI } from '../../../utils/api';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaCalendarAlt, FaRupeeSign, FaExclamationTriangle } from 'react-icons/fa';

const PRICE_PER_QUINTAL = 200; // Rs 200 per quintal

export default function NewAppointment() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    farm: '',
    strawDetails: {
      cropType: '',
      quantity: '',
      quantityUnit: 'quintal'
    },
    preferredDate: '',
    preferredTimeSlot: 'morning',
    remarks: ''
  });

  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [hasBankDetails, setHasBankDetails] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    } else if (user?.userType !== 'farmer') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.userType === 'farmer') {
      fetchFarms();
      checkBankDetails();
    }
  }, [user]);

  useEffect(() => {
    calculatePrice();
  }, [formData.strawDetails.quantity, formData.strawDetails.quantityUnit]);

  const fetchFarms = async () => {
    try {
      const response = await farmAPI.getAll();
      setFarms(response.data);
    } catch (error) {
      console.error('Error fetching farms:', error);
      toast.error('Failed to load farms');
    } finally {
      setLoading(false);
    }
  };

  const checkBankDetails = () => {
    // Check from local storage user data
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setHasBankDetails(!!userData.bankDetails?.accountNumber);
    }
  };

  const calculatePrice = () => {
    const quantity = parseFloat(formData.strawDetails.quantity) || 0;
    let priceInQuintals = quantity;

    if (formData.strawDetails.quantityUnit === 'kg') {
      priceInQuintals = quantity / 100;
    } else if (formData.strawDetails.quantityUnit === 'ton') {
      priceInQuintals = quantity * 10;
    }

    setEstimatedPrice(Math.round(priceInQuintals * PRICE_PER_QUINTAL));
  };

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.farm) {
      newErrors.farm = 'Please select a farm';
    }
    if (!formData.strawDetails.cropType.trim()) {
      newErrors['strawDetails.cropType'] = 'Crop type is required';
    }
    if (!formData.strawDetails.quantity || parseFloat(formData.strawDetails.quantity) <= 0) {
      newErrors['strawDetails.quantity'] = 'Valid quantity is required';
    }
    if (!formData.preferredDate) {
      newErrors.preferredDate = 'Please select a date';
    } else {
      const selectedDate = new Date(formData.preferredDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.preferredDate = 'Date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const submitData = {
        ...formData,
        strawDetails: {
          ...formData.strawDetails,
          quantity: parseFloat(formData.strawDetails.quantity)
        }
      };

      await appointmentAPI.create(submitData);
      toast.success('Appointment booked successfully!');
      router.push('/dashboard/appointments');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to book appointment';
      toast.error(message);

      if (error.response?.data?.redirectTo) {
        router.push(error.response.data.redirectTo);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!hasBankDetails) {
    return (
      <DashboardLayout>
        <div className="card text-center py-12">
          <FaExclamationTriangle className="h-16 w-16 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Bank Details Required</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Please add your bank details before booking a straw selling appointment.
            This is required to receive payments.
          </p>
          <Link href="/dashboard/bank-details" className="btn-primary inline-block">
            Add Bank Details
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/appointments" className="inline-flex items-center text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white mb-4">
          <FaArrowLeft className="mr-2" />
          Back to Appointments
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Book Straw Selling Appointment</h1>
        <p className="text-gray-600 dark:text-gray-400">Schedule a pickup for your straw</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : farms.length === 0 ? (
        <div className="card text-center py-12">
          <FaExclamationTriangle className="h-16 w-16 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">No Farms Registered</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Please register a farm before booking a straw selling appointment.
          </p>
          <Link href="/dashboard/farms/new" className="btn-primary inline-block">
            Register a Farm
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Select Farm */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Select Farm</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {farms.map((farm) => (
                <label
                  key={farm._id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.farm === farm._id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 dark:border-primary-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="farm"
                    value={farm._id}
                    checked={formData.farm === farm._id}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <h3 className="font-semibold text-gray-800 dark:text-white">{farm.farmName}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {farm.location?.district}, {farm.location?.state}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {farm.totalArea} {farm.areaUnit}
                  </p>
                </label>
              ))}
            </div>
            {errors.farm && <p className="error-text mt-2">{errors.farm}</p>}
          </div>

          {/* Straw Details */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Straw Details</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Crop Type *</label>
                <input
                  type="text"
                  name="strawDetails.cropType"
                  value={formData.strawDetails.cropType}
                  onChange={handleChange}
                  className={`input-field ${errors['strawDetails.cropType'] ? 'border-red-500' : ''}`}
                  placeholder="e.g., Wheat, Rice, Paddy"
                />
                {errors['strawDetails.cropType'] && <p className="error-text">{errors['strawDetails.cropType']}</p>}
              </div>

              <div>
                <label className="form-label">Quantity *</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    name="strawDetails.quantity"
                    value={formData.strawDetails.quantity}
                    onChange={handleChange}
                    className={`input-field flex-1 ${errors['strawDetails.quantity'] ? 'border-red-500' : ''}`}
                    placeholder="Enter quantity"
                    step="0.1"
                  />
                  <select
                    name="strawDetails.quantityUnit"
                    value={formData.strawDetails.quantityUnit}
                    onChange={handleChange}
                    className="input-field w-32"
                  >
                    <option value="kg">kg</option>
                    <option value="quintal">quintal</option>
                    <option value="ton">ton</option>
                  </select>
                </div>
                {errors['strawDetails.quantity'] && <p className="error-text">{errors['strawDetails.quantity']}</p>}
              </div>
            </div>

            {/* Price Estimate */}
            {estimatedPrice > 0 && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                <div className="flex items-center justify-between">
                  <span className="text-green-700 dark:text-green-300 font-medium">Estimated Payment:</span>
                  <span className="text-2xl font-bold text-green-700 dark:text-green-300 flex items-center">
                    <FaRupeeSign />
                    {estimatedPrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Rate: Rs {PRICE_PER_QUINTAL} per quintal (Final amount may vary after inspection)
                </p>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
              <FaCalendarAlt className="mr-2 text-primary-600 dark:text-primary-400" />
              Schedule Pickup
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Preferred Date *</label>
                <input
                  type="date"
                  name="preferredDate"
                  value={formData.preferredDate}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, preferredDate: e.target.value }));
                    if (errors.preferredDate) {
                      setErrors(prev => ({ ...prev, preferredDate: '' }));
                    }
                  }}
                  min={getMinDate()}
                  className={`input-field ${errors.preferredDate ? 'border-red-500' : ''}`}
                />
                {errors.preferredDate && <p className="error-text">{errors.preferredDate}</p>}
              </div>

              <div>
                <label className="form-label">Preferred Time Slot</label>
                <select
                  name="preferredTimeSlot"
                  value={formData.preferredTimeSlot}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="morning">Morning (6 AM - 12 PM)</option>
                  <option value="afternoon">Afternoon (12 PM - 4 PM)</option>
                  <option value="evening">Evening (4 PM - 7 PM)</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="form-label">Additional Remarks (Optional)</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                className="input-field"
                rows={3}
                placeholder="Any special instructions or notes..."
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">How it works:</h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>1. Submit your appointment request</li>
              <li>2. A government officer will review and approve your request</li>
              <li>3. Collection team will visit on the scheduled date</li>
              <li>4. Straw will be weighed and quality checked</li>
              <li>5. Payment will be transferred to your bank account</li>
            </ul>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <Link href="/dashboard/appointments" className="btn-outline">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className={`btn-primary ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {submitting ? 'Booking...' : 'Book Appointment'}
            </button>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
}
