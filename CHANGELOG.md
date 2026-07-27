# Changelog

## [1.0.0] — 2026-07-27

Initial release.

### Added

- **Network capture**: Real-time capture of all request types via `chrome.debugger` API (CDP) — fetch, XHR, WebSocket, EventSource, beacon, images, scripts, stylesheets, fonts, media, documents
- **Injected script polyfill**: Monkey-patches `fetch()`, `XMLHttpRequest`, `sendBeacon()`, `WebSocket`, and `EventSource` in the page context for request body capture
- **Side panel UI**: Virtual-scrolled table supporting 10,000+ requests, columns for method/host/path/status/type/time/duration, auto-scroll, click-to-expand detail view
- **Security audit**: Automatic detection of auth tokens, JWT, API keys, secrets in URLs, interesting paths, suspicious query parameters, 14 cloud providers, 12+ AI providers — with severity-coded badges
- **Filtering & search**: Free-text search, filters for HTTP method, resource type, status code, security alerts-only mode
- **Statistics**: Total requests, unique domains, method breakdown, failures, avg time, largest response, top domain
- **Export**: JSON, CSV, HAR (HTTP Archive), Markdown, and Plain Text
- **Pause/Resume**: Full debugger detach on pause (no CPU, no "debugging" notification), re-attach on resume
- **Settings**: Max history (100/500/1K/5K/unlimited), ignored domains/types/methods, dark/light theme — persisted via `chrome.storage.local`
- **Popup**: Quick status view with open-panel action
- **Tab lifecycle**: Auto-attaches to existing and new tabs, re-attaches on navigation, handles DevTools conflict gracefully
- **PNG icons**: 16/32/48/128 converted from SVG for Chrome Web Store compatibility

### Changed

- N/A (initial release)

### Fixed

- N/A (initial release)

### Security

- Zero telemetry — all data stays local, no external servers, no analytics
- No host permissions required — uses `chrome.debugger` instead of `webRequest`/`<all_urls>`
- Content script runs in `ISOLATED` world — target page cannot access extension internals
