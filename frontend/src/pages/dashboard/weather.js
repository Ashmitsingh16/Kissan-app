import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import { weatherAPI, farmAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  FaSun,
  FaCloud,
  FaCloudRain,
  FaWind,
  FaTint,
  FaThermometerHalf,
  FaExclamationTriangle,
  FaLeaf,
  FaCalendarAlt,
  FaTractor,
  FaPlus
} from 'react-icons/fa';

const weatherIcons = {
  Clear: FaSun,
  Clouds: FaCloud,
  Rain: FaCloudRain,
  Drizzle: FaCloudRain,
  Thunderstorm: FaCloudRain,
  Snow: FaCloud,
  Mist: FaCloud,
  Fog: FaCloud,
  Haze: FaCloud,
};

export default function WeatherDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.userType !== 'farmer') {
      router.push('/dashboard');
      return;
    }
    fetchFarms();
    fetchAlerts();
  }, [user]);

  useEffect(() => {
    if (selectedFarm) {
      fetchFarmWeather(selectedFarm);
    }
  }, [selectedFarm]);

  const fetchFarms = async () => {
    try {
      setLoading(true);
      const response = await farmAPI.getAll();
      const farmsData = response.data || [];
      setFarms(farmsData);
      if (farmsData.length > 0) {
        setSelectedFarm(farmsData[0]._id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching farms:', error);
      setError('Failed to load farms. Please make sure you are logged in.');
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await weatherAPI.getAlerts();
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchFarmWeather = async (farmId) => {
    try {
      setLoading(true);
      setError('');
      const response = await weatherAPI.getFarmWeather(farmId);
      setWeatherData(response.data);
    } catch (error) {
      console.error('Error fetching weather:', error);
      setError('Failed to load weather data. Please ensure the farm has a valid location.');
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (weather) => {
    const Icon = weatherIcons[weather] || FaCloud;
    return <Icon className="w-8 h-8" />;
  };

  const getConditionColor = (condition) => {
    const colors = {
      excellent: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50',
      good: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50',
      moderate: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/50',
      poor: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50',
    };
    return colors[condition] || colors.moderate;
  };

  const getSuitabilityBadge = (suitability) => {
    const badges = {
      suitable: { color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300', text: 'Suitable' },
      not_recommended: { color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300', text: 'Not Recommended' },
      not_suitable: { color: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300', text: 'Not Suitable' },
    };
    return badges[suitability] || badges.not_recommended;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weather Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Monitor weather conditions for your farms</p>
          </div>
          <div className="flex gap-2">
            {farms.length > 0 ? (
              <select
                value={selectedFarm || ''}
                onChange={(e) => setSelectedFarm(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {farms.map((farm) => (
                  <option key={farm._id} value={farm._id}>
                    {farm.farmName}
                  </option>
                ))}
              </select>
            ) : (
              <Link
                href="/dashboard/farms/new"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <FaPlus className="mr-2" />
                Add Farm
              </Link>
            )}
          </div>
        </div>

        {/* Weather Alerts */}
        {alerts && alerts.farmsWithAlerts > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="text-yellow-600 dark:text-yellow-400 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Weather Alerts</h3>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                  {alerts.farmsWithAlerts} of your farms have weather alerts
                </p>
                <div className="mt-2 space-y-2">
                  {alerts.alerts.slice(0, 3).map((alert, idx) => (
                    <div key={idx} className="text-sm text-yellow-700 dark:text-yellow-300">
                      <span className="font-medium">{alert.farmName}:</span>{' '}
                      {alert.alerts.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : weatherData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Weather */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Weather</h2>
              <div className="flex items-center gap-6">
                <div className="text-yellow-500 dark:text-yellow-400">
                  {getWeatherIcon(weatherData.current.weather)}
                </div>
                <div>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white">
                    {Math.round(weatherData.current.temperature)}°C
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 capitalize">
                    {weatherData.current.weatherDescription}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {weatherData.current.location}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                    <FaThermometerHalf />
                    <span>Feels Like</span>
                  </div>
                  <div className="font-semibold mt-1 text-gray-900 dark:text-white">
                    {Math.round(weatherData.current.feelsLike)}°C
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                    <FaTint />
                    <span>Humidity</span>
                  </div>
                  <div className="font-semibold mt-1 text-gray-900 dark:text-white">{weatherData.current.humidity}%</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                    <FaWind />
                    <span>Wind</span>
                  </div>
                  <div className="font-semibold mt-1 text-gray-900 dark:text-white">
                    {weatherData.current.windSpeed} m/s
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                    <FaCloud />
                    <span>Clouds</span>
                  </div>
                  <div className="font-semibold mt-1 text-gray-900 dark:text-white">{weatherData.current.clouds}%</div>
                </div>
              </div>
            </div>

            {/* Farming Analysis */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Farming Conditions</h2>
              <div
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getConditionColor(
                  weatherData.analysis.overallCondition
                )}`}
              >
                {weatherData.analysis.overallCondition.charAt(0).toUpperCase() +
                  weatherData.analysis.overallCondition.slice(1)}
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Harvest Suitability</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      getSuitabilityBadge(weatherData.analysis.harvestSuitability).color
                    }`}
                  >
                    {getSuitabilityBadge(weatherData.analysis.harvestSuitability).text}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Spraying Conditions</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      weatherData.analysis.sprayingConditions === 'good'
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                    }`}
                  >
                    {weatherData.analysis.sprayingConditions.charAt(0).toUpperCase() +
                      weatherData.analysis.sprayingConditions.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Irrigation Needed</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      weatherData.analysis.irrigationNeeded
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {weatherData.analysis.irrigationNeeded ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {weatherData.analysis.alerts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Alerts</h4>
                  <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                    {weatherData.analysis.alerts.map((alert, idx) => (
                      <li key={idx}>• {alert}</li>
                    ))}
                  </ul>
                </div>
              )}

              {weatherData.analysis.recommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Recommendations</h4>
                  <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
                    {weatherData.analysis.recommendations.map((rec, idx) => (
                      <li key={idx}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 5-Day Forecast */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">5-Day Forecast</h2>
              <div className="grid grid-cols-5 gap-2">
                {weatherData.forecast.slice(0, 5).map((day, idx) => (
                  <div key={idx} className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(day.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                    <div className="my-2 flex justify-center text-gray-600 dark:text-gray-300">
                      {getWeatherIcon(day.primaryWeather)}
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-900 dark:text-white">{Math.round(day.maxTemp)}°</span>
                      <span className="text-gray-400 dark:text-gray-500 mx-1">/</span>
                      <span className="text-gray-500 dark:text-gray-400">{Math.round(day.minTemp)}°</span>
                    </div>
                    {day.maxPrecipitation > 20 && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {Math.round(day.maxPrecipitation)}% rain
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Crop-Specific Advice */}
            {weatherData.cropAdvice && weatherData.cropAdvice.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FaLeaf className="text-green-600 dark:text-green-400" />
                  Crop Advice
                </h2>
                <div className="space-y-4">
                  {weatherData.cropAdvice.map((crop, idx) => (
                    <div key={idx} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0">
                      <div className="font-medium text-gray-800 dark:text-white">{crop.cropName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 capitalize mb-2">
                        Status: {crop.status.replace('_', ' ')}
                      </div>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {crop.currentConditions.map((cond, i) => (
                          <li key={i}>• {cond}</li>
                        ))}
                      </ul>
                      {crop.recommendations.length > 0 && (
                        <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                          {crop.recommendations[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-8 text-center">
            <FaTractor className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            {farms.length === 0 ? (
              <>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">No Farms Registered</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Register a farm first to see weather data for your location.
                </p>
                <Link
                  href="/dashboard/farms/new"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <FaPlus className="mr-2" />
                  Register Your First Farm
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Select a Farm</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Choose a farm from the dropdown above to view weather data.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
