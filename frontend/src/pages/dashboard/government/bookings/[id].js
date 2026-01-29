import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import DashboardLayout from '../../../../components/DashboardLayout';
import { governmentAPI, appointmentAPI } from '../../../../utils/api';
import toast from 'react-hot-toast';
import {
  FaArrowLeft,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaIdCard,
  FaMapMarkerAlt,
  FaTractor,
  FaRupeeSign,
  FaCalendarAlt,
  FaClock,
  FaTruck,
  FaCheck,
  FaTimes,
  FaUniversity
} from 'react-icons/fa';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  approved: 'bg-blue-100 text-blue-700 border-blue-300',
  verified: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  truck_dispatched: 'bg-purple-100 text-purple-700 border-purple-300',
  collected: 'bg-teal-100 text-teal-700 border-teal-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-300'
};

export default function BookingDetail() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id, action } = router.query;

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [verifyForm, setVerifyForm] = useState({ verificationNotes: '' });
  const [truckForm, setTruckForm] = useState({
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    estimatedArrival: ''
  });
  const [collectForm, setCollectForm] = useState({
    actualQuantity: '',
    qualityGrade: 'B',
    weighbridgeReading: '',
    collectedBy: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    transactionId: '',
    paymentAmount: ''
  });

  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    } else if (user?.userType !== 'government') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (id && user?.userType === 'government') {
      fetchAppointment();
    }
  }, [id, user]);

  useEffect(() => {
    if (action && appointment) {
      setActiveModal(action);
    }
  }, [action, appointment]);

  const fetchAppointment = async () => {
    try {
      const response = await appointmentAPI.getById(id);
      setAppointment(response.data);

      // Pre-fill payment form
      if (response.data.paymentAmount) {
        setPaymentForm(prev => ({
          ...prev,
          paymentAmount: response.data.paymentAmount
        }));
      }
      if (response.data.strawDetails?.actualQuantity) {
        setCollectForm(prev => ({
          ...prev,
          actualQuantity: response.data.strawDetails.actualQuantity
        }));
      }
    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast.error('Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setActionLoading(true);
    try {
      await governmentAPI.verifyAppointment(id, verifyForm);
      toast.success('Farmer verified successfully');
      fetchAppointment();
      setActiveModal(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatchTruck = async () => {
    if (!truckForm.vehicleNumber || !truckForm.driverName || !truckForm.driverPhone) {
      toast.error('Please fill all required fields');
      return;
    }
    setActionLoading(true);
    try {
      await governmentAPI.dispatchTruck(id, truckForm);
      toast.success('Truck dispatched successfully');
      fetchAppointment();
      setActiveModal(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Dispatch failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCollect = async () => {
    if (!collectForm.actualQuantity || !collectForm.qualityGrade) {
      toast.error('Please fill all required fields');
      return;
    }
    setActionLoading(true);
    try {
      await governmentAPI.markCollected(id, {
        ...collectForm,
        actualQuantity: parseFloat(collectForm.actualQuantity),
        weighbridgeReading: collectForm.weighbridgeReading ? parseFloat(collectForm.weighbridgeReading) : undefined
      });
      toast.success('Collection recorded successfully');
      fetchAppointment();
      setActiveModal(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Collection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentForm.transactionId || !paymentForm.paymentAmount) {
      toast.error('Please fill all required fields');
      return;
    }
    setActionLoading(true);
    try {
      await governmentAPI.processPayment(id, {
        ...paymentForm,
        paymentAmount: parseFloat(paymentForm.paymentAmount)
      });
      toast.success('Payment processed successfully');
      fetchAppointment();
      setActiveModal(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Payment failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this appointment?')) return;
    setActionLoading(true);
    try {
      await governmentAPI.updateStatus(id, { status: 'rejected', remarks: 'Rejected by officer' });
      toast.success('Appointment rejected');
      fetchAppointment();
    } catch (error) {
      toast.error('Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <DashboardLayout>
        <div className="card text-center py-12">
          <h3 className="text-xl font-semibold text-gray-700">Appointment not found</h3>
          <Link href="/dashboard/government/bookings" className="btn-primary mt-4 inline-block">
            Back to Bookings
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/government/bookings" className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4">
          <FaArrowLeft className="mr-2" />
          Back to Bookings
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Booking Details</h1>
            <p className="text-gray-600">ID: {appointment._id}</p>
          </div>
          <span className={`px-4 py-2 rounded-lg text-sm font-medium border ${statusColors[appointment.status]}`}>
            {appointment.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Farmer Details */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FaUser className="mr-2 text-blue-600" />
              Farmer Information
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <FaUser className="text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-800">{appointment.farmer?.name}</p>
                </div>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <FaPhone className="text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-800">{appointment.farmer?.phone}</p>
                </div>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <FaEnvelope className="text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-800">{appointment.farmer?.email}</p>
                </div>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <FaIdCard className="text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">{appointment.farmer?.idType?.toUpperCase()}</p>
                  <p className="font-medium text-gray-800">{appointment.farmer?.idNumber}</p>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            {appointment.farmer?.bankDetails && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                  <FaUniversity className="mr-2" />
                  Bank Details
                </h3>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <p><span className="text-blue-600">Account:</span> {appointment.farmer.bankDetails.accountNumber}</p>
                  <p><span className="text-blue-600">IFSC:</span> {appointment.farmer.bankDetails.ifscCode}</p>
                  <p><span className="text-blue-600">Bank:</span> {appointment.farmer.bankDetails.bankName}</p>
                  <p><span className="text-blue-600">Name:</span> {appointment.farmer.bankDetails.accountHolderName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Farm Details */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FaTractor className="mr-2 text-green-600" />
              Farm Information
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Farm Name</p>
                <p className="font-medium text-gray-800">{appointment.farm?.farmName}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Area</p>
                <p className="font-medium text-gray-800">{appointment.farm?.totalArea} {appointment.farm?.areaUnit}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg md:col-span-2">
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium text-gray-800 flex items-center">
                  <FaMapMarkerAlt className="mr-1 text-gray-400" />
                  {appointment.farm?.location?.village ? `${appointment.farm.location.village}, ` : ''}
                  {appointment.farm?.location?.district}, {appointment.farm?.location?.state}
                </p>
              </div>
            </div>
          </div>

          {/* Straw Details */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Straw Collection Details</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Crop Type</p>
                <p className="font-medium text-gray-800">{appointment.strawDetails?.cropType}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Quantity</p>
                <p className="font-medium text-gray-800">
                  {appointment.strawDetails?.quantity} {appointment.strawDetails?.quantityUnit}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Preferred Date</p>
                <p className="font-medium text-gray-800 flex items-center">
                  <FaCalendarAlt className="mr-1 text-gray-400" />
                  {new Date(appointment.preferredDate).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Time Slot</p>
                <p className="font-medium text-gray-800 capitalize flex items-center">
                  <FaClock className="mr-1 text-gray-400" />
                  {appointment.preferredTimeSlot}
                </p>
              </div>
            </div>

            {appointment.strawDetails?.actualQuantity && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Actual Collection</h3>
                <div className="grid md:grid-cols-3 gap-2 text-sm">
                  <p><span className="text-green-600">Quantity:</span> {appointment.strawDetails.actualQuantity} {appointment.strawDetails.quantityUnit}</p>
                  <p><span className="text-green-600">Grade:</span> {appointment.strawDetails.qualityGrade}</p>
                  <p><span className="text-green-600">Weighbridge:</span> {appointment.collectionDetails?.weighbridgeReading || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Truck Details */}
          {appointment.truckDetails?.vehicleNumber && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FaTruck className="mr-2 text-purple-600" />
                Truck Details
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Vehicle Number</p>
                  <p className="font-medium text-gray-800">{appointment.truckDetails.vehicleNumber}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Driver</p>
                  <p className="font-medium text-gray-800">{appointment.truckDetails.driverName}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Driver Phone</p>
                  <p className="font-medium text-gray-800">{appointment.truckDetails.driverPhone}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Dispatched At</p>
                  <p className="font-medium text-gray-800">
                    {new Date(appointment.truckDetails.dispatchTime).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Actions & Payment */}
        <div className="lg:col-span-1 space-y-6">
          {/* Payment Summary */}
          <div className="card bg-gradient-to-br from-green-50 to-green-100">
            <h2 className="text-lg font-semibold text-green-800 mb-4">Payment Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-green-700">Estimated</span>
                <span className="font-semibold text-green-800 flex items-center">
                  <FaRupeeSign className="text-xs" />
                  {appointment.strawDetails?.estimatedPrice?.toLocaleString('en-IN')}
                </span>
              </div>
              {appointment.paymentAmount && (
                <div className="flex justify-between">
                  <span className="text-green-700">Final Amount</span>
                  <span className="font-bold text-green-800 text-lg flex items-center">
                    <FaRupeeSign className="text-sm" />
                    {appointment.paymentAmount?.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-green-200">
                <span className="text-green-700">Payment Status</span>
                <span className={`font-medium capitalize ${
                  appointment.paymentStatus === 'completed' ? 'text-green-600' :
                  appointment.paymentStatus === 'processing' ? 'text-blue-600' : 'text-yellow-600'
                }`}>
                  {appointment.paymentStatus}
                </span>
              </div>
              {appointment.transactionId && (
                <div className="text-sm text-green-700">
                  <p>Transaction ID:</p>
                  <p className="font-mono">{appointment.transactionId}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Actions</h2>
            <div className="space-y-3">
              {appointment.status === 'pending' && (
                <>
                  <button
                    onClick={() => setActiveModal('verify')}
                    className="w-full btn-primary flex items-center justify-center"
                  >
                    <FaCheck className="mr-2" />
                    Verify Farmer
                  </button>
                  <button
                    onClick={handleReject}
                    className="w-full py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <FaTimes className="inline mr-2" />
                    Reject
                  </button>
                </>
              )}

              {appointment.status === 'verified' && (
                <button
                  onClick={() => setActiveModal('dispatch')}
                  className="w-full btn-primary bg-purple-600 hover:bg-purple-700 flex items-center justify-center"
                >
                  <FaTruck className="mr-2" />
                  Dispatch Truck
                </button>
              )}

              {appointment.status === 'truck_dispatched' && (
                <button
                  onClick={() => setActiveModal('collect')}
                  className="w-full btn-primary bg-teal-600 hover:bg-teal-700 flex items-center justify-center"
                >
                  <FaCheck className="mr-2" />
                  Mark as Collected
                </button>
              )}

              {appointment.status === 'collected' && (
                <button
                  onClick={() => setActiveModal('payment')}
                  className="w-full btn-primary bg-green-600 hover:bg-green-700 flex items-center justify-center"
                >
                  <FaRupeeSign className="mr-2" />
                  Process Payment
                </button>
              )}

              {appointment.status === 'completed' && (
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <FaCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-700 font-medium">Completed</p>
                  <p className="text-sm text-green-600">Payment processed on {new Date(appointment.paymentDate).toLocaleDateString('en-IN')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Activity Log */}
          {appointment.notifications && appointment.notifications.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Activity Log</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {appointment.notifications.map((notif, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                    <p className="text-gray-800">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notif.sentAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            {/* Verify Modal */}
            {activeModal === 'verify' && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Verify Farmer</h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Verification Notes (Optional)</label>
                    <textarea
                      value={verifyForm.verificationNotes}
                      onChange={(e) => setVerifyForm({ verificationNotes: e.target.value })}
                      className="input-field"
                      rows={3}
                      placeholder="Add any notes..."
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleVerify}
                      disabled={actionLoading}
                      className="flex-1 btn-primary"
                    >
                      {actionLoading ? 'Verifying...' : 'Verify'}
                    </button>
                    <button onClick={() => setActiveModal(null)} className="flex-1 btn-outline">
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Dispatch Truck Modal */}
            {activeModal === 'dispatch' && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Dispatch Truck</h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Vehicle Number *</label>
                    <input
                      type="text"
                      value={truckForm.vehicleNumber}
                      onChange={(e) => setTruckForm({ ...truckForm, vehicleNumber: e.target.value.toUpperCase() })}
                      className="input-field"
                      placeholder="e.g., UP32AB1234"
                    />
                  </div>
                  <div>
                    <label className="form-label">Driver Name *</label>
                    <input
                      type="text"
                      value={truckForm.driverName}
                      onChange={(e) => setTruckForm({ ...truckForm, driverName: e.target.value })}
                      className="input-field"
                      placeholder="Driver's name"
                    />
                  </div>
                  <div>
                    <label className="form-label">Driver Phone *</label>
                    <input
                      type="tel"
                      value={truckForm.driverPhone}
                      onChange={(e) => setTruckForm({ ...truckForm, driverPhone: e.target.value })}
                      className="input-field"
                      placeholder="10-digit phone number"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="form-label">Estimated Arrival</label>
                    <input
                      type="datetime-local"
                      value={truckForm.estimatedArrival}
                      onChange={(e) => setTruckForm({ ...truckForm, estimatedArrival: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleDispatchTruck}
                      disabled={actionLoading}
                      className="flex-1 btn-primary bg-purple-600 hover:bg-purple-700"
                    >
                      {actionLoading ? 'Dispatching...' : 'Dispatch'}
                    </button>
                    <button onClick={() => setActiveModal(null)} className="flex-1 btn-outline">
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Collect Modal */}
            {activeModal === 'collect' && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Record Collection</h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Actual Quantity ({appointment.strawDetails?.quantityUnit}) *</label>
                    <input
                      type="number"
                      value={collectForm.actualQuantity}
                      onChange={(e) => setCollectForm({ ...collectForm, actualQuantity: e.target.value })}
                      className="input-field"
                      placeholder="Actual collected quantity"
                    />
                  </div>
                  <div>
                    <label className="form-label">Quality Grade *</label>
                    <select
                      value={collectForm.qualityGrade}
                      onChange={(e) => setCollectForm({ ...collectForm, qualityGrade: e.target.value })}
                      className="input-field"
                    >
                      <option value="A">Grade A (Rs 220/quintal)</option>
                      <option value="B">Grade B (Rs 200/quintal)</option>
                      <option value="C">Grade C (Rs 180/quintal)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Weighbridge Reading (kg)</label>
                    <input
                      type="number"
                      value={collectForm.weighbridgeReading}
                      onChange={(e) => setCollectForm({ ...collectForm, weighbridgeReading: e.target.value })}
                      className="input-field"
                      placeholder="Weighbridge reading"
                    />
                  </div>
                  <div>
                    <label className="form-label">Collected By</label>
                    <input
                      type="text"
                      value={collectForm.collectedBy}
                      onChange={(e) => setCollectForm({ ...collectForm, collectedBy: e.target.value })}
                      className="input-field"
                      placeholder="Field officer name"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleCollect}
                      disabled={actionLoading}
                      className="flex-1 btn-primary bg-teal-600 hover:bg-teal-700"
                    >
                      {actionLoading ? 'Recording...' : 'Record Collection'}
                    </button>
                    <button onClick={() => setActiveModal(null)} className="flex-1 btn-outline">
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Payment Modal */}
            {activeModal === 'payment' && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Process Payment</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">Paying to:</p>
                    <p className="font-medium text-green-800">{appointment.farmer?.bankDetails?.accountHolderName}</p>
                    <p className="text-sm text-green-700">A/C: {appointment.farmer?.bankDetails?.accountNumber}</p>
                    <p className="text-sm text-green-700">IFSC: {appointment.farmer?.bankDetails?.ifscCode}</p>
                  </div>
                  <div>
                    <label className="form-label">Payment Amount (Rs) *</label>
                    <input
                      type="number"
                      value={paymentForm.paymentAmount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentAmount: e.target.value })}
                      className="input-field"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="form-label">Transaction ID *</label>
                    <input
                      type="text"
                      value={paymentForm.transactionId}
                      onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                      className="input-field"
                      placeholder="Bank transaction reference"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handlePayment}
                      disabled={actionLoading}
                      className="flex-1 btn-primary bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading ? 'Processing...' : 'Process Payment'}
                    </button>
                    <button onClick={() => setActiveModal(null)} className="flex-1 btn-outline">
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
