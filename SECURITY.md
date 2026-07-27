# Security Policy

## Reporting a Vulnerability

RequestIQ is a security research and debugging tool. We take security seriously.

If you discover a vulnerability in RequestIQ itself (not in a target website's traffic that RequestIQ is inspecting), please report it privately:

1. **Do not** open a public GitHub issue
2. Email the details to: _(maintainer email)_
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Affected version(s)
   - Suggested fix (if any)

## What We Take Seriously

- **Privilege escalation**: The extension uses `chrome.debugger` to inspect tab traffic. Any vulnerability that allows an attacker to abuse this to escape the sandbox or access tabs without user consent is critical.
- **Data leakage**: RequestIQ inspects potentially sensitive network traffic (tokens, secrets, API keys). A vulnerability in storage or rendering that leaks this data to third parties is a top priority.
- **Code injection**: The injected script (`injected.js`) runs in the page context. Any vulnerability that allows a website to exploit this bridge is treated as critical.
- **Supply chain**: The extension bundles no remote code and has no runtime dependencies.

## Response Timeline

- **Critical vulnerabilities**: Acknowledgment within 24 hours, fix released within 7 days
- **High vulnerabilities**: Acknowledgment within 48 hours, fix released within 14 days
- **Medium/Low vulnerabilities**: Next regular release cycle

## Scope

This security policy applies to the RequestIQ extension codebase only. Network traffic inspected by RequestIQ (API keys, tokens, secrets in target websites) is a privacy concern, not a security vulnerability of the extension itself.

## Best Practices for Users

1. Only install RequestIQ from the Chrome Web Store
2. Keep the extension updated
3. Review the permissions you grant — RequestIQ only needs `debugger`, `storage`, `sidePanel`, and `activeTab`
4. Use Pause mode when not actively inspecting to detach the debugger
5. Clear captured requests via the Clear button before handing your device to someone else

## Safe Harbor

We will not take legal action against, and will coordinate with, security researchers who report vulnerabilities according to this policy.
