const axios = require("axios");

// GET /api/location/search?query=cox's bazar
const searchLocation = async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({ message: "Query must be at least 2 characters" });
  }

  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: query,
        format: "json",
        addressdetails: 1,
        limit: 6,
        viewbox: "88.0,26.7,92.7,20.5",
        bounded: 0,
      },
      headers: { "User-Agent": "TravelBucket-CSE471-Project/1.0" },
      timeout: 8000,
    });

    const suggestions = response.data.map((place) => ({
      placeId: place.place_id,
      displayName: place.display_name,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      type: place.type,
    }));

    res.json({ results: suggestions });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch location suggestions", error: err.message });
  }
};

module.exports = { searchLocation };
