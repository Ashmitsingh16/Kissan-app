import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import DashboardLayout from '../../../components/DashboardLayout';
import { appointmentAPI } from '../../../utils/api';
import toast from 'react-hot-toast';
import {
  FaCalendarAlt,
  FaPlus,
  FaMapMarkerAlt,
  FaClock,
  FaRupeeSign,
  FaTimes,
  FaEye
} from 'react-icons/fa';

export default function Appointments() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const fetchAppointments = async () => {
    try {
      const response = await appointmentAPI.getAll();
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      await appointmentAPI.cancel(appointmentId);
      setAppointments(appointments.map(apt =>
        apt._id === appointmentId ? { ...apt, status: 'cancelled' } : apt
      ));
      toast.success('Appointment cancelled');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  const filteredAppointments = filter === 'all'
    ? appointments
    : appointments.filter(apt => apt.status === filter);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300';
      case 'approved': return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
      case 'completed': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300';
      case 'rejected': return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
      case 'cancelled': return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 dark:text-yellow-400';
      case 'processing': return 'text-blue-600 dark:text-blue-400';
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'failed': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Straw Selling Appointments</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your straw collection appointments</p>
        </div>
        {user.userType === 'farmer' && (
          <Link href="/dashboard/appointments/new" className="btn-primary mt-4 sm:mt-0 inline-flex items-center">
            <FaPlus className="mr-2" />
            Book New Appointment
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'pending', 'approved', 'completed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredAppointments.length > 0 ? (
        <div className="space-y-4">
          {filteredAppointments.map((apt) => (
            <div key={apt._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                {/* Left Side - Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {apt.farm?.farmName || 'N/A'}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mt-1">
                        <FaMapMarkerAlt className="mr-1 text-gray-400 dark:text-gray-500" />
                        {apt.farm?.location?.district}, {apt.farm?.location?.state}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(apt.status)}`}>
                      {apt.status}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Crop Type</span>
                      <p className="font-medium text-gray-800 dark:text-white">{apt.strawDetails?.cropType}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Quantity</span>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {apt.strawDetails?.quantity} {apt.strawDetails?.quantityUnit}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Preferred Date</span>
                      <p className="font-medium text-gray-800 dark:text-white flex items-center">
                        <FaCalendarAlt className="mr-1 text-gray-400 dark:text-gray-500" />
                        {new Date(apt.preferredDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Time Slot</span>
                      <p className="font-medium text-gray-800 dark:text-white flex items-center capitalize">
                        <FaClock className="mr-1 text-gray-400 dark:text-gray-500" />
                        {apt.preferredTimeSlot}
                      </p>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Estimated Amount: </span>
                      <span className="font-semibold text-gray-800 dark:text-white flex items-center inline-flex">
                        <FaRupeeSign className="text-gray-600 dark:text-gray-400" />
                        {apt.strawDetails?.estimatedPrice?.toLocaleString('en-IN') || 'N/A'}
                      </span>
                    </div>
                    {apt.paymentAmount && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Final Amount: </span>
                        <span className="font-semibold text-green-600 dark:text-green-400 flex items-center inline-flex">
                          <FaRupeeSign />
                          {apt.paymentAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Payment Status: </span>
                      <span className={`font-medium capitalize ${getPaymentStatusColor(apt.paymentStatus)}`}>
                        {apt.paymentStatus}
                      </span>
                    </div>
                    {apt.transactionId && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Transaction ID: </span>
                        <span className="font-mono text-gray-800 dark:text-gray-200">{apt.transactionId}</span>
                      </div>
                    )}
                  </div>

                  {apt.remarks && (
                    <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Remarks: </span>
                      <span className="text-gray-700 dark:text-gray-300">{apt.remarks}</span>
                    </div>
                  )}
                </div>

                {/* Right Side - Actions */}
                <div className="mt-4 lg:mt-0 lg:ml-6 flex lg:flex-col gap-2">
                  <Link
                    href={`/dashboard/appointments/${apt._id}`}
                    className="btn-outline text-sm flex items-center justify-center"
                  >
                    <FaEye className="mr-1" />
                    View
                  </Link>
                  {apt.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(apt._id)}
                      className="text-sm px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-center"
                    >
                      <FaTimes className="mr-1" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <FaCalendarAlt className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">No Appointments Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {filter === 'all'
              ? "You haven't booked any straw selling appointments yet"
              : `No ${filter} appointments found`}
          </p>
          {user.userType === 'farmer' && filter === 'all' && (
            <Link href="/dashboard/appointments/new" className="btn-primary inline-block">
              Book Your First Appointment
            </Link>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
