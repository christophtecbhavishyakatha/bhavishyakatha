# Bhavishya Katha Kundali API

**Version:** 1.3.5  
**Purpose:** Backend API for generating Kundali data for the Bhavishya Katha mobile app.

---

# 1. Architecture

The mobile app must communicate **only with the Bhavishya Katha API**.

```text
Bhavishya Katha React Native App
              |
              | JSON
              v
     Bhavishya Katha API
              |
              | Provider-specific request
              v
          Navamsha API
```

The React Native app must NOT:

- call Navamsha directly
- contain the Navamsha API key
- calculate latitude/longitude
- calculate timezone
- know Navamsha endpoint names
- depend on Navamsha's response format

This separation is intentional. Navamsha can be replaced or modified later without requiring changes to the mobile app, as long as the Bhavishya Katha response contract remains compatible.

---

# 2. Prerequisites

## Backend

Install:

- Node.js 20+
- npm

The current development environment was tested with Node 22.

Check:

```cmd
node --version
npm --version
```

## API provider

A valid Navamsha API key is required.

The key must exist only on the backend in `.env`:

```env
NAVAMSHA_API_KEY=YOUR_NAVAMSHA_KEY
```

**Never put this key in the React Native application.**

## Internal API key

The backend also requires:

```env
BHAVISHYA_INTERNAL_API_KEY=YOUR_INTERNAL_SECRET
```

This is currently used to protect the API during development.

The mobile developer should receive the appropriate client/API authentication mechanism from the backend owner. Do not expose the Navamsha key.

---

# 3. Backend setup

From the project root:

```cmd
npm install
```

Create `.env`:

```cmd
copy .env.example .env
```

Configure:

```env
NODE_ENV=development
PORT=8000

NAVAMSHA_BASE_URL=https://api.navamsha.in
NAVAMSHA_API_KEY=YOUR_NAVAMSHA_KEY
NAVAMSHA_AYANAMSHA=lahiri
NAVAMSHA_OBSERVATION_POINT=geocentric

BHAVISHYA_INTERNAL_API_KEY=YOUR_INTERNAL_SECRET

NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
GEOCODER_USER_AGENT=BhavishyaKatha/1.1
GEOCODER_TIMEOUT_MS=10000

CORS_ORIGIN=*
NAVAMSHA_TIMEOUT_MS=15000
NAVAMSHA_MAX_RETRIES=2
```

Start development server:

```cmd
npm run dev
```

Expected:

```text
Bhavishya Katha Kundali API listening on http://localhost:8000
```

---

# 4. Health check

Before testing Kundali generation:

```cmd
curl http://localhost:8000/health
```

Expected:

```json
{
  "status": "ok",
  "service": "bhavishya-kundali-api",
  "version": "1.3.5"
}
```

---

# 5. Kundali API

## Endpoint

```text
POST /api/v1/kundali/generate
```

Local development URL:

```text
http://localhost:8000/api/v1/kundali/generate
```

Production URL will be different.

---

# 6. Request authentication

Current development authentication:

```http
X-Bhavishya-API-Key: YOUR_INTERNAL_API_KEY
```

Example:

```cmd
curl -X POST "http://localhost:8000/api/v1/kundali/generate" ^
  -H "X-Bhavishya-API-Key: YOUR_INTERNAL_API_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\"birth\":{\"date\":\"1995-08-15\",\"time\":\"14:30:00\",\"place\":\"Kolkata, West Bengal, India\"},\"include\":{\"d1\":true,\"d9\":true,\"vimshottari\":true}}"
```

---

# 7. Request body

The mobile app sends only three birth inputs:

```json
{
  "birth": {
    "date": "1995-08-15",
    "time": "14:30:00",
    "place": "Kolkata, West Bengal, India"
  },
  "include": {
    "d1": true,
    "d9": true,
    "vimshottari": true
  }
}
```

## Birth date

Format:

```text
YYYY-MM-DD
```

Example:

```text
1995-08-15
```

## Birth time

Format:

```text
HH:mm:ss
```

Example:

```text
14:30:00
```

24-hour format.

`HH:mm` is also accepted by the backend and will be normalized to seconds.

## Birth place

Send the human-readable place selected/entered by the user.

Example:

```text
Kolkata, West Bengal, India
```

