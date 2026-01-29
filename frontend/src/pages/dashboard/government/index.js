import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import DashboardLayout from '../../../components/DashboardLayout';
import { governmentAPI } from '../../../utils/api';
import toast from 'react-hot-toast';
import {
  FaBell,
  FaClipboardList,
  FaChartBar,
  FaTruck,
  FaRupeeSign,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle
} from 'react-icons/fa';

export default function GovernmentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState({ count: 0, appointments: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    } else if (user?.userType !== 'government') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.userType === 'government') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [statsRes, notifRes] = await Promise.all([
        governmentAPI.getStats(),
        governmentAPI.getNotifications()
      ]);
      setStats(statsRes.data);
      setNotifications(notifRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusCount = (statusName) => {
    if (!stats?.stats) return 0;
    const stat = stats.stats.find(s => s._id === statusName);
    return stat?.count || 0;
  };

  const getTotalQuantity = () => {
    if (!stats?.stats) return 0;
    return stats.stats.reduce((sum, s) => sum + (s.totalQuantity || 0), 0);
  };

  const getTotalAmount = () => {
    if (!stats?.stats) return 0;
    return stats.stats.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
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
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome, {user.name}!</h1>
        <p className="opacity-90">
          NTPC Biomass Collection Portal - Manage farmer appointments and straw collection
        </p>
      </div>

      {/* Notification Alert */}
      {notifications.count > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <FaBell className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-3 animate-pulse" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                {notifications.count} new booking{notifications.count > 1 ? 's' : ''} pending review
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Click to view and process appointments</p>
            </div>
          </div>
          <Link href="/dashboard/government/bookings" className="btn-primary bg-yellow-600 hover:bg-yellow-700">
            View Bookings
          </Link>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center">
              <FaClock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{getStatusCount('pending')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
              <FaTruck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{getStatusCount('truck_dispatched')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Transit</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
              <FaCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{getStatusCount('completed')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
              <FaRupeeSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{(getTotalAmount() / 100000).toFixed(1)}L</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Link href="/dashboard/government/bookings">
          <div className="card hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                <FaClipboardList className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">Manage Bookings</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">View and process appointments</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/government/routes">
          <div className="card hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-green-500">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                <FaTruck className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">Route Planning</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Optimize collection routes</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/government/statistics">
          <div className="card hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-500">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                <FaChartBar className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">Statistics</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">View reports and analytics</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Notifications */}
      {notifications.appointments.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Bookings</h2>
            <Link href="/dashboard/government/bookings" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {notifications.appointments.slice(0, 5).map((apt) => (
              <div key={apt._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FaExclamationCircle className="text-yellow-500 dark:text-yellow-400" />
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{apt.farmer?.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {apt.farm?.location?.district}, {apt.farm?.location?.state} - {apt.strawDetails?.quantity} {apt.strawDetails?.quantityUnit}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/government/bookings/${apt._id}`}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* State-wise Distribution */}
      {stats?.stateWise && stats.stateWise.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">State-wise Distribution</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.stateWise.slice(0, 6).map((state) => (
              <div key={state._id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FaMapMarkerAlt className="text-gray-400 dark:text-gray-500 mr-2" />
                    <span className="font-medium text-gray-800 dark:text-white">{state._id || 'Unknown'}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{state.count} bookings</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total: {state.totalQuantity} quintals
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Collection Workflow</h3>
        <div className="grid md:grid-cols-5 gap-4 text-center text-sm">
          <div className="p-2 bg-white dark:bg-gray-800 rounded">
            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="font-bold text-yellow-600 dark:text-yellow-400">1</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300">New Booking</p>
          </div>
          <div className="p-2 bg-white dark:bg-gray-800 rounded">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="font-bold text-blue-600 dark:text-blue-400">2</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300">Verify Farmer</p>
          </div>
          <div className="p-2 bg-white dark:bg-gray-800 rounded">
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">3</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300">Dispatch Truck</p>
          </div>
          <div className="p-2 bg-white dark:bg-gray-800 rounded">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="font-bold text-green-600 dark:text-green-400">4</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300">Collect Straw</p>
          </div>
          <div className="p-2 bg-white dark:bg-gray-800 rounded">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="font-bold text-purple-600 dark:text-purple-400">5</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300">Process Payment</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
