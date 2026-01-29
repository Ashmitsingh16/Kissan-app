import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import DashboardLayout from '../../../../components/DashboardLayout';
import { governmentAPI, notificationsAPI } from '../../../../utils/api';
import toast from 'react-hot-toast';
import {
  FaEye,
  FaCheck,
  FaTruck,
  FaRupeeSign,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaFilter,
  FaBell,
  FaClipboard,
  FaSms,
  FaUsers,
  FaPaperPlane,
  FaTimes
} from 'react-icons/fa';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  verified: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  truck_dispatched: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  collected: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
};

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const messageTemplates = [
  { name: 'Collection Reminder', message: 'Kisan App: Reminder - Our truck will arrive tomorrow for straw collection. Please keep the straw ready.' },
  { name: 'Weather Alert', message: 'Kisan App: Weather Alert - Rain expected in your area. Please cover your straw to avoid moisture damage.' },
  { name: 'Payment Update', message: 'Kisan App: Payments for recent straw collections are being processed and will be credited within 3-5 working days.' },
];

export default function GovernmentBookings() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('bookings');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    state: ''
  });

  // Bulk SMS state
  const [bulkForm, setBulkForm] = useState({ filterByState: '', message: '' });
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsResults, setSmsResults] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    } else if (user?.userType !== 'government') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.userType === 'government') {
      fetchAppointments();
    }
  }, [user, filters]);

  const fetchAppointments = async () => {
    try {
      const response = await governmentAPI.getAllAppointments(filters);
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (appointmentId, action) => {
    try {
      switch (action) {
        case 'verify':
          await governmentAPI.verifyAppointment(appointmentId, { verificationNotes: 'Verified by officer' });
          toast.success('Appointment verified');
          break;
        case 'approve':
          await governmentAPI.updateStatus(appointmentId, { status: 'approved' });
          toast.success('Appointment approved');
          break;
        case 'reject':
          await governmentAPI.updateStatus(appointmentId, { status: 'rejected', remarks: 'Rejected by officer' });
          toast.success('Appointment rejected');
          break;
      }
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    }
  };

  const markAllAsRead = async () => {
    try {
      await governmentAPI.markAsRead();
      toast.success('All marked as read');
      fetchAppointments();
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleBulkSMS = async (e) => {
    e.preventDefault();
    setSmsLoading(true);
    setSmsResults(null);
    try {
      const response = await notificationsAPI.sendBulkSMS({
        message: bulkForm.message,
        filterByState: bulkForm.filterByState || undefined
      });
      setSmsResults(response.data);
      toast.success(`Bulk SMS sent: ${response.data.successful} successful`);
      setBulkForm({ ...bulkForm, message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send bulk SMS');
    } finally {
      setSmsLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const unreadCount = appointments.filter(a => !a.isRead).length;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Bookings & Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage appointments and send notifications to farmers</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="mt-4 md:mt-0 btn-outline flex items-center">
            <FaBell className="mr-2" />
            Mark All Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'bookings'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <FaClipboard /> Bookings ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <FaSms /> Send Bulk SMS
          </button>
        </nav>
      </div>

      {activeTab === 'bookings' ? (
        <>
          {/* Filters */}
          <div className="card mb-6">
            <div className="flex items-center mb-4">
              <FaFilter className="text-gray-400 dark:text-gray-500 mr-2" />
              <span className="font-medium text-gray-700 dark:text-gray-200">Filters</span>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="input-field"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="verified">Verified</option>
                  <option value="truck_dispatched">Truck Dispatched</option>
                  <option value="collected">Collected</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="form-label">State</label>
                <select
                  value={filters.state}
                  onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                  className="input-field"
                >
                  <option value="">All States</option>
                  {indianStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ status: 'all', state: '' })}
                  className="btn-outline"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Showing {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
          </p>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.map((apt) => (
                <div
                  key={apt._id}
                  className={`card hover:shadow-lg transition-shadow ${!apt.isRead ? 'border-l-4 border-yellow-500' : ''}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                    {/* Main Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{apt.farmer?.name}</h3>
                            {!apt.isRead && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 text-xs rounded-full">NEW</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{apt.farm?.farmName}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[apt.status]}`}>
                          {apt.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Contact & Location */}
                      <div className="grid md:grid-cols-2 gap-3 text-sm mb-3">
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                          <FaPhone className="mr-2 text-gray-400 dark:text-gray-500" />
                          {apt.farmer?.phone}
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                          <FaEnvelope className="mr-2 text-gray-400 dark:text-gray-500" />
                          {apt.farmer?.email}
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-300 md:col-span-2">
                          <FaMapMarkerAlt className="mr-2 text-gray-400 dark:text-gray-500" />
                          {apt.farm?.location?.village ? `${apt.farm.location.village}, ` : ''}
                          {apt.farm?.location?.district}, {apt.farm?.location?.state}
                        </div>
                      </div>

                      {/* Straw Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Crop</span>
                          <p className="font-medium text-gray-800 dark:text-white">{apt.strawDetails?.cropType}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Quantity</span>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {apt.strawDetails?.quantity} {apt.strawDetails?.quantityUnit}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Date</span>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {new Date(apt.preferredDate).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Est. Amount</span>
                          <p className="font-medium text-green-600 dark:text-green-400 flex items-center">
                            <FaRupeeSign className="text-xs" />
                            {apt.strawDetails?.estimatedPrice?.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-wrap lg:flex-col gap-2">
                      <Link
                        href={`/dashboard/government/bookings/${apt._id}`}
                        className="btn-primary text-sm flex items-center justify-center"
                      >
                        <FaEye className="mr-1" />
                        View Details
                      </Link>

                      {apt.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleQuickAction(apt._id, 'verify')}
                            className="btn-outline text-sm flex items-center justify-center text-green-600 border-green-600 hover:bg-green-600 hover:text-white dark:text-green-400 dark:border-green-400"
                          >
                            <FaCheck className="mr-1" />
                            Verify
                          </button>
                          <button
                            onClick={() => handleQuickAction(apt._id, 'reject')}
                            className="text-sm px-4 py-2 border border-red-300 dark:border-red-500 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {apt.status === 'verified' && (
                        <Link
                          href={`/dashboard/government/bookings/${apt._id}?action=dispatch`}
                          className="btn-outline text-sm flex items-center justify-center text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white dark:text-blue-400 dark:border-blue-400"
                        >
                          <FaTruck className="mr-1" />
                          Dispatch Truck
                        </Link>
                      )}

                      {apt.status === 'collected' && (
                        <Link
                          href={`/dashboard/government/bookings/${apt._id}?action=payment`}
                          className="btn-outline text-sm flex items-center justify-center text-green-600 border-green-600 hover:bg-green-600 hover:text-white dark:text-green-400 dark:border-green-400"
                        >
                          <FaRupeeSign className="mr-1" />
                          Process Payment
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <FaClipboard className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">No Appointments Found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filters.status !== 'all' || filters.state
                  ? 'Try adjusting your filters'
                  : 'No straw collection appointments have been made yet'}
              </p>
            </div>
          )}
        </>
      ) : (
        /* Bulk SMS Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Send Bulk SMS to Farmers</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Send SMS notifications to multiple farmers filtered by location
              </p>

              <form onSubmit={handleBulkSMS} className="space-y-4">
                <div>
                  <label className="form-label">Filter by State</label>
                  <select
                    value={bulkForm.filterByState}
                    onChange={(e) => setBulkForm({ ...bulkForm, filterByState: e.target.value })}
                    className="input-field"
                  >
                    <option value="">All States</option>
                    {indianStates.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Message *</label>
                  <textarea
                    value={bulkForm.message}
                    onChange={(e) => setBulkForm({ ...bulkForm, message: e.target.value })}
                    placeholder="Enter your message..."
                    rows={4}
                    className="input-field"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {bulkForm.message.length}/160 characters
                  </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Warning:</strong> Bulk SMS will be sent to all farmers matching the filter criteria.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={smsLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600"
                >
                  <FaPaperPlane />
                  {smsLoading ? 'Sending...' : 'Send Bulk SMS'}
                </button>
              </form>

              {smsResults && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Results</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{smsResults.total}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{smsResults.successful}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Successful</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{smsResults.failed}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Templates Sidebar */}
          <div className="card h-fit">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Templates</h3>
            <div className="space-y-3">
              {messageTemplates.map((template, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setBulkForm({ ...bulkForm, message: template.message })}
                  className="w-full text-left p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{template.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{template.message}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