The mobile app does NOT need to send:

```text
latitude
longitude
timezone
UTC offset
```

The backend handles those.

---

# 8. Include options

The request can control which major sections are calculated.

```json
"include": {
  "d1": true,
  "d9": true,
  "vimshottari": true
}
```

### D1

```json
"d1": true
```

Returns the main birth chart:

- Ascendant
- Planets
- Signs
- Houses
- Nakshatras
- Planetary degrees
- Retrograde status

### D9

```json
"d9": true
```

Returns the Navamsha / D9 placements.

### Vimshottari

```json
"vimshottari": true
```

Returns:

- Current/birth balance information
- Mahadasha sequence
- Start date
- End date
- Duration

For the normal Kundali screen, all three can be requested together.

---

# 9. Place handling

The mobile app sends:

```text
Kolkata, West Bengal, India
```

The backend resolves this to coordinates and timezone.

Example:

```json
"place": {
  "input": "Kolkata, West Bengal, India",
  "displayName": "Kolkata, Kolkata Metropolitan Area, Kolkata, West Bengal, India",
  "latitude": 22.5726459,
  "longitude": 88.3638953,
  "timezone": "Asia/Kolkata",
  "utcOffsetMinutes": 330
}
```

The app should generally display `input` or its own selected place name to the user.

`displayName` is the geocoder's canonical description and should not be relied upon for UI formatting.

The coordinates/timezone are returned for transparency/debugging and future use. The app does not need to calculate them.

---

# 10. Response structure

Successful response:

```json
{
  "success": true,
  "data": {
    "schemaVersion": "1.0",
    "provider": {
      "name": "navamsha",
      "calculation": {
        "ayanamsha": "lahiri",
        "observationPoint": "geocentric"
      }
    },
    "birth": {
      "date": "1995-08-15",
      "time": "14:30:00",
      "place": {}
    },
    "charts": {
      "d1": {},
      "d9": {}
    },
    "dashas": {
      "vimshottari": {}
    }
  }
}
```

The mobile application should treat:

```text
data
```

as the main Kundali object.

---

# 11. Important: response contract

The response format is **owned by Bhavishya Katha**, not Navamsha.

The mobile application should consume:

```text
data.schemaVersion
data.birth
data.charts.d1
data.charts.d9
data.dashas.vimshottari
```

It should NOT depend on Navamsha-specific fields such as:

```text
current_sign
fullDegree
normDegree
isRetro
house_number
localized_name
zodiac_sign_name
nakshatra_number
```

The backend converts provider data into the Bhavishya Katha format.

This means the following future change should require **no React Native changes**:

```text
Navamsha
   ↓
Swiss Ephemeris
```

or:

```text
Navamsha API v2
   ↓
Bhavishya Katha API
```

as long as the response contract remains compatible.

---

# 12. D1 interpretation

The D1 chart is:

```text
data.charts.d1
```

## Ascendant

```text
data.charts.d1.ascendant
```

Example:

```json
{
  "position": {
    "longitude": 242.81288,
    "sign": {
      "id": 9,
      "name": "Sagittarius",
      "lord": "Jupiter"
    },
    "degree": 2,
    "minutes": 48,
    "seconds": 46.37,
    "retrograde": false
  },
  "house": 1,
  "nakshatra": {
    "number": 19,
    "name": "Mula",
    "pada": 1,
    "lord": "Ketu"
  }
}
```

For a UI showing:

```text
Ascendant: Sagittarius
```

use:

```text
data.charts.d1.ascendant.position.sign.name
```

For degree:

```text
data.charts.d1.ascendant.position.degree
data.charts.d1.ascendant.position.minutes
data.charts.d1.ascendant.position.seconds
```

For Nakshatra:

```text
data.charts.d1.ascendant.nakshatra.name
data.charts.d1.ascendant.nakshatra.pada
```

---

# 13. D1 planets

Planets are under:

```text
data.charts.d1.planets
```

Example:

```text
data.charts.d1.planets.Sun
data.charts.d1.planets.Moon
data.charts.d1.planets.Mars
data.charts.d1.planets.Mercury
data.charts.d1.planets.Jupiter
data.charts.d1.planets.Venus
data.charts.d1.planets.Saturn
data.charts.d1.planets.Rahu
data.charts.d1.planets.Ketu
```

