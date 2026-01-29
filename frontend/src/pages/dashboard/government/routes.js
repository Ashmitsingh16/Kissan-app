import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/DashboardLayout';
import { mapsAPI, governmentAPI } from '../../../utils/api';

const DEPOT_LOCATIONS = {
  'Uttar Pradesh': { name: 'NTPC Dadri', latitude: 28.5494, longitude: 77.5550 },
  'Punjab': { name: 'NTPC Bathinda', latitude: 30.2110, longitude: 74.9455 },
  'Haryana': { name: 'NTPC Faridabad', latitude: 28.4089, longitude: 77.3178 },
  'Rajasthan': { name: 'NTPC Kota', latitude: 25.2138, longitude: 75.8648 },
  'Madhya Pradesh': { name: 'NTPC Vindhyachal', latitude: 24.0883, longitude: 82.6588 },
  'Bihar': { name: 'NTPC Barh', latitude: 25.4833, longitude: 85.7167 },
  'West Bengal': { name: 'NTPC Farakka', latitude: 24.8167, longitude: 87.9167 },
};

const STATES = Object.keys(DEPOT_LOCATIONS);

export default function RoutePlanning() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('plan'); // plan, routes
  const [farms, setFarms] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [selectedFarms, setSelectedFarms] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [filters, setFilters] = useState({
    state: '',
    district: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [truckDetails, setTruckDetails] = useState({
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    capacity: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchFarms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await mapsAPI.getPendingFarms(filters);
      setFarms(response.data.farms || []);
    } catch (error) {
      console.error('Error fetching farms:', error);
      setError('Failed to fetch farms');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchRoutes = useCallback(async () => {
    try {
      const response = await mapsAPI.getRoutes({ date: filters.date });
      setRoutes(response.data || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  }, [filters.date]);

  useEffect(() => {
    if (activeTab === 'plan') {
      fetchFarms();
    } else {
      fetchRoutes();
    }
  }, [activeTab, fetchFarms, fetchRoutes]);

  const toggleFarmSelection = (farm) => {
    setSelectedFarms((prev) => {
      const isSelected = prev.find((f) => f.appointmentId === farm.appointmentId);
      if (isSelected) {
        return prev.filter((f) => f.appointmentId !== farm.appointmentId);
      } else {
        return [...prev, farm];
      }
    });
    setOptimizedRoute(null);
  };

  const selectAllFarms = () => {
    const farmsWithCoords = farms.filter((f) => f.coordinates?.latitude);
    setSelectedFarms(farmsWithCoords);
    setOptimizedRoute(null);
  };

  const clearSelection = () => {
    setSelectedFarms([]);
    setOptimizedRoute(null);
  };

  const optimizeRoute = async () => {
    if (selectedFarms.length === 0) {
      setError('Please select at least one farm');
      return;
    }

    if (!filters.state) {
      setError('Please select a state for depot location');
      return;
    }

    try {
      setOptimizing(true);
      setError('');
      const response = await mapsAPI.optimizeRoute({
        appointmentIds: selectedFarms.map((f) => f.appointmentId),
        depotState: filters.state,
      });
      setOptimizedRoute(response.data);
      setSuccess('Route optimized successfully!');
    } catch (error) {
      console.error('Error optimizing route:', error);
      setError(error.response?.data?.message || 'Failed to optimize route');
    } finally {
      setOptimizing(false);
    }
  };

  const createRoute = async () => {
    if (!truckDetails.vehicleNumber || !truckDetails.driverName || !truckDetails.driverPhone) {
      setError('Please fill in all truck details');
      return;
    }

    try {
      setLoading(true);
      await mapsAPI.createCollectionRoute({
        routeDate: filters.date,
        appointmentIds: selectedFarms.map((f) => f.appointmentId),
        truckDetails,
        depotState: filters.state,
      });
      setSuccess('Collection route created successfully!');
      setShowCreateModal(false);
      setSelectedFarms([]);
      setOptimizedRoute(null);
      setTruckDetails({ vehicleNumber: '', driverName: '', driverPhone: '', capacity: '' });
      fetchFarms();
      fetchRoutes();
    } catch (error) {
      console.error('Error creating route:', error);
      setError(error.response?.data?.message || 'Failed to create route');
    } finally {
      setLoading(false);
    }
  };

  const startRoute = async (routeId) => {
    try {
      await mapsAPI.startRoute(routeId);
      setSuccess('Route started! Trucks have been dispatched.');
      fetchRoutes();
    } catch (error) {
      console.error('Error starting route:', error);
      setError('Failed to start route');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      planned: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
      in_progress: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
      completed: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
      cancelled: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
    };
    return badges[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Route Planning</h1>
            <p className="text-gray-600 dark:text-gray-400">Plan and manage straw collection routes</p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
            {error}
            <button onClick={() => setError('')} className="float-right">&times;</button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
            {success}
            <button onClick={() => setSuccess('')} className="float-right">&times;</button>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('plan')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'plan'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Plan New Route
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'routes'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Existing Routes
            </button>
          </nav>
        </div>

        {activeTab === 'plan' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Filters & Farm List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Filters */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      State (Depot Location)
                    </label>
                    <select
                      value={filters.state}
                      onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">All States</option>
                      {STATES.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">District</label>
                    <input
                      type="text"
                      value={filters.district}
                      onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                      placeholder="Enter district"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                    <input
                      type="date"
                      value={filters.date}
                      onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={fetchFarms}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Search Farms
                  </button>
                  <button
                    onClick={selectAllFarms}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearSelection}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Farm List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Available Farms ({farms.length})
                    {selectedFarms.length > 0 && (
                      <span className="ml-2 text-green-600 dark:text-green-400">
                        ({selectedFarms.length} selected)
                      </span>
                    )}
                  </h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading farms...</div>
                  ) : farms.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">No farms found</div>
                  ) : (
                    farms.map((farm) => {
                      const isSelected = selectedFarms.find(
                        (f) => f.appointmentId === farm.appointmentId
                      );
                      const hasCoords = farm.coordinates?.latitude;
                      return (
                        <div
                          key={farm.appointmentId}
                          className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                            isSelected ? 'bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500' : ''
                          } ${!hasCoords ? 'opacity-50' : ''}`}
                          onClick={() => hasCoords && toggleFarmSelection(farm)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{farm.farmName}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {farm.farmerName} - {farm.farmerPhone}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-500">
                                {farm.location?.village}, {farm.location?.district},{' '}
                                {farm.location?.state}
                              </p>
                              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                Quantity: {farm.quantity} {farm.quantityUnit}
                              </p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`inline-block px-2 py-1 text-xs rounded-full ${
                                  hasCoords
                                    ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                                    : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                                }`}
                              >
                                {hasCoords ? 'GPS Ready' : 'No GPS'}
                              </span>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(farm.preferredDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Route Summary & Actions */}
            <div className="space-y-6">
              {/* Depot Info */}
              {filters.state && DEPOT_LOCATIONS[filters.state] && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Depot Location</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="font-medium text-gray-800 dark:text-gray-200">{DEPOT_LOCATIONS[filters.state].name}</p>
                    <p>
                      Lat: {DEPOT_LOCATIONS[filters.state].latitude.toFixed(4)}, Lng:{' '}
                      {DEPOT_LOCATIONS[filters.state].longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
              )}

              {/* Selection Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Selection Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Selected Farms:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedFarms.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Quantity:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedFarms
                        .reduce((sum, f) => {
                          let qty = f.quantity || 0;
                          if (f.quantityUnit === 'kg') qty = qty / 100;
                          if (f.quantityUnit === 'ton') qty = qty * 10;
                          return sum + qty;
                        }, 0)
                        .toFixed(1)}{' '}
                      quintals
                    </span>
                  </div>
                </div>
                <button
                  onClick={optimizeRoute}
                  disabled={selectedFarms.length === 0 || optimizing || !filters.state}
                  className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {optimizing ? 'Optimizing...' : 'Optimize Route'}
                </button>
              </div>

              {/* Optimized Route Results */}
              {optimizedRoute && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Optimized Route</h3>
                  <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Distance:</span>
                          <p className="font-semibold text-green-700 dark:text-green-400">
                            {optimizedRoute.route.totalDistanceText}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                          <p className="font-semibold text-green-700 dark:text-green-400">
                            {optimizedRoute.route.totalDurationText}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Est. Fuel Cost:</span>
                          <p className="font-semibold text-green-700 dark:text-green-400">
                            Rs. {optimizedRoute.route.estimatedFuelCost}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Total Stops:</span>
                          <p className="font-semibold text-green-700 dark:text-green-400">
                            {optimizedRoute.route.totalStops}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stops Order */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Route Order:</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        <div className="flex items-center gap-2 text-sm p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                          <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                            S
                          </span>
                          <span className="text-gray-800 dark:text-gray-200">{optimizedRoute.depot.name} (Start)</span>
                        </div>
                        {optimizedRoute.stops.map((stop, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                          >
                            <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">
                              {stop.stopNumber}
                            </span>
                            <div>
                              <span className="font-medium text-gray-900 dark:text-white">{stop.farmName}</span>
                              <span className="text-gray-500 dark:text-gray-400 ml-2">
                                ({stop.quantity} {stop.quantityUnit})
                              </span>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 text-sm p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                          <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                            E
                          </span>
                          <span className="text-gray-800 dark:text-gray-200">{optimizedRoute.depot.name} (End)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Create Collection Route
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Existing Routes Tab */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Collection Routes</h3>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                  className="w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {routes.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">No routes found</div>
              ) : (
                routes.map((route) => (
                  <div key={route._id} className="p-4">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {route.state} - {route.district}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Date: {new Date(route.routeDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Stops: {route.routeStats?.totalStops} | Quantity:{' '}
                          {route.routeStats?.totalQuantity} quintals
                        </p>
                        {route.truck && (
                          <p className="text-sm text-gray-500 dark:text-gray-500">
                            Truck: {route.truck.vehicleNumber} ({route.truck.driverName})
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                            route.status
                          )}`}
                        >
                          {route.status?.replace('_', ' ').toUpperCase()}
                        </span>
                        <div className="mt-2 space-x-2">
                          <button
                            onClick={() => router.push(`/dashboard/government/routes/${route._id}`)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            View Details
                          </button>
                          {route.status === 'planned' && (
                            <button
                              onClick={() => startRoute(route._id)}
                              className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                            >
                              Start Route
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Route Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Collection Route</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vehicle Number *
                </label>
                <input
                  type="text"
                  value={truckDetails.vehicleNumber}
                  onChange={(e) =>
                    setTruckDetails({ ...truckDetails, vehicleNumber: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., UP32AB1234"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Driver Name *
                </label>
                <input
                  type="text"
                  value={truckDetails.driverName}
                  onChange={(e) => setTruckDetails({ ...truckDetails, driverName: e.target.value })}
                  placeholder="Enter driver name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Driver Phone *
                </label>
                <input
                  type="tel"
                  value={truckDetails.driverPhone}
                  onChange={(e) =>
                    setTruckDetails({ ...truckDetails, driverPhone: e.target.value })
                  }
                  placeholder="10-digit phone number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Truck Capacity (quintals)
                </label>
                <input
                  type="number"
                  value={truckDetails.capacity}
                  onChange={(e) => setTruckDetails({ ...truckDetails, capacity: e.target.value })}
                  placeholder="e.g., 100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={createRoute}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600"
              >
                {loading ? 'Creating...' : 'Create Route'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
