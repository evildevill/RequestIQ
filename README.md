# RequestIQ – Network & API Inspector

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="#"><img src="https://img.shields.io/badge/version-1.0.1-8b5cf6.svg" alt="Version 1.0.1"></a>
  <a href="#"><img src="https://img.shields.io/badge/Manifest-V3-ff6b6b.svg" alt="Manifest V3"></a>
  <a href="#"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
  <a href="#"><img src="https://img.shields.io/badge/Chrome-116%2B-4285F4.svg" alt="Chrome 116+"></a>
  <a href="#"><img src="https://img.shields.io/badge/Edge-116%2B-0078D7.svg" alt="Edge 116+"></a>
  <a href="#"><img src="https://img.shields.io/badge/Brave-supported-f5426c.svg" alt="Brave"></a>
  <a href="#"><img src="https://img.shields.io/badge/chrome.debugger-CDP-ffca28.svg" alt="chrome.debugger"></a>
</p>

<p align="center">
  <b>Inspect every network request your browser makes — without opening DevTools.</b>
  <br>
  A production-grade Chrome extension built with Manifest V3 and modern Chrome APIs.
  <br>
  <a href="CHROMEWEBSTORE.md"><strong>Chrome Web Store listing »</strong></a>
  ·
  <a href="PRIVACY.md"><strong>Privacy »</strong></a>
  ·
  <a href="CONTRIBUTING.md"><strong>Contributing »</strong></a>
  ·
  <a href="SECURITY.md"><strong>Security »</strong></a>
</p>

## Installation

1. Open Chrome/Edge/Brave and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `RequestIQ/` directory

The extension icon will appear in the toolbar. Click it to open the side panel.

## Project Structure

```
RequestIQ/
├── manifest.json              # Extension manifest (MV3)
├── LICENSE                    # MIT License
├── CHANGELOG.md               # Release history
├── CONTRIBUTING.md            # Contribution guide
├── SECURITY.md                # Security policy
├── CHROMEWEBSTORE.md          # Store listing & permission justifications
├── PRIVACY.md                 # Data handling and privacy policy
├── store-assets/              # Screenshots & promo tiles
├── images/
│   ├── icon.svg               # Source icon (SVG)
│   └── icon*.png              # PNG icons for CWS (16/32/48/128)
├── background/
│   └── service-worker.js      # Background service worker (ES module)
├── popup/
│   ├── popup.html             # Popup UI
│   ├── popup.css              # Popup styles
│   └── popup.js               # Popup logic
├── sidepanel/
│   ├── sidepanel.html         # Side panel UI (main interface)
│   ├── sidepanel.css          # Side panel styles
│   └── sidepanel.js           # Side panel logic
└── shared/
    ├── storage.js             # Storage abstractions
    ├── messaging.js           # Message passing utilities
    └── utils.js               # Shared utilities
```

## Architecture

### Data Flow

```
User clicks Start Capture in the popup
    │
    └── Active Tab ── chrome.debugger API (CDP) ──→ Service Worker
                                                     │
                                                     ├── chrome.storage.session
                                                     └── Real-time updates via Port
                                                           ├── Side Panel
                                                           └── Popup
```

### Chrome APIs Used

| API | Purpose |
|-----|---------|
| `chrome.debugger` | Primary capture mechanism. Attaches to a tab via CDP and receives all network events at the browser level. |
| `chrome.sidePanel` | Opens the main UI in Chrome's side panel for persistent monitoring. |
| `chrome.storage` | `storage.local` for settings persistence. `storage.session` for in-memory request cache. |
| `chrome.runtime` | Message passing between components via `connect()` (long-lived ports) and `sendMessage()`. |
| `chrome.tabs` | Identifies the active tab only when the user clicks Start Capture; tracks that tab's navigation and closure. |
| `chrome.action` | Toolbar icon integration with `openPanelOnActionClick`. |

### Why chrome.debugger over webRequest?

In Manifest V3, `webRequest` in blocking mode is deprecated. The non-blocking `webRequest` can observe requests but requires host permissions. The `chrome.debugger` API:

- Captures **everything** (including subresource loads like images, fonts, stylesheets)
- Requires only the `"debugger"` permission (no host permissions needed)
- Provides full CDP Network events (request/response headers, timing, post data)
- More privacy-preserving: only observes the specific tab it's attached to

### Limitations

- **DevTools conflict**: Chrome DevTools also uses the debugger. Opening DevTools while the extension is attached will detach the extension's debugger. The extension automatically re-attaches when DevTools closes.
- **Service worker lifecycle**: MV3 service workers can be terminated after ~30s of inactivity. Debugger events keep the worker alive during capture.
- **Debugger notification**: Chrome shows "RequestIQ started debugging this browser" while capture is active. Chrome controls this warning; RequestIQ cannot hide it.
- **Explicit capture**: No capture starts on installation or browser startup. Click the extension icon, then **Start Capture** to attach to the currently active tab. Click **Stop** to detach.
- **Single-tab scope**: RequestIQ does not attach to newly opened tabs or other existing tabs. To inspect another tab, stop capture, select that tab, and start capture again.
- **DevTools conflict**: If Chrome detaches RequestIQ because DevTools takes over, capture stops; start it again explicitly if needed.

