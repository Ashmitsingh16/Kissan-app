import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { farmAPI, appointmentAPI } from '../../utils/api';
import {
  FaTractor,
  FaPlus,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaSeedling,
  FaMapMarkerAlt,
  FaArrowRight
} from 'react-icons/fa';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [farms, setFarms] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.userType === 'farmer') {
      fetchFarmerData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchFarmerData = async () => {
    try {
      const [farmsRes, appointmentsRes] = await Promise.all([
        farmAPI.getAll(),
        appointmentAPI.getAll()
      ]);
      setFarms(farmsRes.data);
      setAppointments(appointmentsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const pendingAppointments = appointments.filter(a => a.status === 'pending').length;
  const approvedAppointments = appointments.filter(a => a.status === 'approved').length;
  const completedAppointments = appointments.filter(a => a.status === 'completed').length;

  // Calculate total crops across all farms
  const totalCrops = farms.reduce((sum, farm) => sum + (farm.crops?.length || 0), 0);

  return (
    <DashboardLayout>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 text-white">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Welcome back, {user.name}!</h1>
        <p className="opacity-90 text-sm sm:text-base">
          {user.userType === 'farmer'
            ? 'Manage your farms, track crops, and sell straw all in one place.'
            : 'Manage farmer appointments and process straw collections.'}
        </p>
      </div>

      {user.userType === 'farmer' ? (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="card">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FaTractor className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">{farms.length}</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Total Farms</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FaSeedling className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">{totalCrops}</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Active Crops</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FaCalendarAlt className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">{pendingAppointments}</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Pending</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FaMoneyBillWave className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">{completedAppointments}</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Completed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
            <Link href="/dashboard/farms/new">
              <div className="card hover:shadow-lg dark:hover:shadow-primary-900/20 transition-shadow cursor-pointer border-2 border-dashed border-primary-300 dark:border-primary-700 hover:border-primary-500">
                <div className="flex items-center justify-center space-x-3 py-2 sm:py-4">
                  <FaPlus className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-400" />
                  <span className="text-base sm:text-lg font-semibold text-primary-600 dark:text-primary-400">Register New Farm</span>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/appointments/new">
              <div className="card hover:shadow-lg dark:hover:shadow-secondary-900/20 transition-shadow cursor-pointer border-2 border-dashed border-secondary-300 dark:border-secondary-700 hover:border-secondary-500">
                <div className="flex items-center justify-center space-x-3 py-2 sm:py-4">
                  <FaCalendarAlt className="h-5 w-5 sm:h-6 sm:w-6 text-secondary-600 dark:text-secondary-400" />
                  <span className="text-base sm:text-lg font-semibold text-secondary-600 dark:text-secondary-400">Book Straw Selling</span>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/bank-details" className="sm:col-span-2 lg:col-span-1">
              <div className="card hover:shadow-lg dark:hover:shadow-blue-900/20 transition-shadow cursor-pointer border-2 border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-500">
                <div className="flex items-center justify-center space-x-3 py-2 sm:py-4">
                  <FaMoneyBillWave className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                  <span className="text-base sm:text-lg font-semibold text-blue-600 dark:text-blue-400">Update Bank Details</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Farms */}
          {farms.length > 0 && (
            <div className="card mb-4 sm:mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Your Farms</h2>
                <Link href="/dashboard/farms" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center space-x-1 text-sm sm:text-base">
                  <span>View All</span>
                  <FaArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {farms.slice(0, 3).map((farm) => (
                  <Link key={farm._id} href={`/dashboard/farms/${farm._id}`}>
                    <div className="p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors cursor-pointer bg-white dark:bg-gray-800">
                      <h3 className="font-semibold text-gray-800 dark:text-white mb-2 truncate">{farm.farmName}</h3>
                      <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <FaMapMarkerAlt className="mr-2 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="truncate">{farm.location?.district}, {farm.location?.state}</span>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <FaSeedling className="mr-2 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span>{farm.crops?.length || 0} crops | {farm.totalArea} {farm.areaUnit}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Appointments */}
          {appointments.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Recent Appointments</h2>
                <Link href="/dashboard/appointments" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center space-x-1 text-sm sm:text-base">
                  <span>View All</span>
                  <FaArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Link>
              </div>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">Farm</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hidden sm:table-cell">Quantity</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">Date</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {appointments.slice(0, 5).map((apt) => (
                        <tr key={apt._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-800 dark:text-gray-200">{apt.farm?.farmName || 'N/A'}</td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                            {apt.strawDetails?.quantity} {apt.strawDetails?.quantityUnit}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            {new Date(apt.preferredDate).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' :
                              apt.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                              apt.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                              apt.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {apt.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {farms.length === 0 && !loading && (
            <div className="card text-center py-8 sm:py-12">
              <FaTractor className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Farms Registered Yet</h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6">Start by registering your first farm to begin tracking your crops</p>
              <Link href="/dashboard/farms/new" className="btn-primary inline-block">
                Register Your First Farm
              </Link>
            </div>
          )}
        </>
      ) : (
        /* Government Dashboard */
        <div className="card">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-4">Government Officer Dashboard</h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Welcome to the government portal. Here you can manage farmer appointments and process straw collections.
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/dashboard/appointments">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors cursor-pointer bg-white dark:bg-gray-800">
                <FaCalendarAlt className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 dark:text-primary-400 mb-2" />
                <h3 className="font-semibold text-gray-800 dark:text-white">Manage Appointments</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">View and approve farmer straw selling appointments</p>
              </div>
            </Link>
            <Link href="/dashboard/government/statistics">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors cursor-pointer bg-white dark:bg-gray-800">
                <FaMoneyBillWave className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400 mb-2" />
                <h3 className="font-semibold text-gray-800 dark:text-white">Statistics</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">View collection and payment statistics</p>
              </div>
            </Link>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
