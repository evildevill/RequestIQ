const SECRET_PATTERNS = [
  'apikey', 'api_key', 'key', 'secret', 'token', 'jwt',
  'access_token', 'refresh_token', 'client_secret', 'private_key',
  'auth_token', 'session_key', 'api-key', 'bearer',
];

const INTERESTING_PATH_PATTERNS = [
  '/admin', '/graphql', '/swagger', '/openapi', '/internal',
  '/debug', '/api', '/auth', '/login', '/upload', '/download',
  '/config', '/env', '/.env', '/health', '/metrics', '/status',
  '/callback', '/webhook', '/oauth', '/token', '/refresh',
  '/reset', '/register', '/signup', '/signin', '/logout',
];

const SUSPICIOUS_PARAMS = [
  'email', 'userid', 'uid', 'username', 'session', 'jwt',
  'token', 'password', 'apikey', 'api_key', 'secret', 'key',
  'access_token', 'refresh_token', 'client_secret', 'auth',
  'passwd', 'pwd', 'ssn', 'credit', 'card', 'cvv', 'pin',
  'otp', 'mfa', '2fa', 'code', 'verification',
];

const CLOUD_PROVIDERS = {
  'amazonaws.com': 'AWS', 'aws.amazon.com': 'AWS',
  'azure.com': 'Azure', 'azureedge.net': 'Azure', 'azurefd.net': 'Azure',
  'azurewebsites.net': 'Azure', 'microsoft.com': 'Azure',
  'cloudfront.net': 'AWS', 'amazon.com': 'AWS',
  'googleapis.com': 'GCP', 'google.com': 'GCP', 'googlesyndication.com': 'GCP',
  'gstatic.com': 'GCP', 'firebaseio.com': 'Firebase',
  'cloudflare.com': 'Cloudflare', 'cloudflare.net': 'Cloudflare',
  'supabase.co': 'Supabase', 'supabase.in': 'Supabase',
  'vercel.app': 'Vercel', 'vercel.com': 'Vercel',
  'netlify.app': 'Netlify', 'netlify.com': 'Netlify',
  'onrender.com': 'Render', 'railway.app': 'Railway',
  'fly.dev': 'Fly.io', 'fly.io': 'Fly.io',
  'github.com': 'GitHub', 'github.io': 'GitHub',
  'gitlab.com': 'GitLab', 'gitlab.io': 'GitLab',
  'digitaloceanspaces.com': 'DigitalOcean', 'digitalocean.com': 'DigitalOcean',
  'oraclecloud.com': 'Oracle Cloud', 'oracle.com': 'Oracle Cloud',
  'herokuapp.com': 'Heroku', 'heroku.com': 'Heroku',
};

const AI_PROVIDERS = {
  'openai.com': 'OpenAI', 'api.openai.com': 'OpenAI',
  'azure.com.*openai': 'Azure OpenAI',
  'anthropic.com': 'Anthropic', 'api.anthropic.com': 'Anthropic',
  'googleapis.com.*gemini': 'Google Gemini', 'generativelanguage.googleapis.com': 'Google Gemini',
  'mistral.ai': 'Mistral', 'api.mistral.ai': 'Mistral',
  'deepseek.com': 'DeepSeek', 'api.deepseek.com': 'DeepSeek',
  'groq.com': 'Groq', 'api.groq.com': 'Groq',
  'perplexity.ai': 'Perplexity', 'api.perplexity.ai': 'Perplexity',
  'ollama.ai': 'Ollama',
  'openrouter.ai': 'OpenRouter', 'api.openrouter.ai': 'OpenRouter',
  'cohere.com': 'Cohere', 'api.cohere.com': 'Cohere',
  'together.xyz': 'Together AI', 'api.together.xyz': 'Together AI',
  'replicate.com': 'Replicate', 'api.replicate.com': 'Replicate',
  'huggingface.co': 'Hugging Face',
};

const RESOURCE_TYPES = {
  Document: 'document', Stylesheet: 'stylesheet', Image: 'image',
  Media: 'media', Font: 'font', Script: 'script', TextTrack: 'texttrack',
  XHR: 'xhr', Fetch: 'fetch', EventSource: 'eventsource',
  WebSocket: 'websocket', Manifest: 'manifest',
  SignedExchange: 'signedexchange', Ping: 'ping',
  CSPViolationReport: 'cspviolationreport', Preflight: 'preflight',
  Other: 'other',
};

const METHOD_COLORS = {
  GET: '#58a6ff', POST: '#3fb950', PUT: '#d29922',
  PATCH: '#bc8c39', DELETE: '#f85149', HEAD: '#8b5cf6',
  OPTIONS: '#6b7280', CONNECT: '#6b7280',
};

const STATUS_COLORS = {
  2: '#3fb950', 3: '#58a6ff',
  4: '#d29922', 5: '#f85149',
};

