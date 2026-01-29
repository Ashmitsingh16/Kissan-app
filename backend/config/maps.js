const axios = require('axios');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';

// Geocode an address to get coordinates
async function geocodeAddress(address) {
  try {
    const response = await axios.get(`${MAPS_BASE_URL}/geocode/json`, {
      params: {
        address: address,
        key: GOOGLE_MAPS_API_KEY,
        region: 'in' // India region bias
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: response.data.results[0].formatted_address
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    throw error;
  }
}

// Get distance and duration between two points
async function getDistance(origin, destination) {
  try {
    const response = await axios.get(`${MAPS_BASE_URL}/distancematrix/json`, {
      params: {
        origins: `${origin.latitude},${origin.longitude}`,
        destinations: `${destination.latitude},${destination.longitude}`,
        key: GOOGLE_MAPS_API_KEY,
        units: 'metric'
      }
    });

    if (response.data.status === 'OK' && response.data.rows[0].elements[0].status === 'OK') {
      const element = response.data.rows[0].elements[0];
      return {
        distance: element.distance.value / 1000, // Convert to km
        distanceText: element.distance.text,
        duration: element.duration.value / 60, // Convert to minutes
        durationText: element.duration.text
      };
    }
    return null;
  } catch (error) {
    console.error('Distance matrix error:', error.message);
    throw error;
  }
}

// Get distance matrix for multiple origins and destinations
async function getDistanceMatrix(origins, destinations) {
  try {
    const originsStr = origins.map(o => `${o.latitude},${o.longitude}`).join('|');
    const destinationsStr = destinations.map(d => `${d.latitude},${d.longitude}`).join('|');

    const response = await axios.get(`${MAPS_BASE_URL}/distancematrix/json`, {
      params: {
        origins: originsStr,
        destinations: destinationsStr,
        key: GOOGLE_MAPS_API_KEY,
        units: 'metric'
      }
    });

    if (response.data.status === 'OK') {
      return response.data.rows.map((row, i) => ({
        origin: origins[i],
        distances: row.elements.map((element, j) => ({
          destination: destinations[j],
          distance: element.status === 'OK' ? element.distance.value / 1000 : null,
          distanceText: element.status === 'OK' ? element.distance.text : 'N/A',
          duration: element.status === 'OK' ? element.duration.value / 60 : null,
          durationText: element.status === 'OK' ? element.duration.text : 'N/A'
        }))
      }));
    }
    return null;
  } catch (error) {
    console.error('Distance matrix error:', error.message);
    throw error;
  }
}

// Get optimized route for multiple waypoints (Travelling Salesman Problem)
async function getOptimizedRoute(origin, waypoints, destination) {
  try {
    const waypointsStr = waypoints.map(w => `${w.latitude},${w.longitude}`).join('|');

    const response = await axios.get(`${MAPS_BASE_URL}/directions/json`, {
      params: {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: destination ? `${destination.latitude},${destination.longitude}` : `${origin.latitude},${origin.longitude}`,
        waypoints: `optimize:true|${waypointsStr}`,
        key: GOOGLE_MAPS_API_KEY,
        units: 'metric'
      }
    });

    if (response.data.status === 'OK' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const legs = route.legs;

      // Calculate totals
      let totalDistance = 0;
      let totalDuration = 0;
      legs.forEach(leg => {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;
      });

      return {
        optimizedOrder: route.waypoint_order, // Array of indices showing optimal order
        totalDistance: totalDistance / 1000, // km
        totalDistanceText: `${(totalDistance / 1000).toFixed(1)} km`,
        totalDuration: totalDuration / 60, // minutes
        totalDurationText: formatDuration(totalDuration),
        legs: legs.map((leg, index) => ({
          legIndex: index,
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          distance: leg.distance.value / 1000,
          distanceText: leg.distance.text,
          duration: leg.duration.value / 60,
          durationText: leg.duration.text,
          steps: leg.steps.map(step => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
            distance: step.distance.text,
            duration: step.duration.text
          }))
        })),
        overviewPolyline: route.overview_polyline.points, // For drawing on map
        bounds: route.bounds
      };
    }
    return null;
  } catch (error) {
    console.error('Directions error:', error.message);
    throw error;
  }
}

// Calculate estimated fuel cost
function calculateFuelCost(distanceKm, fuelEfficiency = 8, fuelPrice = 100) {
  // Default: 8 km per liter for trucks, Rs 100 per liter diesel
  const litersNeeded = distanceKm / fuelEfficiency;
  return Math.round(litersNeeded * fuelPrice);
}

// Format duration in hours and minutes
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

// Find nearest neighbor for simple route optimization (fallback)
function nearestNeighborRoute(start, points) {
  const route = [];
  const unvisited = [...points];
  let current = start;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    unvisited.forEach((point, idx) => {
      const dist = haversineDistance(current, point);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });

    route.push(unvisited[nearestIdx]);
    current = unvisited[nearestIdx];
    unvisited.splice(nearestIdx, 1);
  }

  return route;
}

// Haversine formula for distance between two coordinates
function haversineDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

module.exports = {
  geocodeAddress,
  getDistance,
  getDistanceMatrix,
  getOptimizedRoute,
  calculateFuelCost,
  nearestNeighborRoute,
  haversineDistance
};