Each planet contains:

```text
name
position
house
nakshatra
```

Example:

```json
{
  "name": "Sun",
  "position": {
    "longitude": 118.280013,
    "sign": {
      "id": 4,
      "name": "Cancer",
      "lord": "Moon"
    },
    "degree": 28,
    "minutes": 16,
    "seconds": 48.05,
    "retrograde": false
  },
  "house": 8,
  "nakshatra": {
    "number": 9,
    "name": "Ashlesha",
    "pada": 4,
    "lord": "Mercury"
  }
}
```

For a basic planet UI:

```text
Planet name:
planet.name

Sign:
planet.position.sign.name

Degree:
planet.position.degree
planet.position.minutes
planet.position.seconds

House:
planet.house

Retrograde:
planet.position.retrograde

Nakshatra:
planet.nakshatra.name

Pada:
planet.nakshatra.pada
```

---

# 14. D9 / Navamsha interpretation

D9 is:

```text
data.charts.d9
```

Planet placements are:

```text
data.charts.d9.placements
```

Example:

```json
"Jupiter": {
  "longitude": 221.976790,
  "sign": "Libra",
  "house": 7
}
```

So:

```text
D9 Jupiter sign = data.charts.d9.placements.Jupiter.sign
D9 Jupiter house = data.charts.d9.placements.Jupiter.house
```

The D9 response currently does not duplicate the D1-style degree/sign object. It follows the provider's D9 calculation output while keeping it under the Bhavishya Katha response contract.

---

# 15. Vimshottari interpretation

Vimshottari is:

```text
data.dashas.vimshottari
```

The current balance:

```text
data.dashas.vimshottari.balance
```

Example:

```json
{
  "lord": "Mercury",
  "elapsedFraction": 0.77915,
  "remainingFraction": 0.22084,
  "balanceYears": 3.7544
}
```

Mahadashas:

```text
data.dashas.vimshottari.mahadashas
```

Each entry contains:

```text
lord
start
end
durationDays
```

Example:

```json
{
  "lord": "Venus",
  "start": "2006-05-17T15:41:59.368593+05:30",
  "end": "2026-05-17T15:41:59.368593+05:30",
  "durationDays": 7305
}
```

The mobile UI can format the ISO timestamps into the desired local date format.

Do not hard-code the Mahadasha dates in the app.

---

# 16. Error responses

Errors follow:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Possible errors include:

### Validation

```text
VALIDATION_ERROR
```

Bad/missing date, time, place, etc.

### Place not found

```text
PLACE_NOT_FOUND
```

The selected place could not be resolved.

### Geocoder error

```text
GEOCODER_ERROR
```

The place lookup provider failed.

### Provider error

```text
NAVAMSHA_PROVIDER_ERROR
```

Navamsha returned an error.

### Unauthorized

```text
UNAUTHORIZED
```

The request did not contain the correct Bhavishya API authentication.

### Internal error

```text
INTERNAL_ERROR
```

Unexpected backend error.

The mobile app should show a generic user-friendly message rather than exposing technical error details.

---

# 17. Recommended React Native flow

The mobile developer should implement approximately:

```text
User enters/selects:

Date
Time
Place
     |
     v
POST /api/v1/kundali/generate
     |
     v
Show loading state
     |
     +---- success ----> Store JSON
     |                    |
     |                    +--> D1 screen
     |                    +--> D9 screen
     |                    +--> Dasha screen
     |
     +---- error -------> Show friendly error
```

The mobile app should not perform the astrology calculations.

---

# 18. What the mobile app should store

For the current MVP, the app can store the returned JSON object if needed.

At minimum, retain:

```text
birth
charts.d1
charts.d9
dashas.vimshottari
schemaVersion
```

Do not store:

```text
NAVAMSHA_API_KEY
```

The provider key must never be present in the mobile bundle, source code, AsyncStorage, logs, or network request.

---

# 19. Development vs production

## Development

Current:

```text
React Native
     ↓
http://localhost:8000
```

If the mobile app is running on a physical Android/iOS device, `localhost` refers to the device itself, not the development PC.

Use the development computer's LAN IP, for example:

```text
http://192.168.1.10:8000
```

The PC firewall must allow the port.

