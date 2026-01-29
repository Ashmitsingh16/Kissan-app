import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { analyticsAPI } from '../../../utils/api';
import {
  FaUsers,
  FaTractor,
  FaCalendarCheck,
  FaRupeeSign,
  FaDownload,
  FaChartBar,
  FaMapMarkerAlt,
  FaTruck,
  FaLeaf
} from 'react-icons/fa';

export default function Statistics() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [collectionData, setCollectionData] = useState(null);
  const [strawData, setStrawData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [groupBy, setGroupBy] = useState('state');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [overviewRes, locationRes, collectionRes, strawRes, paymentRes] = await Promise.all([
        analyticsAPI.getOverview(dateRange),
        analyticsAPI.getByLocation({ groupBy }),
        analyticsAPI.getCollectionPerformance(dateRange),
        analyticsAPI.getStrawTypes(),
        analyticsAPI.getPaymentSummary(dateRange)
      ]);

      setOverview(overviewRes.data);
      setLocationData(locationRes.data);
      setCollectionData(collectionRes.data);
      setStrawData(strawRes.data);
      setPaymentData(paymentRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      const response = await analyticsAPI.exportData(type, dateRange);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export data');
    }
  };

  const StatCard = ({ icon: Icon, label, value, subValue, color = 'green' }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subValue && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon className={`text-${color}-600 dark:text-${color}-400 text-xl`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Reports</h1>
            <p className="text-gray-600 dark:text-gray-400">Comprehensive statistics for straw collection operations</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('appointments')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FaDownload />
              Export Appointments
            </button>
            <button
              onClick={() => handleExport('farmers')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FaDownload />
              Export Farmers
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Date Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-44 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-44 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={fetchAllData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply Filter
            </button>
            <button
              onClick={() => {
                setDateRange({ startDate: '', endDate: '' });
                fetchAllData();
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              icon={FaUsers}
              label="Total Farmers"
              value={overview.overview.totalFarmers.toLocaleString()}
              color="blue"
            />
            <StatCard
              icon={FaTractor}
              label="Registered Farms"
              value={overview.overview.totalFarms.toLocaleString()}
              color="green"
            />
            <StatCard
              icon={FaCalendarCheck}
              label="Total Appointments"
              value={overview.overview.totalAppointments.toLocaleString()}
              color="purple"
            />
            <StatCard
              icon={FaLeaf}
              label="Straw Collected"
              value={`${overview.overview.totalStrawCollected.toLocaleString()} Q`}
              subValue="quintals"
              color="yellow"
            />
            <StatCard
              icon={FaRupeeSign}
              label="Payments Processed"
              value={`Rs. ${overview.overview.totalPaymentProcessed.toLocaleString()}`}
              color="green"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: FaChartBar },
              { id: 'location', label: 'By Location', icon: FaMapMarkerAlt },
              { id: 'collection', label: 'Collection', icon: FaTruck },
              { id: 'payments', label: 'Payments', icon: FaRupeeSign },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <tab.icon />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && overview && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appointment Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appointments by Status</h3>
              <div className="space-y-3">
                {Object.entries(overview.appointmentsByStatus).map(([status, data]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          status === 'collected'
                            ? 'bg-green-500'
                            : status === 'pending'
                            ? 'bg-yellow-500'
                            : status === 'rejected'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                        }`}
                      ></span>
                      <span className="capitalize">{status.replace('_', ' ')}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{data.count}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">({data.quantity || 0} units)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Trend</h3>
              <div className="space-y-2">
                {overview.monthlyTrend.map((month) => (
                  <div key={month.month} className="flex items-center gap-4">
                    <span className="w-20 text-sm text-gray-600 dark:text-gray-400">{month.month}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 relative">
                      <div
                        className="bg-blue-500 h-4 rounded-full"
                        style={{
                          width: `${Math.min(
                            (month.appointments / Math.max(...overview.monthlyTrend.map((m) => m.appointments))) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="w-16 text-right text-sm font-medium">{month.appointments}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Straw Types */}
            {strawData && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Straw Types</h3>
                <div className="space-y-3">
                  {strawData.byStrawType.map((straw) => (
                    <div key={straw.type} className="flex items-center justify-between border-b pb-2">
                      <span className="capitalize">{straw.type}</span>
                      <div className="text-right">
                        <span className="font-medium">{straw.totalQuantity} Q</span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">({straw.appointments} bookings)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Distribution */}
            {strawData && Object.keys(strawData.byQualityGrade).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quality Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(strawData.byQualityGrade).map(([grade, data]) => (
                    <div key={grade} className="flex items-center justify-between">
                      <span className="capitalize">Grade {grade}</span>
                      <div className="text-right">
                        <span className="font-medium">{data.quantity} Q</span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">({data.count} collections)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'location' && locationData && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setGroupBy('state');
                  analyticsAPI.getByLocation({ groupBy: 'state' }).then((res) => setLocationData(res.data));
                }}
                className={`px-4 py-2 rounded-lg ${
                  groupBy === 'state' ? 'bg-blue-600 text-white' : 'border border-gray-300'
                }`}
              >
                By State
              </button>
              <button
                onClick={() => {
                  setGroupBy('district');
                  analyticsAPI.getByLocation({ groupBy: 'district' }).then((res) => setLocationData(res.data));
                }}
                className={`px-4 py-2 rounded-lg ${
                  groupBy === 'district' ? 'bg-blue-600 text-white' : 'border border-gray-300'
                }`}
              >
                By District
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Farm Distribution */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Farm Distribution</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {locationData.farmDistribution.map((loc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                      <span className="text-gray-700 dark:text-gray-300">{loc.location}</span>
                      <div className="text-right">
                        <span className="font-medium">{loc.farmCount} farms</span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">({loc.totalArea} acres)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Appointment Distribution */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appointment Distribution</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {locationData.appointmentDistribution.map((loc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                      <span className="text-gray-700 dark:text-gray-300">{loc.location}</span>
                      <div className="text-right">
                        <span className="font-medium">{loc.totalAppointments}</span>
                        <span className="text-green-600 text-sm ml-2">({loc.collected} collected)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'collection' && collectionData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Route Statistics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Route Statistics</h3>
              <div className="space-y-3">
                {Object.entries(collectionData.routesByStatus).map(([status, data]) => (
                  <div key={status} className="border-b pb-3">
                    <div className="flex items-center justify-between">
                      <span className="capitalize font-medium">{status.replace('_', ' ')}</span>
                      <span className="text-lg font-bold">{data.count} routes</span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {data.totalStops} stops | {data.totalQuantity} Q | {data.totalDistance} km
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Averages */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Averages</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{collectionData.averages.stopsPerRoute}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Stops/Route</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{collectionData.averages.quantityPerRoute} Q</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Quantity/Route</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{collectionData.averages.distancePerRoute} km</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Distance/Route</p>
                </div>
              </div>
            </div>

            {/* Daily Collection Trend */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Collection Trend</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Date</th>
                      <th className="text-right py-2">Routes</th>
                      <th className="text-right py-2">Stops</th>
                      <th className="text-right py-2">Quantity (Q)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectionData.dailyTrend.map((day) => (
                      <tr key={day._id} className="border-b">
                        <td className="py-2">{day._id}</td>
                        <td className="text-right">{day.routes}</td>
                        <td className="text-right">{day.stops}</td>
                        <td className="text-right">{day.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && paymentData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Status</h3>
              <div className="space-y-3">
                {Object.entries(paymentData.byStatus).map(([status, data]) => (
                  <div key={status} className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          status === 'completed' ? 'bg-green-500' : status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`}
                      ></span>
                      <span className="capitalize">{status}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">Rs. {data.amount.toLocaleString()}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">({data.count} payments)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Methods</h3>
              <div className="space-y-3">
                {Object.entries(paymentData.byMethod).map(([method, data]) => (
                  <div key={method} className="flex items-center justify-between border-b pb-2">
                    <span className="capitalize">{method.replace('_', ' ')}</span>
                    <div className="text-right">
                      <span className="font-medium">Rs. {data.amount.toLocaleString()}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">({data.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Payment Trend */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Payment Trend</h3>
              <div className="space-y-2">
                {paymentData.monthlyTrend.map((month) => (
                  <div key={month.month} className="flex items-center gap-4">
                    <span className="w-20 text-sm text-gray-600 dark:text-gray-400">{month.month}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-6 relative">
                      <div
                        className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.min(
                            (month.amount / Math.max(...paymentData.monthlyTrend.map((m) => m.amount), 1)) * 100,
                            100
                          )}%`,
                        }}
                      >
                        <span className="text-xs text-white font-medium">
                          Rs. {month.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className="w-16 text-right text-sm text-gray-500 dark:text-gray-400">{month.payments} payments</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
