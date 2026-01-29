import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../../components/DashboardLayout';
import { mapsAPI } from '../../../../utils/api';

export default function RouteDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (id) {
      fetchRoute();
    }
  }, [id]);

  const fetchRoute = async () => {
    try {
      setLoading(true);
      const response = await mapsAPI.getRouteById(id);
      setRoute(response.data);
    } catch (error) {
      console.error('Error fetching route:', error);
      setError('Failed to fetch route details');
    } finally {
      setLoading(false);
    }
  };

  const startRoute = async () => {
    try {
      await mapsAPI.startRoute(id);
      setSuccess('Route started! Trucks have been dispatched to all farms.');
      fetchRoute();
    } catch (error) {
      console.error('Error starting route:', error);
      setError('Failed to start route');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      planned: { bg: 'bg-blue-100', text: 'text-blue-800' },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      completed: { bg: 'bg-green-100', text: 'text-green-800' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
      pending: { bg: 'bg-gray-100', text: 'text-gray-800' },
      collected: { bg: 'bg-green-100', text: 'text-green-800' },
      skipped: { bg: 'bg-orange-100', text: 'text-orange-800' },
    };
    return badges[status] || badges.pending;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!route) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Route not found</h2>
          <button
            onClick={() => router.push('/dashboard/government/routes')}
            className="mt-4 text-green-600 hover:text-green-800"
          >
            Back to Routes
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <button
              onClick={() => router.push('/dashboard/government/routes')}
              className="text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Routes
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Route: {route.state} - {route.district}
            </h1>
            <p className="text-gray-600">
              Date: {new Date(route.routeDate).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                getStatusBadge(route.status).bg
              } ${getStatusBadge(route.status).text}`}
            >
              {route.status?.replace('_', ' ').toUpperCase()}
            </span>
            {route.status === 'planned' && (
              <button
                onClick={startRoute}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Start Route
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
            <button onClick={() => setError('')} className="float-right">&times;</button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
            <button onClick={() => setSuccess('')} className="float-right">&times;</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Route Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Route Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Stops</span>
                <span className="font-medium">{route.routeStats?.totalStops || route.stops?.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Quantity</span>
                <span className="font-medium">{route.routeStats?.totalQuantity || 0} quintals</span>
              </div>
              {route.routeStats?.totalDistance && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Distance</span>
                  <span className="font-medium">{route.routeStats.totalDistance.toFixed(1)} km</span>
                </div>
              )}
              {route.routeStats?.estimatedDuration && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Est. Duration</span>
                  <span className="font-medium">{Math.round(route.routeStats.estimatedDuration)} min</span>
                </div>
              )}
              {route.routeStats?.estimatedFuelCost && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Est. Fuel Cost</span>
                  <span className="font-medium">Rs. {route.routeStats.estimatedFuelCost}</span>
                </div>
              )}
            </div>
          </div>

          {/* Truck Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Truck Details</h3>
            {route.truck ? (
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600 text-sm">Vehicle Number</span>
                  <p className="font-medium">{route.truck.vehicleNumber}</p>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Driver Name</span>
                  <p className="font-medium">{route.truck.driverName}</p>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Driver Phone</span>
                  <p className="font-medium">
                    <a href={`tel:${route.truck.driverPhone}`} className="text-green-600 hover:text-green-800">
                      {route.truck.driverPhone}
                    </a>
                  </p>
                </div>
                {route.truck.capacity && (
                  <div>
                    <span className="text-gray-600 text-sm">Capacity</span>
                    <p className="font-medium">{route.truck.capacity} quintals</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No truck assigned</p>
            )}
          </div>

          {/* Depot Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Depot Information</h3>
            <div className="space-y-4">
              <div>
                <span className="text-gray-600 text-sm">Start Point</span>
                <p className="font-medium">{route.startPoint?.name || 'N/A'}</p>
                {route.startPoint?.coordinates && (
                  <p className="text-xs text-gray-500">
                    {route.startPoint.coordinates.latitude?.toFixed(4)},{' '}
                    {route.startPoint.coordinates.longitude?.toFixed(4)}
                  </p>
                )}
              </div>
              <div>
                <span className="text-gray-600 text-sm">End Point</span>
                <p className="font-medium">{route.endPoint?.name || 'N/A'}</p>
              </div>
              {route.assignedOfficer && (
                <div>
                  <span className="text-gray-600 text-sm">Assigned Officer</span>
                  <p className="font-medium">{route.assignedOfficer.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline / Time Info */}
        {(route.startTime || route.endTime) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="flex gap-8">
              {route.startTime && (
                <div>
                  <span className="text-gray-600 text-sm">Started At</span>
                  <p className="font-medium">
                    {new Date(route.startTime).toLocaleString('en-IN')}
                  </p>
                </div>
              )}
              {route.endTime && (
                <div>
                  <span className="text-gray-600 text-sm">Completed At</span>
                  <p className="font-medium">
                    {new Date(route.endTime).toLocaleString('en-IN')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stops List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="font-semibold text-gray-900">Collection Stops ({route.stops?.length || 0})</h3>
          </div>
          <div className="divide-y">
            {route.stops?.map((stop, index) => (
              <div key={stop._id || index} className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      stop.status === 'collected'
                        ? 'bg-green-600'
                        : stop.status === 'skipped'
                        ? 'bg-orange-500'
                        : 'bg-gray-400'
                    }`}
                  >
                    {stop.order || index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {stop.farm?.farmName || 'Unknown Farm'}
                        </h4>
                        {stop.appointment?.farmer && (
                          <p className="text-sm text-gray-600">
                            {stop.appointment.farmer.name} - {stop.appointment.farmer.phone}
                          </p>
                        )}
                        {stop.farm?.location && (
                          <p className="text-sm text-gray-500">
                            {stop.farm.location.village}, {stop.farm.location.district}
                          </p>
                        )}
                        {stop.coordinates && (
                          <p className="text-xs text-gray-400 mt-1">
                            GPS: {stop.coordinates.latitude?.toFixed(4)},{' '}
                            {stop.coordinates.longitude?.toFixed(4)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                            getStatusBadge(stop.status).bg
                          } ${getStatusBadge(stop.status).text}`}
                        >
                          {stop.status?.toUpperCase() || 'PENDING'}
                        </span>
                        {stop.appointment?.strawDetails && (
                          <p className="text-sm text-green-600 mt-2">
                            {stop.appointment.strawDetails.quantity}{' '}
                            {stop.appointment.strawDetails.quantityUnit}
                          </p>
                        )}
                      </div>
                    </div>
                    {stop.collectedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Collected at: {new Date(stop.collectedAt).toLocaleString('en-IN')}
                      </p>
                    )}
                    {stop.notes && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        Notes: {stop.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/dashboard/government/routes')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back to Routes
          </button>
          {route.status === 'in_progress' && (
            <button
              onClick={() => router.push('/dashboard/government/bookings')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Manage Collections
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