## Production

The mobile app should eventually call something like:

```text
https://api.bhavishyakathi.com
```

The exact production domain will be decided later.

The mobile application should keep the backend base URL configurable so development/staging/production can be switched without changing the API logic.

---

# 20. Current calculation configuration

The backend currently requests:

```text
Ayanamsha: Lahiri
Observation point: Geocentric
```

These are backend settings.

The mobile app should NOT send or modify them.

If the calculation system changes later, the backend owns that change.

---

# 21. Current limitations

This is an MVP implementation.

### Place lookup

Nominatim is currently used for geocoding.

It is suitable for development/testing but should be replaced with a production-grade geocoding solution before significant traffic.

### Timezone

For the current Indian launch, Indian coordinates resolve to:

```text
Asia/Kolkata
UTC +05:30
```

International timezone handling should be upgraded before international launch.

### Storage

The current backend uses in-memory caching.

It is not persistent and will be lost when the server restarts.

### Authentication

The current `X-Bhavishya-API-Key` is suitable for the current development stage. Production authentication should eventually be tied to Bhavishya Katha users/session tokens.

---

# 22. Testing

Run:

```cmd
npm test
```

Build:

```cmd
npm run build
```

Start compiled application:

```cmd
npm start
```

---

# 23. API contract rule

**This is the most important rule for the mobile developer:**

> Do not build the mobile app around Navamsha's API response.

Build it around:

```text
Bhavishya Katha API v1
schemaVersion: "1.0"
```

If the backend changes its astrology provider, calculation engine, database, geocoder, or internal implementation, the mobile app should continue working as long as the Bhavishya Katha response contract remains compatible.

---

# 24. Frozen API contract and request IDs

The mobile-facing Kundali response contract is frozen at:

```text
schemaVersion: "1.0"
```

The backend validates every successful response against the Bhavishya Katha response schema before returning HTTP 200.

This protects the mobile application from malformed or unexpected provider data.

If the provider returns data that cannot be converted into the frozen contract, the backend returns:

```json
{
  "error": {
    "code": "INVALID_PROVIDER_DATA",
    "message": "Unable to generate a valid Kundali response."
  },
  "requestId": "..."
}
```

Every API response includes:

```http
X-Request-ID: <request-id>
```

If the client supplies a valid `X-Request-ID`, the API preserves it. Otherwise the API generates one.

The same ID is included in error responses:

```json
{
  "error": {
    "code": "ASTROLOGY_CALCULATION_FAILED",
    "message": "Unable to calculate the requested Kundali right now."
  },
  "requestId": "..."
}
```

The mobile developer should log the request ID when a Kundali request fails. It can then be given to the backend team for troubleshooting.

Provider-specific failures are intentionally hidden from the user-facing message. Internal server logs retain the provider operation (`d1`, `d9`, `vimshottari`, or `panchang`) and diagnostic details.

\n\n---\n\n# Derived Moon chart\n\nThe Moon chart is derived locally from the already-fetched D1 data. It makes no additional Navamsha API call. The Moon's sign is treated as house 1 and planetary houses are recalculated relative to it. Future derived views should follow the same reuse-first rule.\n

---

# Panchang

Panchang is optional and is controlled by:

```json
"include": {
  "d1": true,
  "d9": true,
  "vimshottari": true,
  "panchang": true
}
```

When enabled, the Bhavishya Katha API makes **one** provider call to the verified live Navamsha endpoint:

```text
POST /api/v1/astrology/panchang
```

The provider request uses:

- birth date
- birth time
- resolved latitude
- resolved longitude
- timezone
- Lahiri ayanamsha
- geocentric observation point
- English response language

The mobile application never calls Navamsha directly.

The normalized result is returned as:

```json
"panchang": {
  "vaara": "Monday",
  "nakshatra": [],
  "tithi": [],
  "karana": [],
  "yoga": [],
  "sunrise": "...",
  "sunset": "...",
  "moonrise": "...",
  "moonset": "..."
}
```

### Verified Navamsha response

The live endpoint was tested successfully and returned:

- Vaara
- Nakshatra and lord, with start/end
- Tithi, Paksha, with start/end
- Karana, with start/end
- Yoga, with start/end
- Sunrise
- Sunset
- Moonrise
- Moonset

