const axios = require('axios');

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Get current weather by coordinates
async function getCurrentWeather(latitude, longitude) {
  try {
    const response = await axios.get(`${WEATHER_BASE_URL}/weather`, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: OPENWEATHER_API_KEY,
        units: 'metric'
      }
    });

    const data = response.data;
    return {
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      clouds: data.clouds.all,
      visibility: data.visibility,
      weather: data.weather[0].main,
      weatherDescription: data.weather[0].description,
      icon: data.weather[0].icon,
      sunrise: new Date(data.sys.sunrise * 1000),
      sunset: new Date(data.sys.sunset * 1000),
      location: data.name
    };
  } catch (error) {
    console.error('Weather API error:', error.message);
    throw error;
  }
}

// Get 5-day forecast (3-hour intervals)
async function getForecast(latitude, longitude) {
  try {
    const response = await axios.get(`${WEATHER_BASE_URL}/forecast`, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: OPENWEATHER_API_KEY,
        units: 'metric'
      }
    });

    const forecasts = response.data.list.map(item => ({
      datetime: new Date(item.dt * 1000),
      temperature: item.main.temp,
      feelsLike: item.main.feels_like,
      humidity: item.main.humidity,
      pressure: item.main.pressure,
      windSpeed: item.wind.speed,
      clouds: item.clouds.all,
      weather: item.weather[0].main,
      weatherDescription: item.weather[0].description,
      icon: item.weather[0].icon,
      precipitation: item.pop * 100, // Probability of precipitation in %
      rain: item.rain?.['3h'] || 0 // Rain volume in mm
    }));

    // Group by day
    const dailyForecasts = {};
    forecasts.forEach(f => {
      const date = f.datetime.toISOString().split('T')[0];
      if (!dailyForecasts[date]) {
        dailyForecasts[date] = {
          date,
          forecasts: [],
          minTemp: Infinity,
          maxTemp: -Infinity,
          avgHumidity: 0,
          totalRain: 0,
          maxPrecipitation: 0
        };
      }
      dailyForecasts[date].forecasts.push(f);
      dailyForecasts[date].minTemp = Math.min(dailyForecasts[date].minTemp, f.temperature);
      dailyForecasts[date].maxTemp = Math.max(dailyForecasts[date].maxTemp, f.temperature);
      dailyForecasts[date].avgHumidity += f.humidity;
      dailyForecasts[date].totalRain += f.rain;
      dailyForecasts[date].maxPrecipitation = Math.max(dailyForecasts[date].maxPrecipitation, f.precipitation);
    });

    // Calculate averages
    Object.values(dailyForecasts).forEach(day => {
      day.avgHumidity = Math.round(day.avgHumidity / day.forecasts.length);
      day.primaryWeather = getMostCommonWeather(day.forecasts);
    });

    return {
      location: response.data.city.name,
      country: response.data.city.country,
      hourlyForecasts: forecasts,
      dailyForecasts: Object.values(dailyForecasts)
    };
  } catch (error) {
    console.error('Forecast API error:', error.message);
    throw error;
  }
}

// Get weather by city/location name
async function getWeatherByLocation(locationName) {
  try {
    const response = await axios.get(`${WEATHER_BASE_URL}/weather`, {
      params: {
        q: `${locationName},IN`,
        appid: OPENWEATHER_API_KEY,
        units: 'metric'
      }
    });

    const data = response.data;
    return {
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      clouds: data.clouds.all,
      weather: data.weather[0].main,
      weatherDescription: data.weather[0].description,
      icon: data.weather[0].icon,
      location: data.name,
      coordinates: {
        latitude: data.coord.lat,
        longitude: data.coord.lon
      }
    };
  } catch (error) {
    console.error('Weather by location error:', error.message);
    throw error;
  }
}