export function getTimestamp() {
  return Date.now();
}

export function formatTimestamp(ts) {
  return new Date(ts).toISOString();
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}

export function getHostname(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

export function getOrigin(url) {
  try { return new URL(url).origin; } catch { return ''; }
}

export function getPath(url) {
  try { return new URL(url).pathname; } catch { return ''; }
}

export function getQueryParams(url) {
  try {
    const params = new URL(url).searchParams;
    const result = {};
    for (const [key, value] of params) result[key] = value;
    return result;
  } catch { return {}; }
}

export function methodColor(method) {
  return METHOD_COLORS[method] || '#6b7280';
}

export function statusColor(status) {
  return STATUS_COLORS[Math.floor(status / 100)] || '#6b7280';
}

export function detectSecretsInUrl(url) {
  const lower = url.toLowerCase();
  return SECRET_PATTERNS.filter(p => lower.includes(p));
}

export function detectInterestingPaths(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return INTERESTING_PATH_PATTERNS.filter(p => pathname.includes(p));
  } catch { return []; }
}

export function detectSuspiciousParams(url) {
  try {
    const params = new URL(url).searchParams;
    return [...params.keys()].filter(k =>
      SUSPICIOUS_PARAMS.includes(k.toLowerCase())
    );
  } catch { return []; }
}

export function detectCloudProvider(hostname) {
  const lower = hostname.toLowerCase();
  for (const [domain, provider] of Object.entries(CLOUD_PROVIDERS)) {
    if (lower.includes(domain) || lower.endsWith('.' + domain)) return provider;
  }
  return null;
}

export function detectAIProvider(url) {
  const lower = url.toLowerCase();
  for (const [pattern, provider] of Object.entries(AI_PROVIDERS)) {
    if (pattern.includes('.*')) {
      const [domain, pathPattern] = pattern.split('.*');
      if (lower.includes(domain) && lower.includes(pathPattern)) return provider;
    } else {
      if (lower.includes(pattern)) return provider;
    }
  }
  return null;
}

export function hasAuthHeader(headers) {
  if (!headers) return [];
  const found = [];
  const lower = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;

  if (lower['authorization']) {
    const val = lower['authorization'];
    if (val.startsWith('Bearer ')) found.push('Bearer Token');
    else if (val.startsWith('Basic ')) found.push('Basic Auth');
    else if (val.startsWith('Digest ')) found.push('Digest Auth');
    else found.push('Authorization');
  }
  if (lower['x-api-key']) found.push('API Key');
  if (lower['x-auth-token']) found.push('Auth Token');
  if (lower['x-csrf-token']) found.push('CSRF Token');
  if (lower['x-session-id']) found.push('Session ID');
  if (lower['x-refresh-token']) found.push('Refresh Token');
  if (lower['cookie']) {
    const c = lower['cookie'];
    if (c.includes('session') || c.includes('jwt') || c.includes('token'))
      found.push('Session Cookie');
  }
  return found;
}

export function getTypeLabel(type) {
  return RESOURCE_TYPES[type] || type || 'unknown';
}

export function computeStats(requests) {
  const total = requests.length;
  const domains = new Set(requests.map(r => r.hostname));
  const methods = {};
  const failed = requests.filter(r => r.status >= 400).length;
  const times = requests.filter(r => r.duration > 0).map(r => r.duration);
  const avgTime = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const largest = requests.reduce((max, r) => (r.size || 0) > (max?.size || 0) ? r : max, null);
  const domainCounts = {};
  for (const r of requests) {
    domainCounts[r.hostname] = (domainCounts[r.hostname] || 0) + 1;
  }
  for (const r of requests) {
    const m = r.method || 'GET';
    methods[m] = (methods[m] || 0) + 1;
  }
  const mostRequested = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    total, uniqueDomains: domains.size, methods,
    failed, avgTime: Math.round(avgTime * 100) / 100,
    largestResponse: largest?.url || null,
    largestSize: largest?.size || 0,
    mostRequestedDomain: mostRequested ? mostRequested[0] : null,
    mostRequestedCount: mostRequested ? mostRequested[1] : 0,
    getCount: methods['GET'] || 0,
    postCount: methods['POST'] || 0,
  };
}

export function exportJSON(requests) {
  return JSON.stringify(requests, null, 2);
}

