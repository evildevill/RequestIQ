# RequestIQ Privacy Policy

**Effective date:** 27 October 2026

RequestIQ is a browser-based network and API inspection tool. This policy describes what the extension accesses, how it uses that information, and where it is stored.

## Information processed

When you explicitly click **Start Capture**, RequestIQ attaches Chrome's DevTools Protocol debugger to the currently active browser tab. While capture is active, it processes network metadata for that tab, which can include:

- Request URLs and query parameters
- HTTP methods, resource types, status codes, timing, and approximate transfer sizes
- Request and response headers
- Request bodies when Chrome exposes them through the DevTools Protocol
- WebSocket connection metadata and frame sizes

Network traffic can contain sensitive information, including authentication headers, cookies, API keys, account identifiers, personal information, and other secrets. Only start capture on a tab you intend to inspect.

## How information is used

The information is used only to display network activity, filter and analyze requests, run local security checks, and let you export the captured data at your direction.

## Storage and sharing

- Captured requests are kept in Chrome's session storage and in the extension's memory for the current browser session.
- Preferences are stored locally in Chrome extension storage.
- RequestIQ does not upload captured requests, request headers, request bodies, or browsing activity to a server. It does not include analytics, advertising, or third-party data-sharing code.
- Exporting a file is an action initiated by you. You control where you save or share that file.
- Captured session data is cleared when the browser session ends, or earlier when you use the Clear action. Preferences remain until you change or remove them.

## User control

Capture is off by default. It begins only after you open the extension popup and click **Start Capture**. It is limited to the tab that was active at that time; other tabs are not attached automatically. Click **Stop** to detach the debugger. Chrome displays its own debugging notification while the debugger is attached; RequestIQ cannot suppress that browser notification.

## Permissions

- `debugger`: attach to the selected tab and receive Chrome DevTools Protocol network events after you explicitly start capture.
- `storage`: store preferences and temporary captured request data locally.
- `sidePanel`: provide the main inspection interface.

RequestIQ does not request broad website host permissions, `tabs`, `activeTab`, or `webRequest`.

## Children's privacy

RequestIQ is a developer tool and is not designed specifically for children.

## Changes to this policy

This policy will be updated if RequestIQ's data practices change. The effective date above indicates the latest revision.

## Contact

For privacy questions or requests, open an issue in the [RequestIQ GitHub repository](https://github.com/evildevill/RequestIQ/issues).
