// controllers/locationController.js

export const searchLocation = async (req, res) => {
  try {
    const {
      q,
      limit = 5,
      language = "en",
    } = req.query;

    // ================= BASIC VALIDATION =================

    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.status(400).json({
        status: false,
        message: "Location search query must be at least 2 characters",
      });
    }

    const searchQuery = q.trim();

    // ================= VALIDATE LANGUAGE =================

    const allowedLanguages = ["en", "bn", "hi"];

    const selectedLanguage = allowedLanguages.includes(language)
      ? language
      : "en";

    // ================= LIMIT =================

    const resultLimit = Math.min(
      Math.max(parseInt(limit, 10) || 5, 1),
      10
    );

    // ================= NOMINATIM REQUEST =================

    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?format=jsonv2` +
      `&addressdetails=1` +
      `&limit=${resultLimit}` +
      `&q=${encodeURIComponent(searchQuery)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": selectedLanguage,
        "User-Agent": "astrocristoptec/1.0",
      },
    });

    if (!response.ok) {
      console.error(
        "Nominatim response error:",
        response.status,
        response.statusText
      );

      return res.status(502).json({
        status: false,
        message: "Location service temporarily unavailable",
      });
    }

    const data = await response.json();

    // ================= FORMAT RESPONSE =================

    const locations = Array.isArray(data)
      ? data.map((item) => ({
          label: formatCompactLocation(
            item.address,
            item.display_name
          ),
          lat: String(item.lat),
          lon: String(item.lon),
          display_name: item.display_name || "",
          address: item.address || {},
        }))
      : [];

    return res.json({
      status: true,
      data: locations,
    });

  } catch (error) {
    console.error("? searchLocation error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to search location",
    });
  }
};


// ================= FORMAT LOCATION =================

const formatCompactLocation = (
  address = {},
  displayName = ""
) => {
  const parts = [];

  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county;

  if (city) {
    parts.push(city);
  }

  if (address.state) {
    parts.push(address.state);
  }

  if (address.country) {
    parts.push(address.country);
  }

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return displayName || "";
};