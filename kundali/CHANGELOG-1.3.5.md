# Changelog — 1.3.5

## Chart rendering improvements

- Removed internal `Ref: ...` labels from rendered charts.
- Chart planet degrees now use the actual ecliptic longitude within the sign, rendered to configurable decimal precision (default: 2 decimals).
- Added configurable planet display mode: traditional Vedic planets by default, or all available planets including Uranus/Neptune/Pluto.
- Refactored rendering around a generic `renderChart()` engine with chart-specific adapters for D1, D9 and Moon charts.
- Added chart rendering options to the request contract while keeping `include.charts: true` backward compatible.
- Default rendering remains North Indian and PNG/Base64; no chart files are stored on the server.
