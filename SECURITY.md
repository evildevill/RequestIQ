# Security Policy

## Reporting a Vulnerability

RequestIQ is a security research and debugging tool. We take security seriously.

If you discover a vulnerability in RequestIQ itself (not in a target website's traffic that RequestIQ is inspecting), please report it privately:

1. **Do not** open a public GitHub issue
2. Use GitHub's private vulnerability reporting feature if enabled for this repository. Otherwise, contact the maintainer through the public profile linked from the repository.
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Affected version(s)
   - Suggested fix (if any)

## What We Take Seriously

- **Privilege escalation**: The extension uses `chrome.debugger` to inspect tab traffic. Any vulnerability that allows an attacker to abuse this to escape the sandbox or access tabs without user consent is critical.
- **Data leakage**: RequestIQ inspects potentially sensitive network traffic (tokens, secrets, API keys). A vulnerability in storage or rendering that leaks this data to third parties is a top priority.
- **Code injection**: RequestIQ does not inject scripts into websites. A vulnerability that allows page content to execute in the extension UI or background context is treated as critical.
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
3. Review the permissions you grant — RequestIQ requests only `debugger`, `storage`, and `sidePanel`, with no host permissions.
4. Start capture only for a tab you intend to inspect. Network requests can contain credentials or personal information.
5. Use Pause mode when not actively inspecting to detach the debugger.
6. Clear captured requests via the Clear button before handing your device to someone else.

## Safe Harbor

We will not take legal action against, and will coordinate with, security researchers who report vulnerabilities according to this policy.