## Permissions

| Permission | Why |
|------------|-----|
| `"debugger"` | Core permission for capturing network traffic via the Chrome DevTools Protocol (CDP). |
| `"storage"` | Persists user settings and caches request data. |
| `"sidePanel"` | Enables the side panel API for the main UI. |

The manifest does not request `activeTab`, `tabs`, `webRequest`, or any host permissions. RequestIQ uses the active tab ID only after the user clicks **Start Capture**, then attaches the debugger to that tab. It does not inject scripts into websites or monitor tabs in the background.

## Features

### Capture
- Every request type: `fetch()`, `XMLHttpRequest`, WebSocket, EventSource, `navigator.sendBeacon()`, images, scripts, stylesheets, fonts, documents, media, and more
- Uses Chrome DevTools Protocol (`Network.enable`) for comprehensive capture
- Uses browser-level CDP events; no page script injection is required

### Display
- Virtual-scrolled table for 10,000+ requests without lag
- Columns: Method, Host, Path, Status, Type, Time, Duration
- Click-to-expand detail panel with full request/response data
- Security audit badges and color-coded rows

### Filtering & Search
- Instant search across URL, hostname, path, method, and type
- Filter by HTTP method, resource type, status code
- Security alerts-only mode
- Debounced input for performance

### Security Audit Mode
Automatically detects and highlights:
- **Authentication**: Bearer tokens, JWT, API keys, Authorization headers, cookies
- **Secrets in URLs**: `apikey`, `secret`, `token`, `jwt`, `access_token`, etc.
- **Interesting paths**: `/admin`, `/graphql`, `/swagger`, `/api`, `/auth`, `/login`
- **Suspicious parameters**: `email`, `password`, `token`, `session`, `uid`
- **Cloud providers**: AWS, Azure, GCP, Cloudflare, Firebase, Vercel, and more
- **AI providers**: OpenAI, Anthropic, Google Gemini, Mistral, DeepSeek, Groq, and more

### Statistics
- Total requests, unique domains, GET/POST counts
- Failed requests, average response time, largest response
- Most requested domain

### Export
- JSON, CSV, HAR (HTTP Archive), Markdown, and Plain Text
- One-click export from the toolbar

### Settings
- Configurable max history (100/500/1,000/5,000/unlimited)
- Ignored domains, resource types, and methods
- Dark/Light theme
- Persistent across sessions

## Message Passing

The extension uses `chrome.runtime.connect()` for long-lived port connections between the side panel/popup and the service worker. This enables:

- **Real-time streaming**: New requests are pushed to the UI as they arrive
- **Request-response**: Query historical data, stats, and settings
- **Reconnection**: Ports auto-reconnect if the service worker restarts

## Storage

- **chrome.storage.session**: In-memory cache for the current session's requests (10MB limit, cleared on browser restart)
- **chrome.storage.local**: Persistent settings (themes, ignored domains, configuration)
- Requests are trimmed to the configured max history to stay within storage quotas

## Testing Checklist

### Manual Tests
- [ ] Extension loads without errors
- [ ] Side panel opens on toolbar click
- [ ] Popup shows correct status
- [ ] No debugger warning appears until Start Capture is clicked
- [ ] Requests appear only in the tab where capture was started
- [ ] All request types are captured
- [ ] Filtering works (by method, type, status, text search)
- [ ] Security alerts appear for auth headers
- [ ] Detail panel shows all fields
- [ ] Export produces valid JSON/CSV/HAR
- [ ] Clear button removes all requests
- [ ] Pause/Resume works
- [ ] Settings persist across browser restart

### Edge Cases
- [ ] Tab navigation remains scoped to the selected capture tab
- [ ] New tabs are not attached automatically
- [ ] DevTools open (graceful handling)
- [ ] 10,000+ requests (no lag)
- [ ] Restricted pages (Chrome Web Store, chrome://, and extension pages) reject capture gracefully
- [ ] chrome:// URLs (no debugger access)
- [ ] Extension update (state preservation)

### Stress Test
- Navigate to a heavy page (e.g., Google Docs, Notion, Figma)
- Let it run for 5+ minutes
- Verify no memory leaks in `chrome://extensions` > Inspect views > Service Worker
- Test filtering with thousands of visible requests
- Verify scrolling performance

## Known Limitations

1. **Restricted pages**: Chrome restricts debugger access on browser-internal pages and the Chrome Web Store.
2. **DevTools conflict**: Only one debugger can be attached at a time; if Chrome detaches RequestIQ, start capture again.
3. **Service worker lifecycle**: The Manifest V3 worker may stop while idle. Capture is user-started and is not automatically re-enabled after a worker restart.
4. **WebSocket payloads**: The debugger reports WebSocket frames but RequestIQ does not store complete frame payload history.

## Future Improvements

- [ ] GraphQL query/response inspection
- [ ] Request replay/modification
- [ ] Advanced HAR analysis
- [ ] Bandwidth monitoring dashboard
- [ ] Custom alert/webhook integration
- [ ] Request blocking via declarativeNetRequest
- [ ] Comparison mode (before/after navigation)
- [ ] Performance waterfall visualization
