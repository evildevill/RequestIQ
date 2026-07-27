# Contributing to RequestIQ

## Code of Conduct

By participating, you agree to maintain a respectful, inclusive, and constructive environment.

## How to Contribute

### Reporting Bugs

1. Search existing [issues](https://github.com/evildevill/RequestIQ/issues) first
2. If no existing issue matches, create a new one with:
   - Chrome version and OS
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if applicable)
   - Console errors from `chrome://extensions` > Inspect views

### Feature Requests

Open an issue with the `enhancement` label describing:
- What you want to achieve
- Why existing functionality doesn't cover it
- A sketch of the solution (optional)

### Pull Requests

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test manually using the checklist in `README.md`
5. Commit with a clear message
6. Push and open a PR targeting `main`

## Development Setup

```bash
git clone https://github.com/evildevill/RequestIQ.git
cd RequestIQ
```

Load the extension in Chrome:
1. Open `chrome://extensions`
2. Enable Developer mode
3. Click **Load unpacked**
4. Select the `RequestIQ/` directory

## Code Style

- **No semicolons** — match the existing code style
- **No comments** in production code (JSDoc-style comments are acceptable for complex logic)
- Use `const`/`let`, never `var`
- Async/await over raw promises
- Template literals over string concatenation
- Early returns over nested if-blocks
- Descriptive variable names, not abbreviations

## Architecture Notes

- `background/service-worker.js`: ES module, single entry point for all Debugger API interaction
- `shared/` utilities: Pure functions with no side effects, easy to test
- Side panel: Virtual-scrolled table in `sidepanel/sidepanel.js` — keep rendering logic decoupled from data fetching
- Content script: Minimal bridge; heavy lifting belongs in `injected.js`
- Message passing: Use the Port-based pattern in `shared/messaging.js` — not `chrome.runtime.sendMessage` for streaming data

## Testing

The extension currently has manual test procedures. See `README.md` for the full checklist. Automated test contributions are welcome.

## Release Process

1. Update version in `manifest.json`
2. Update `CHANGELOG.md`
3. Tag the release: `git tag v<version>`
4. Build and push
5. Publish to Chrome Web Store
