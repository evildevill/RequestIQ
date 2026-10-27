# Changelog

## 1.0.1 — 2026-10-27

- Removed automatic debugger attachment on install, browser startup, and tab creation.
- Added explicit Start Capture and Stop controls in the popup.
- Limited debugger capture to one selected tab at a time.
- Removed unused page-injection code and broad `<all_urls>` script matches.
- Added a prominent local data-handling disclosure before capture starts.
- Added Copy All for complete request details.
- Escaped request-derived values in the request list and hardened detail rendering.
- Fixed request duration calculation and WebSocket session finalization.
- Removed the unused `activeTab` permission and updated store documentation.

## 1.0.0

- Initial RequestIQ release.