export function exportCSV(requests) {
  const headers = [
    'Timestamp', 'Method', 'URL', 'Hostname', 'Path', 'Status',
    'Type', 'Duration', 'Size', 'Initiator',
  ];
  const rows = requests.map(r => [
    r.timestamp, r.method, r.url, r.hostname, r.path,
    r.status, r.type, r.duration, r.size, r.initiator || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return headers.join(',') + '\n' + rows.join('\n');
}

export function exportHAR(requests) {
  const har = {
    log: {
      version: '1.2',
      creator: { name: 'Network Inspector', version: '1.0.0' },
      entries: requests.map(r => ({
        startedDateTime: new Date(r.timestamp).toISOString(),
        time: r.duration || 0,
        request: {
          method: r.method || 'GET',
          url: r.url,
          httpVersion: r.httpVersion || 'HTTP/2.0',
          headers: r.requestHeaders ? Object.entries(r.requestHeaders).map(([n, v]) => ({ name: n, value: String(v) })) : [],
          queryString: r.queryParams ? Object.entries(r.queryParams).map(([n, v]) => ({ name: n, value: String(v) })) : [],
          postData: r.requestBody ? { text: r.requestBody, mimeType: r.requestContentType || 'application/octet-stream' } : undefined,
          headersSize: -1, bodySize: r.requestBody ? r.requestBody.length : -1,
        },
        response: {
          status: r.status || 0,
          statusText: r.statusText || '',
          httpVersion: r.httpVersion || 'HTTP/2.0',
          headers: r.responseHeaders ? Object.entries(r.responseHeaders).map(([n, v]) => ({ name: n, value: String(v) })) : [],
          content: {
            size: r.size || 0,
            mimeType: r.contentType || 'application/octet-stream',
          },
          redirectURL: '',
          headersSize: -1, bodySize: r.size || -1,
        },
        cache: {},
        timings: {
          send: 0, wait: r.duration || 0, receive: 0,
          blocked: -1, dns: -1, connect: -1, ssl: -1,
        },
      })),
    },
  };
  return JSON.stringify(har, null, 2);
}

export function exportMarkdown(requests) {
  if (!requests.length) return '# Network Inspector Export\n\nNo requests captured.';
  const lines = [
    '# Network Inspector Export',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Total Requests:** ${requests.length}`,
    '',
    '## Requests',
    '',
    '| Method | URL | Status | Type | Duration | Size |',
    '|--------|-----|--------|------|----------|------|',
  ];
  for (const r of requests) {
    const url = r.url || '';
    const method = r.method || 'GET';
    const status = r.status || '-';
    const type = r.type || 'unknown';
    const duration = r.duration > 0 ? `${r.duration.toFixed(0)}ms` : '-';
    const size = r.size > 0 ? formatBytes(r.size) : '-';
    lines.push(`| ${method} | ${url.replace(/\|/g, '\\|')} | ${status} | ${type} | ${duration} | ${size} |`);
  }
  lines.push('');
  lines.push('## Summary');
  const stats = computeStats(requests);
  lines.push(`- **Total:** ${stats.total}`);
  lines.push(`- **Unique Domains:** ${stats.uniqueDomains}`);
  lines.push(`- **GET:** ${stats.getCount}, **POST:** ${stats.postCount}`);
  lines.push(`- **Failed:** ${stats.failed}`);
  lines.push(`- **Avg Time:** ${stats.avgTime.toFixed(1)}ms`);
  lines.push(`- **Top Domain:** ${stats.mostRequestedDomain || '-'}`);

  const alerts = requests.filter(r => r.security);
  if (alerts.length) {
    lines.push('');
    lines.push('## Security Alerts');
    for (const r of alerts) {
      for (const a of r.security) {
        lines.push(`- [${a.severity.toUpperCase()}] ${a.type}: ${a.detail}`);
      }
    }
  }

  return lines.join('\n');
}

export function exportTXT(requests) {
  if (!requests.length) return 'Network Inspector Export - No requests captured.\n';
  const lines = [
    '═══════════════════════════════════════════',
    '  NETWORK INSPECTOR - REQUEST LOG',
    '═══════════════════════════════════════════',
    `  Generated: ${new Date().toISOString()}`,
    `  Total: ${requests.length} requests`,
    '───────────────────────────────────────────',
    '',
  ];
  for (const r of requests) {
    lines.push(`  ${r.method || 'GET'} ${r.status || '???'}  ${r.url || ''}`);
    if (r.duration > 0 || r.size > 0) {
      const parts = [];
      if (r.duration > 0) parts.push(`${r.duration.toFixed(0)}ms`);
      if (r.size > 0) parts.push(formatBytes(r.size));
      lines.push(`               └─ ${parts.join(', ')}`);
    }
    lines.push('');
  }
  lines.push('───────────────────────────────────────────');
  const stats = computeStats(requests);
  lines.push(`  ${stats.total} total, ${stats.uniqueDomains} domains`);
  lines.push(`  ${stats.getCount} GET, ${stats.postCount} POST, ${stats.failed} failed`);
  lines.push('═══════════════════════════════════════════');
  return lines.join('\n');
}

export function formatBytes(bytes) {
  if (!bytes || bytes < 0) return '0B';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1048576).toFixed(1) + 'MB';
}

export function truncate(str, len = 50) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function safeJSONParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}
