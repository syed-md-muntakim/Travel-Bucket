// backend/controllers/weatherController.js
// MEMBER 2 FEATURE FILE — new addition, no other member's code touches this file.

const { getWeatherForDistrict } = require("../services/weatherService");

// GET /api/weather?district=Sylhet
// Returns live current conditions + a 5-day forecast for the given district/city.
const getWeather = async (req, res) => {
  try {
    const { district } = req.query;
    if (!district || !district.trim()) {
      return res.status(400).json({ message: "Query parameter 'district' is required" });
    }

    const data = await getWeatherForDistrict(district.trim());
    res.json(data);
  } catch (err) {
    // 502 = upstream (OpenWeatherMap) failed or the district couldn't be resolved
    res.status(502).json({ message: err.message || "Failed to fetch weather data" });
  }
};

module.exports = { getWeather };