// Analyze weather conditions for farming
function analyzeWeatherForFarming(weather, forecast) {
  const analysis = {
    overallCondition: 'good',
    alerts: [],
    recommendations: [],
    harvestSuitability: 'suitable',
    irrigationNeeded: false,
    sprayingConditions: 'good'
  };

  // Temperature analysis
  if (weather.temperature > 40) {
    analysis.alerts.push('Extreme heat warning - protect crops from heat stress');
    analysis.overallCondition = 'poor';
  } else if (weather.temperature > 35) {
    analysis.alerts.push('High temperature - ensure adequate irrigation');
    analysis.irrigationNeeded = true;
  } else if (weather.temperature < 5) {
    analysis.alerts.push('Frost warning - protect sensitive crops');
    analysis.overallCondition = 'poor';
  }

  // Humidity analysis
  if (weather.humidity > 85) {
    analysis.alerts.push('High humidity - watch for fungal diseases');
    analysis.sprayingConditions = 'poor';
  } else if (weather.humidity < 30) {
    analysis.irrigationNeeded = true;
    analysis.recommendations.push('Low humidity - increase irrigation frequency');
  }

  // Wind analysis
  if (weather.windSpeed > 10) {
    analysis.sprayingConditions = 'poor';
    analysis.recommendations.push('High winds - avoid spraying pesticides');
  }

  // Rain forecast analysis
  if (forecast && forecast.dailyForecasts) {
    const next3Days = forecast.dailyForecasts.slice(0, 3);
    const rainExpected = next3Days.some(day => day.maxPrecipitation > 50 || day.totalRain > 5);

    if (rainExpected) {
      analysis.harvestSuitability = 'not_recommended';
      analysis.alerts.push('Rain expected in next 3 days - postpone harvest if possible');
      analysis.irrigationNeeded = false;
    }
  }

  // Current weather conditions
  if (['Rain', 'Thunderstorm', 'Drizzle'].includes(weather.weather)) {
    analysis.harvestSuitability = 'not_suitable';
    analysis.sprayingConditions = 'not_suitable';
    analysis.overallCondition = 'moderate';
  }

  // Set overall condition
  if (analysis.alerts.length === 0) {
    analysis.overallCondition = 'excellent';
    analysis.recommendations.push('Weather conditions are ideal for farming activities');
  } else if (analysis.alerts.length <= 2) {
    analysis.overallCondition = 'good';
  }

  return analysis;
}

// Get crop-specific weather advice
function getCropWeatherAdvice(cropName, weather, forecast) {
  const cropAdvice = {
    wheat: {
      idealTemp: { min: 15, max: 25 },
      harvestConditions: 'Dry weather with low humidity',
      sensitivity: 'Sensitive to late rains during maturity'
    },
    rice: {
      idealTemp: { min: 20, max: 35 },
      harvestConditions: 'Dry spell of 5-7 days needed',
      sensitivity: 'Needs standing water during growth'
    },
    sugarcane: {
      idealTemp: { min: 20, max: 35 },
      harvestConditions: 'Dry weather preferred',
      sensitivity: 'Tolerates high temperatures'
    },
    cotton: {
      idealTemp: { min: 21, max: 30 },
      harvestConditions: 'Dry and sunny weather essential',
      sensitivity: 'Rain damages open bolls'
    },
    maize: {
      idealTemp: { min: 18, max: 32 },
      harvestConditions: 'Low moisture content needed',
      sensitivity: 'Drought stress during tasseling affects yield'
    },
    soybean: {
      idealTemp: { min: 20, max: 30 },
      harvestConditions: 'Dry weather for 7-10 days',
      sensitivity: 'Excess rain causes pod shattering'
    },
    mustard: {
      idealTemp: { min: 10, max: 25 },
      harvestConditions: 'Cool and dry weather',
      sensitivity: 'Frost can damage flowering'
    },
    potato: {
      idealTemp: { min: 15, max: 25 },
      harvestConditions: 'Dry soil conditions',
      sensitivity: 'Frost damages tubers'
    }
  };

  const cropLower = cropName.toLowerCase();
  const cropInfo = cropAdvice[cropLower] || {
    idealTemp: { min: 15, max: 30 },
    harvestConditions: 'General dry weather',
    sensitivity: 'Monitor local conditions'
  };

  const advice = {
    crop: cropName,
    currentConditions: [],
    recommendations: []
  };

  // Temperature check
  if (weather.temperature < cropInfo.idealTemp.min) {
    advice.currentConditions.push(`Temperature (${weather.temperature}°C) is below ideal for ${cropName}`);
    advice.recommendations.push('Consider protective measures against cold');
  } else if (weather.temperature > cropInfo.idealTemp.max) {
    advice.currentConditions.push(`Temperature (${weather.temperature}°C) is above ideal for ${cropName}`);
    advice.recommendations.push('Ensure adequate irrigation and shade if possible');
  } else {
    advice.currentConditions.push(`Temperature (${weather.temperature}°C) is ideal for ${cropName}`);
  }

  advice.harvestAdvice = cropInfo.harvestConditions;
  advice.cropSensitivity = cropInfo.sensitivity;

  return advice;
}

// Helper function to get most common weather
function getMostCommonWeather(forecasts) {
  const counts = {};
  forecasts.forEach(f => {
    counts[f.weather] = (counts[f.weather] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

module.exports = {
  getCurrentWeather,
  getForecast,
  getWeatherByLocation,
  analyzeWeatherForFarming,
  getCropWeatherAdvice
};
