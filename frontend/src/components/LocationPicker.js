import { useState, useEffect, useCallback } from 'react';
import { mapsAPI } from '../utils/api';
import { FaMapMarkerAlt, FaSearch, FaCrosshairs } from 'react-icons/fa';

export default function LocationPicker({
  coordinates,
  onCoordinatesChange,
  address,
  onAddressChange,
  className = ''
}) {
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [geocodeError, setGeocodeError] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    // Fetch API key on mount
    const fetchApiKey = async () => {
      try {
        const response = await mapsAPI.getApiKey();
        setApiKey(response.data.apiKey);
      } catch (error) {
        console.error('Error fetching API key:', error);
      }
    };
    fetchApiKey();
  }, []);

  const geocodeAddress = async () => {
    if (!searchAddress.trim()) {
      setGeocodeError('Please enter an address');
      return;
    }

    try {
      setLoading(true);
      setGeocodeError('');
      const response = await mapsAPI.geocode({ address: searchAddress });

      if (response.data.success && response.data.coordinates) {
        const { latitude, longitude, formattedAddress } = response.data.coordinates;
        onCoordinatesChange({ latitude, longitude });
        if (onAddressChange && formattedAddress) {
          onAddressChange(formattedAddress);
        }
        setShowMap(true);
      } else {
        setGeocodeError('Could not find location. Try a more specific address.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodeError('Failed to geocode address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeocodeError('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    setGeocodeError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onCoordinatesChange({ latitude, longitude });
        setShowMap(true);
        setGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setGeocodeError('Failed to get your location. Please check permissions.');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleAddressFromParts = useCallback((parts) => {
    const fullAddress = parts.filter(Boolean).join(', ');
    setSearchAddress(fullAddress);
  }, []);

  // Update search address when address prop changes
  useEffect(() => {
    if (address) {
      setSearchAddress(address);
    }
  }, [address]);

  const mapUrl = coordinates?.latitude && apiKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.latitude},${coordinates.longitude}&zoom=15&size=400x200&maptype=roadmap&markers=color:red%7C${coordinates.latitude},${coordinates.longitude}&key=${apiKey}`
    : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Box */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Farm Location (GPS)
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && geocodeAddress()}
              placeholder="Enter full address or village name"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <button
            type="button"
            onClick={geocodeAddress}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 flex items-center gap-2"
          >
            <FaSearch />
            {loading ? 'Searching...' : 'Find'}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Enter your village, district, and state for best results
        </p>
      </div>

      {/* Get Current Location */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={gettingLocation}
          className="flex items-center gap-2 px-4 py-2 border border-green-600 dark:border-green-500 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 disabled:opacity-50"
        >
          <FaCrosshairs className={gettingLocation ? 'animate-pulse' : ''} />
          {gettingLocation ? 'Getting Location...' : 'Use My Current Location'}
        </button>
        <span className="text-sm text-gray-500 dark:text-gray-400">or search above</span>
      </div>

      {/* Error Message */}
      {geocodeError && (
        <p className="text-sm text-red-600 dark:text-red-400">{geocodeError}</p>
      )}

      {/* Coordinates Display */}
      {coordinates?.latitude && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-green-800 dark:text-green-300">Location Set</h4>
              <p className="text-sm text-green-600 dark:text-green-400">
                Latitude: {coordinates.latitude.toFixed(6)}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Longitude: {coordinates.longitude.toFixed(6)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm underline"
            >
              {showMap ? 'Hide Map' : 'Show Map'}
            </button>
          </div>

          {/* Static Map Preview */}
          {showMap && mapUrl && (
            <div className="mt-4">
              <img
                src={mapUrl}
                alt="Farm location map"
                className="w-full rounded-lg border border-green-200 dark:border-green-700"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Map shows your farm location
              </p>
            </div>
          )}
        </div>
      )}

      {/* Manual Coordinates Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Or enter coordinates manually (if you know them):
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Latitude</label>
            <input
              type="number"
              value={coordinates?.latitude || ''}
              onChange={(e) => onCoordinatesChange({
                ...coordinates,
                latitude: parseFloat(e.target.value) || 0
              })}
              step="0.000001"
              placeholder="e.g., 28.6139"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Longitude</label>
            <input
              type="number"
              value={coordinates?.longitude || ''}
              onChange={(e) => onCoordinatesChange({
                ...coordinates,
                longitude: parseFloat(e.target.value) || 0
              })}
              step="0.000001"
              placeholder="e.g., 77.2090"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
