# Network Inspector

A production-grade Chrome extension for inspecting every network request made by your browser tab. Built with Manifest V3 and modern Chrome APIs.

## Installation

1. Open Chrome/Edge/Brave and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `network-inspector/` directory

The extension icon will appear in the toolbar. Click it to open the side panel.

## Project Structure

```
network-inspector/
├── manifest.json              # Extension manifest (MV3)
├── images/
│   └── icon.svg               # Application icon
├── background/
│   └── service-worker.js      # Background service worker (ES module)
├── content/
│   ├── content.js             # Content script (isolated world)
│   └── injected.js            # Injected script (page context)
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
Browser Tab
    │
    ├── chrome.debugger API (CDP) ──→ Service Worker ──→ chrome.storage.session
    │                                   │
    │                                   ├── Real-time updates via Port
    │                                   │       │
    │                                   │       ├── Side Panel (main UI)
    │                                   │       └── Popup (quick status)
    │                                   │
    │                                   └── On-request queries
    │
    └── Injected Script (fallback) ──→ Content Script ──→ Service Worker
```

### Chrome APIs Used

| API | Purpose |
|-----|---------|
| `chrome.debugger` | Primary capture mechanism. Attaches to a tab via CDP and receives all network events at the browser level. |
| `chrome.sidePanel` | Opens the main UI in Chrome's side panel for persistent monitoring. |
| `chrome.storage` | `storage.local` for settings persistence. `storage.session` for in-memory request cache. |
| `chrome.runtime` | Message passing between components via `connect()` (long-lived ports) and `sendMessage()`. |
| `chrome.tabs` | Gets active tab info and monitors tab lifecycle. |
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
- **Debugger notification**: Chrome shows "Extension X started debugging this browser" when the debugger attaches.
- **Tab navigation**: Debugger detaches on navigation; the extension auto-re-attaches.

## Permissions

| Permission | Why |
|------------|-----|
| `"debugger"` | Core permission for capturing all network traffic via CDP. No host permissions needed. |
| `"storage"` | Persists user settings (ignored domains, max history, theme) and caches request data. |
| `"sidePanel"` | Enables the side panel API for the main UI. |
| `"activeTab"` | Gets the current tab's URL and metadata for display. Revoked on tab change. |

We intentionally do NOT request `"<all_urls>"`, `"webRequest"`, or `"tabs"` permissions.

## Features

### Capture
- Every request type: `fetch()`, `XMLHttpRequest`, WebSocket, EventSource, `navigator.sendBeacon()`, images, scripts, stylesheets, fonts, documents, media, and more
- Uses Chrome DevTools Protocol (`Network.enable`) for comprehensive capture
- Falls back to JavaScript instrumentation for additional context

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
- JSON, CSV, and HAR (HTTP Archive) formats
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
- [ ] Requests appear when browsing
- [ ] All request types are captured
- [ ] Filtering works (by method, type, status, text search)
- [ ] Security alerts appear for auth headers
- [ ] Detail panel shows all fields
- [ ] Export produces valid JSON/CSV/HAR
- [ ] Clear button removes all requests
- [ ] Pause/Resume works
- [ ] Settings persist across browser restart

### Edge Cases
- [ ] Tab navigation (debugger re-attaches)
- [ ] DevTools open (graceful handling)
- [ ] 10,000+ requests (no lag)
- [ ] Chrome Web Store pages (content script restrictions)
- [ ] chrome:// URLs (no debugger access)
- [ ] Extension update (state preservation)

### Stress Test
- Navigate to a heavy page (e.g., Google Docs, Notion, Figma)
- Let it run for 5+ minutes
- Verify no memory leaks in `chrome://extensions` > Inspect views > Service Worker
- Test filtering with thousands of visible requests
- Verify scrolling performance

## Known Limitations

1. **Cannot inspect Chrome Web Store or chrome:// pages**: Chrome restricts debugger access on these pages
2. **DevTools conflict**: Only one debugger can be attached at a time
3. **Service worker wake-up**: After ~30s of inactivity, the service worker may terminate; it restarts on the next tab event
4. **WebSocket payloads**: The debugger reports WebSocket frames but doesn't capture full payload history due to memory constraints

## Future Improvements

- [ ] GraphQL query/response inspection
- [ ] Request replay/modification
- [ ] Advanced HAR analysis
- [ ] Bandwidth monitoring dashboard
- [ ] Custom alert/webhook integration
- [ ] Request blocking via declarativeNetRequest
- [ ] Comparison mode (before/after navigation)
- [ ] Performance waterfall visualization