### Provider usage rule

Do not add separate provider calls for information already present in the existing response. For example, the Moon chart is derived locally from D1 and does not consume another Navamsha request.

Panchang is different because its date-specific values are not contained in the birth-chart response, so it uses one dedicated provider call when explicitly requested.

### Environment setup

Copy `.env.example` to `.env` before running the API:

```cmd
copy .env.example .env
```

Then set your real `NAVAMSHA_API_KEY` and `BHAVISHYA_INTERNAL_API_KEY` in `.env`.

The example file intentionally contains placeholders and must not contain production secrets. The Nominatim user agent is set to `BhavishyaKatha/1.1`, which is the configuration used during the verified working geocoding test.


## Latitude / longitude input

`birth.latitude` and `birth.longitude` are now supported. Supply both together to bypass Nominatim geocoding. `birth.place` may still be supplied for display; if coordinates are present it is not used for lookup. If coordinates are omitted, the existing place-name geocoding flow is used.

Example:

```json
{"birth":{"date":"1995-08-15","time":"14:30:00","place":"Kolkata, West Bengal, India","latitude":22.5726459,"longitude":88.3638953},"include":{"d1":true,"d9":true,"vimshottari":true}}
```


# 16. Chart images (Base64)

The API can optionally return ready-to-display Kundali chart images. The mobile app does **not** need to implement North Indian chart geometry.

Enable them with:

```json
{
  "include": {
    "d1": true,
    "d9": true,
    "vimshottari": true,
    "charts": true
  }
}
```

When enabled, the response contains `data.charts.images`. Images are generated in memory and returned as PNG Base64; they are not stored on the server.

```json
"images": {
  "lagna": {
    "format": "png",
    "encoding": "base64",
    "mimeType": "image/png",
    "width": 800,
    "height": 800,
    "data": "iVBORw0KGgo..."
  },
  "navamsa": { "...": "..." },
  "moon": { "...": "..." }
}
```

Current generated images:

- `lagna` — D1/Rasi chart
- `navamsa` — D9/Navamsa chart
- `moon` — Moon reference chart

The mobile application should decode the Base64 string into image bytes and display it using its normal image component. It should not call Navamsha directly.

## Chart rendering options

The renderer is generic internally and receives a normalized house/sign/planet representation. D1, D9 and Moon charts are adapters into the same renderer. This means future divisional charts can reuse the renderer without changing the mobile contract.

The current request keeps `include.charts` as a simple boolean for backward compatibility. Optional rendering settings are supplied as `include.chartOptions`:

```json
{
  "include": {
    "d1": true,
    "d9": true,
    "charts": true,
    "chartOptions": {
      "layout": "north_indian",
      "planetDisplay": "vedic",
      "includeOuterPlanets": false,
      "degreePrecision": 2
    }
  }
}
```

### `layout`

Currently supported:

```text
north_indian
```

The renderer is structured so additional layouts can be added without changing D1/D9/Moon calculation code.

### `planetDisplay`

`vedic` is the default and displays the traditional Vedic set:

```text
Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu
```

Use:

```json
"planetDisplay": "all"
```

to display all planets available from the calculation response, including Uranus, Neptune and Pluto.

### `includeOuterPlanets`

This is an explicit override. Set it to `true` to include Uranus, Neptune and Pluto even when `planetDisplay` is `vedic`.

```json
"includeOuterPlanets": true
```

The default is `false` because the normal Bhavishya Katha Vedic Kundali should not display the outer planets unless requested.

### `degreePrecision`

Controls the number of decimal places shown for planetary degrees inside a sign. Default:

```text
2
```

For example, a planet at 21 degrees 25 minutes is rendered using its actual longitude as approximately:

```text
21.43°
```

The renderer no longer rounds the position to the nearest whole degree. The underlying API calculation data remains unchanged.

### Rendered chart labels

The renderer does not expose internal calculation labels such as `Ref: Sg`, `Ref: Pi` or `Ref: Ar`. The chart displays only the user-facing chart title, signs, ascendant and planetary placements.

### Base64 payload note

Base64 increases the image payload by roughly one third. Therefore chart images are opt-in and are not returned unless:

```text
include.charts = true
```

For normal Kundali calculation screens, request charts only when the UI actually needs the images.
