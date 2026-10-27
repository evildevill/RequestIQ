# Chrome Web Store Submission Notes

## Single purpose

RequestIQ is a developer tool for inspecting and debugging network requests from one browser tab selected by the user.

## Suggested store description

Inspect and debug network requests from the browser tab you choose. RequestIQ shows URLs, methods, headers, status codes, timing, request metadata, and local security indicators. Capture is off by default and starts only after you click **Start Capture** in the extension popup. RequestIQ attaches to one tab at a time and does not monitor other tabs automatically. Captured data stays in your browser unless you explicitly export it.

Network requests can contain authentication tokens, cookies, API keys, and personal information. Start capture only on a tab you intend to inspect. Chrome displays a debugging notification while capture is active.

## Permission justifications

- **debugger** — Required to attach to the user-selected tab and receive Chrome DevTools Protocol Network events, including request/response headers and timing. The extension attaches only after the user clicks Start Capture and detaches when Stop is clicked.
- **storage** — Required to save preferences and temporarily cache captured requests for the side panel, filtering, statistics, and export features.
- **sidePanel** — Required to provide the persistent request inspection interface.

The extension does not request broad host permissions, `activeTab`, `tabs`, or `webRequest`. It does not inject scripts into websites. The unused legacy page-injection files were removed.

## User data disclosure

The extension processes network activity from the selected tab. URLs, headers, and request bodies may contain authentication information, cookies, API keys, and personal information. RequestIQ uses this data only to provide the inspection, filtering, local security-analysis, and export features. Captured data is stored locally in Chrome session storage and is not uploaded by the extension. User-initiated exports may be shared by the user outside the extension.

The popup presents this disclosure before the Start Capture action. The user must click Start Capture to begin processing network activity.

## Before submitting

1. Upload the current package from the reviewed branch after local testing.
2. Set the Chrome Web Store privacy-policy URL to the public `PRIVACY.md` page in the repository.
3. Complete the Dashboard's data-use disclosures accurately, including web browsing activity and authentication information processed during capture.
4. Explain the debugger permission and the explicit, single-tab capture workflow in the permission justification.
5. Ensure screenshots and listing copy show the Start Capture / Stop workflow and do not imply passive monitoring.
6. Test install, capture, stop, tab switching, navigation, restricted browser pages, export, settings, and the debugging notification on a clean Chrome profile.

This file is submission guidance, not a guarantee of approval. Chrome Web Store reviewers make the final determination.
