const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getCurrentWeather,
  getForecast,
  getWeatherByLocation,
  analyzeWeatherForFarming,
  getCropWeatherAdvice
} = require('../config/weather');
const Farm = require('../models/Farm');

// @route   GET /api/weather/current
// @desc    Get current weather by coordinates or location
// @access  Private
router.get('/current', protect, async (req, res) => {
  try {
    const { latitude, longitude, location } = req.query;

    let weather;
    if (latitude && longitude) {
      weather = await getCurrentWeather(parseFloat(latitude), parseFloat(longitude));
    } else if (location) {
      weather = await getWeatherByLocation(location);
    } else {
      return res.status(400).json({ message: 'Provide coordinates or location name' });
    }

    res.json(weather);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch weather', error: error.message });
  }
});

// @route   GET /api/weather/forecast
// @desc    Get 5-day weather forecast
// @access  Private
router.get('/forecast', protect, async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Coordinates required' });
    }

    const forecast = await getForecast(parseFloat(latitude), parseFloat(longitude));
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch forecast', error: error.message });
  }
});

// @route   GET /api/weather/farm/:farmId
// @desc    Get weather for a specific farm
// @access  Private
router.get('/farm/:farmId', protect, async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.farmId);

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    // Check if user owns the farm or is government
    if (req.user.userType !== 'government' && farm.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let weather, forecast;

    // Try coordinates first
    if (farm.location.coordinates?.latitude) {
      const { latitude, longitude } = farm.location.coordinates;
      weather = await getCurrentWeather(latitude, longitude);
      forecast = await getForecast(latitude, longitude);
    } else {
      // Fallback to location name
      const locationName = `${farm.location.district}, ${farm.location.state}`;
      weather = await getWeatherByLocation(locationName);

      if (weather.coordinates) {
        forecast = await getForecast(weather.coordinates.latitude, weather.coordinates.longitude);
      }
    }

    // Analyze weather for farming
    const analysis = analyzeWeatherForFarming(weather, forecast);

    // Get crop-specific advice for active crops
    const cropAdvice = [];
    for (const crop of farm.crops) {
      if (['sowing', 'growing', 'ready_to_harvest'].includes(crop.status)) {
        const advice = getCropWeatherAdvice(crop.cropName, weather, forecast);
        cropAdvice.push({
          cropId: crop._id,
          cropName: crop.cropName,
          status: crop.status,
          ...advice
        });
      }
    }

    res.json({
      farm: {
        id: farm._id,
        name: farm.farmName,
        location: farm.location
      },
      current: weather,
      forecast: forecast?.dailyForecasts || [],
      analysis,
      cropAdvice
    });
  } catch (error) {
    console.error('Farm weather error:', error);
    res.status(500).json({ message: 'Failed to fetch farm weather', error: error.message });
  }
});

// @route   GET /api/weather/harvest-advisory/:farmId/:cropId
// @desc    Get harvest weather advisory for a specific crop
// @access  Private
router.get('/harvest-advisory/:farmId/:cropId', protect, async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.farmId);

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    if (farm.farmer.toString() !== req.user._id.toString() &&
        !(req.user.userType === 'government' && req.user.isVerified)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const crop = farm.crops.id(req.params.cropId);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    let weather, forecast;

    if (farm.location.coordinates?.latitude) {
      const { latitude, longitude } = farm.location.coordinates;
      weather = await getCurrentWeather(latitude, longitude);
      forecast = await getForecast(latitude, longitude);
    } else {
      const locationName = `${farm.location.district}, ${farm.location.state}`;
      weather = await getWeatherByLocation(locationName);
      if (weather.coordinates) {
        forecast = await getForecast(weather.coordinates.latitude, weather.coordinates.longitude);
      }
    }

    const analysis = analyzeWeatherForFarming(weather, forecast);
    const cropAdvice = getCropWeatherAdvice(crop.cropName, weather, forecast);

    // Calculate best harvest window
    let bestHarvestDays = [];
    if (forecast?.dailyForecasts) {
      bestHarvestDays = forecast.dailyForecasts
        .filter(day => day.maxPrecipitation < 30 && day.totalRain < 2)
        .map(day => ({
          date: day.date,
          minTemp: Math.round(day.minTemp),
          maxTemp: Math.round(day.maxTemp),
          weather: day.primaryWeather,
          rainChance: day.maxPrecipitation
        }));
    }

    // Generate recommendation
    let harvestRecommendation = '';
    if (analysis.harvestSuitability === 'suitable' || analysis.harvestSuitability === 'not_recommended') {
      if (bestHarvestDays.length > 0) {
        harvestRecommendation = `Best days for harvest: ${bestHarvestDays.slice(0, 3).map(d => d.date).join(', ')}`;
      } else {
        harvestRecommendation = 'No ideal harvest days in the forecast. Monitor daily weather updates.';
      }
    } else {
      harvestRecommendation = 'Current weather not suitable for harvest. Wait for dry conditions.';
    }

    res.json({
      crop: {
        name: crop.cropName,
        status: crop.status,
        expectedHarvestDate: crop.expectedHarvestDate
      },
      currentWeather: {
        temperature: weather.temperature,
        humidity: weather.humidity,
        weather: weather.weather,
        description: weather.weatherDescription
      },
      harvestSuitability: analysis.harvestSuitability,
      recommendation: harvestRecommendation,
      bestHarvestDays,
      cropSpecificAdvice: cropAdvice,
      alerts: analysis.alerts
    });
  } catch (error) {
    console.error('Harvest advisory error:', error);
    res.status(500).json({ message: 'Failed to get harvest advisory', error: error.message });
  }
});

// @route   GET /api/weather/alerts
// @desc    Get weather alerts for all user's farms
// @access  Private
router.get('/alerts', protect, async (req, res) => {
  try {
    const farms = await Farm.find({ farmer: req.user._id, isActive: true });

    const alerts = [];

    for (const farm of farms) {
      try {
        let weather;

        if (farm.location.coordinates?.latitude) {
          weather = await getCurrentWeather(
            farm.location.coordinates.latitude,
            farm.location.coordinates.longitude
          );
        } else {
          const locationName = `${farm.location.district}, ${farm.location.state}`;
          weather = await getWeatherByLocation(locationName);
        }

        const analysis = analyzeWeatherForFarming(weather, null);

        if (analysis.alerts.length > 0) {
          alerts.push({
            farmId: farm._id,
            farmName: farm.farmName,
            location: `${farm.location.district}, ${farm.location.state}`,
            temperature: weather.temperature,
            weather: weather.weather,
            alerts: analysis.alerts,
            recommendations: analysis.recommendations
          });
        }
      } catch (err) {
        console.error(`Weather alert error for farm ${farm._id}:`, err.message);
      }
    }

    res.json({
      totalFarms: farms.length,
      farmsWithAlerts: alerts.length,
      alerts
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch weather alerts', error: error.message });
  }
});

module.exports = router;
