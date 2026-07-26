import {
  getTimestamp, getHostname, getOrigin, getPath, getQueryParams,
  detectSecretsInUrl, detectInterestingPaths, detectSuspiciousParams,
  detectCloudProvider, detectAIProvider, hasAuthHeader, getTypeLabel,
} from '../shared/utils.js';
import {
  getSettings, saveSettings, getRequests, saveRequests,
  appendRequests, clearRequests,
} from '../shared/storage.js';

const attachedTabs = new Map();
const pendingRequestsMap = new Map();
const completedRequests = [];
const connectedPorts = new Set();
let isGloballyPaused = false;

let batchTimer = null;
const BATCH_INTERVAL = 150;
const MAX_BATCH_SIZE = 100;

function pushUpdate(data, channel) {
  const msg = { channel, data, timestamp: Date.now() };
  for (const p of connectedPorts) {
    try { p.postMessage(msg); } catch { connectedPorts.delete(p); }
  }
}

function batchPushUpdates() {
  if (batchTimer) return;
  batchTimer = setTimeout(() => {
    batchTimer = null;
    if (completedRequests.length === 0) return;
    const batch = completedRequests.splice(0, MAX_BATCH_SIZE);
    pushUpdate({ requests: batch, total: completedRequests.length + batch.length }, 'requests:batch');
    if (completedRequests.length > 0) batchPushUpdates();
  }, BATCH_INTERVAL);
}

function processRequest(requestId, data, tabId) {
  if (isGloballyPaused) return;
  const url = data.request?.url || data.url || '';
  const method = data.request?.method || data.method || 'GET';
  const type = data.type || data.resourceType || 'fetch';
  const hostname = getHostname(url);
  const path = getPath(url);

  getSettings().then(settings => {
    if (settings.ignoredDomains?.some(d => hostname.includes(d))) return;
    if (settings.ignoredMethods?.includes(method)) return;
    if (settings.ignoredTypes?.includes(type)) return;

    const entry = {
      id: requestId,
      url, method, hostname,
      origin: getOrigin(url), path,
      queryParams: getQueryParams(url),
      type: getTypeLabel(type),
      timestamp: getTimestamp(),
      tabId,
      frameId: data.frameId || 0,
      initiator: getInitiator(data),
      status: 0, statusText: '',
      duration: 0, size: 0,
      requestHeaders: data.request?.headers ? normalizeHeaders(data.request.headers) : {},
      requestBody: data.request?.postData || null,
      requestContentType: data.request?.headers?.['Content-Type'] || null,
      responseHeaders: null, contentType: null,
      httpVersion: null, remoteAddress: null,
      security: null, cached: false,
    };

    pendingRequestsMap.set(requestId, entry);
  });
}

function processResponse(requestId, data) {
  const entry = pendingRequestsMap.get(requestId);
  if (!entry) return;
  entry.status = data.response?.status || 0;
  entry.statusText = data.response?.statusText || '';
  entry.responseHeaders = data.response?.headers ? normalizeHeaders(data.response.headers) : {};
  entry.contentType = data.response?.mimeType || null;
  entry.httpVersion = data.response?.protocol || null;
  entry.remoteAddress = data.response?.remoteIPAddress || null;
  entry.size = data.response?.encodedDataLength || 0;
}

function processLoadingFailed(requestId, data) {
  const entry = pendingRequestsMap.get(requestId);
  if (!entry) return;
  entry.status = 0;
  entry.failed = true;
  entry.errorText = data.errorText || 'Unknown error';
  finalizeEntry(requestId);
}

function processLoadingFinished(requestId, data) {
  const entry = pendingRequestsMap.get(requestId);
  if (!entry) return;
  entry.duration = (data.timestamp || 0) > 0
    ? (data.timestamp * 1000) - entry.timestamp : 0;
  entry.size = data.encodedDataLength || entry.size || 0;
  finalizeEntry(requestId);
}

function finalizeEntry(requestId) {
  const entry = pendingRequestsMap.get(requestId);
  if (!entry) return;
  pendingRequestsMap.delete(requestId);

  entry.security = runSecurityAudit(entry);

  completedRequests.push(entry);
  batchPushUpdates();

  if (entry.security && entry.security.length > 0) {
    pushUpdate({ entry, alerts: entry.security }, 'security:alert');
  }

  appendRequests([entry]);
}

function getInitiator(data) {
  if (data.initiator?.type === 'script') {
    const stack = data.initiator.stack?.callFrames;
    if (stack?.length) {
      return `${getHostname(stack[0].url)}:${stack[0].lineNumber}`;
    }
    return data.initiator.url ? getHostname(data.initiator.url) : 'script';
  }
  if (data.initiator?.type === 'parser') return data.initiator.url || 'parser';
  return data.initiator?.type || 'other';
}

function normalizeHeaders(headers) {
  if (Array.isArray(headers)) {
    const result = {};
    for (const h of headers) result[h.name] = h.value;
    return result;
  }
  return headers || {};
}

function runSecurityAudit(entry) {
  const alerts = [];
  const url = entry.url || '';
  const hostname = entry.hostname || '';

  const secrets = detectSecretsInUrl(url);
  if (secrets.length) alerts.push({ type: 'secret', severity: 'high', detail: `URL contains potential secret: ${secrets.join(', ')}` });

  const paths = detectInterestingPaths(url);
  if (paths.length) alerts.push({ type: 'interesting_path', severity: 'info', detail: `Interesting path: ${paths.join(', ')}` });

  const suspParams = detectSuspiciousParams(url);
  if (suspParams.length) alerts.push({ type: 'suspicious_param', severity: 'medium', detail: `Suspicious parameters: ${suspParams.join(', ')}` });

  const auth = hasAuthHeader(entry.requestHeaders);
  if (auth.length) alerts.push({ type: 'auth', severity: 'high', detail: `Auth detected: ${auth.join(', ')}` });

  const cloud = detectCloudProvider(hostname);
  if (cloud) alerts.push({ type: 'cloud', severity: 'info', detail: `Cloud provider: ${cloud}` });

  const ai = detectAIProvider(url);
  if (ai) alerts.push({ type: 'ai', severity: 'info', detail: `AI provider: ${ai}` });

  if (entry.requestBody) {
    const bodyStr = typeof entry.requestBody === 'string' ? entry.requestBody : JSON.stringify(entry.requestBody);
    const bodySecrets = detectSecretsInUrl(bodyStr.replace(/[^a-zA-Z0-9_\-./:@]/g, ' '));
    if (bodySecrets.length) alerts.push({ type: 'secret_body', severity: 'high', detail: `Request body may contain secrets: ${bodySecrets.join(', ')}` });
  }

  if (entry.responseHeaders) {
    const setCookie = Object.entries(entry.responseHeaders).find(([k]) => k.toLowerCase() === 'set-cookie');
    if (setCookie) alerts.push({ type: 'cookie', severity: 'medium', detail: 'Response sets cookies' });
  }

  if (url.startsWith('ws://')) alerts.push({ type: 'insecure_ws', severity: 'medium', detail: 'Insecure WebSocket connection' });

  return alerts.length ? alerts : null;
}

async function attachToTab(tabId) {
  if (!tabId || attachedTabs.has(tabId)) return;
  try {
    await chrome.debugger.attach({ tabId }, '1.3');
    await chrome.debugger.sendCommand({ tabId }, 'Network.enable', {
      maxPostDataSize: 65536,
      maxResourceBufferSize: 65536,
      maxTotalBufferSize: 10485760,
    });
    attachedTabs.set(tabId, true);
    console.log(`[Network Inspector] Attached to tab ${tabId}`);
    pushUpdate({ tabId, status: 'attached', attachedTabs: attachedTabs.size }, 'status:changed');
  } catch (err) {
    if (err.message?.includes('Another debugger')) {
      attachedTabs.set(tabId, false);
    }
  }
}

async function detachFromTab(tabId) {
  if (!attachedTabs.has(tabId)) return;
  try {
    await chrome.debugger.detach({ tabId });
  } catch {}
  attachedTabs.delete(tabId);
  pushUpdate({ tabId, status: 'detached', attachedTabs: attachedTabs.size }, 'status:changed');
}

async function attachToAllTabs() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id && !tab.url?.startsWith('chrome://') && !tab.url?.startsWith('chrome-extension://')) {
      await attachToTab(tab.id);
    }
  }
}

function handleTabCreated(tab) {
  if (tab.id && !tab.url?.startsWith('chrome://') && !tab.url?.startsWith('chrome-extension://')) {
    attachToTab(tab.id);
  }
}

function handleTabUpdated(tabId, changeInfo) {
  if (changeInfo.status === 'loading' && attachedTabs.has(tabId)) {
    const toRemove = [];
    for (const [reqId, entry] of pendingRequestsMap) {
      if (entry.tabId === tabId) toRemove.push(reqId);
    }
    for (const id of toRemove) pendingRequestsMap.delete(id);
    pushUpdate({ action: 'tab_navigated', tabId }, 'requests:batch');
  }
  if (changeInfo.status === 'complete' && !attachedTabs.has(tabId)) {
    attachToTab(tabId);
  }
}

function handleTabRemoved(tabId) {
  detachFromTab(tabId);
}

function handleDebuggerEvent(source, method, params) {
  const tabId = source.tabId;
  if (!attachedTabs.has(tabId)) return;

  switch (method) {
    case 'Network.requestWillBeSent':
      processRequest(params.requestId, params, tabId);
      break;
    case 'Network.responseReceived':
      processResponse(params.requestId, params);
      break;
    case 'Network.loadingFinished':
      processLoadingFinished(params.requestId, params);
      break;
    case 'Network.loadingFailed':
      processLoadingFailed(params.requestId, params);
      break;
    case 'Network.requestServedFromCache':
      processRequestServedFromCache(params.requestId);
      break;
    case 'Network.webSocketCreated':
      processWebSocket(params.requestId, params, tabId);
      break;
    case 'Network.webSocketWillSendHandshakeRequest':
      processWebSocketHandshake(params.requestId, params);
      break;
    case 'Network.webSocketFrameReceived':
    case 'Network.webSocketFrameSent':
      processWebSocketFrame(params.requestId, params, method);
      break;
    case 'Network.eventSourceMessageReceived':
      processEventSource(params.requestId, params, tabId);
      break;
  }
}

function processRequestServedFromCache(requestId) {
  const entry = pendingRequestsMap.get(requestId);
  if (entry) entry.cached = true;
}

function processWebSocket(requestId, params, tabId) {
  if (isGloballyPaused) return;
  const url = params.url || '';
  const hostname = getHostname(url);
  getSettings().then(settings => {
    if (settings.ignoredDomains?.some(d => hostname.includes(d))) return;
    const entry = {
      id: requestId, url, method: 'WS', hostname,
      origin: getOrigin(url), path: getPath(url),
      queryParams: getQueryParams(url), type: 'websocket',
      timestamp: getTimestamp(), tabId,
      status: 101, statusText: 'Switching Protocols',
      duration: 0, size: 0, initiator: 'page',
      security: null, cached: false,
    };
    pendingRequestsMap.set(requestId, entry);
  });
}

function processWebSocketHandshake(requestId, params) {
  const entry = pendingRequestsMap.get(requestId);
  if (entry && params.request?.headers) {
    entry.requestHeaders = normalizeHeaders(params.request.headers);
  }
}

function processWebSocketFrame(requestId, params, method) {
  const entry = pendingRequestsMap.get(requestId);
  if (!entry) return;
  entry.duration = Date.now() - entry.timestamp;
  if (method === 'Network.webSocketFrameReceived') {
    entry.size += (params.response?.payloadData?.length || 0);
  } else {
    entry.size += (params.request?.payloadData?.length || 0);
  }
}

function processEventSource(requestId, params, tabId) {
  if (isGloballyPaused) return;
  if (pendingRequestsMap.has(requestId)) return;
  const url = params.url || '';
  getSettings().then(settings => {
    if (settings.ignoredDomains?.some(d => getHostname(url).includes(d))) return;
    const entry = {
      id: requestId, url, method: 'GET',
      hostname: getHostname(url), origin: getOrigin(url),
      path: getPath(url), queryParams: getQueryParams(url),
      type: 'eventsource', timestamp: getTimestamp(), tabId,
      status: 200, duration: 0, size: 0, initiator: 'page',
      security: null, cached: false,
    };
    finalizeEntry(requestId);
  });
}

function handleDebuggerDetach(source, reason) {
  const tabId = source.tabId;
  if (attachedTabs.has(tabId)) {
    attachedTabs.delete(tabId);
    console.log(`[Network Inspector] Detached from tab ${tabId}: ${reason}`);
    pushUpdate({ tabId, reason, status: 'detached', attachedTabs: attachedTabs.size }, 'status:changed');
    if (reason !== 'target_closed') {
      setTimeout(() => attachToTab(tabId), 1000);
    }
  }
}

function handleMessage(msg, sender, sendResponse) {
  const handler = messageHandlers[msg.channel];
  if (handler) {
    const result = handler(msg.data, sender);
    if (result && typeof result.then === 'function') {
      result.then(sendResponse);
      return true;
    }
    if (result !== undefined) sendResponse(result);
  }
}

function handlePortConnection(port) {
  if (!['sidepanel', 'popup', 'content'].includes(port.name)) return;
  connectedPorts.add(port);
  port.postMessage({
    channel: 'status:changed',
    data: {
      attachedTabs: attachedTabs.size,
      tabIds: [...attachedTabs.keys()],
      paused: isGloballyPaused,
      requestCount: completedRequests.length + pendingRequestsMap.size,
    },
  });
  port.onDisconnect.addListener(() => { connectedPorts.delete(port); });
  port.onMessage.addListener((msg) => {
    const handler = messageHandlers[msg.channel];
    if (handler) {
      Promise.resolve(handler(msg.data, null, port)).then(result => {
        if (result !== undefined) {
          port.postMessage({ channel: msg.channel, data: result, _responseId: msg._requestId });
        }
      });
    }
  });
}

const messageHandlers = {
  async 'get:requests'() { return await getRequests(); },
  async 'get:stats'(data) {
    const { computeStats } = await import('../shared/utils.js');
    return computeStats(data?.requests || await getRequests());
  },
  async 'clear:requests'() {
    completedRequests.length = 0;
    pendingRequestsMap.clear();
    await clearRequests();
    pushUpdate({ action: 'cleared' }, 'requests:batch');
    return { success: true };
  },
  async 'pause:capture'() {
    isGloballyPaused = true;
    pushUpdate({ paused: true }, 'status:changed');
    return { success: true };
  },
  async 'resume:capture'() {
    isGloballyPaused = false;
    pushUpdate({ paused: false }, 'status:changed');
    return { success: true };
  },
  async 'get:status'() {
    return {
      attachedTabs: attachedTabs.size,
      tabIds: [...attachedTabs.keys()],
      paused: isGloballyPaused,
      requestCount: completedRequests.length + pendingRequestsMap.size,
    };
  },
  async 'settings:updated'(data) { return await saveSettings(data.settings); },
  async 'get:settings'() { return await getSettings(); },
  async 'export:requests'(data) {
    const { exportJSON, exportCSV, exportHAR } = await import('../shared/utils.js');
    const requests = data?.requests || await getRequests();
    switch (data?.format || 'json') {
      case 'csv': return { data: exportCSV(requests), ext: 'csv', mime: 'text/csv' };
      case 'har': return { data: exportHAR(requests), ext: 'har', mime: 'application/json' };
      default: return { data: exportJSON(requests), ext: 'json', mime: 'application/json' };
    }
  },
  async 'filter:requests'(data) {
    return (await getRequests()).filter(r => {
      return (data.filters || []).every(f => {
        const val = (r[f.field] || '').toString().toLowerCase();
        return f.exclude ? !val.includes(f.query.toLowerCase()) : val.includes(f.query.toLowerCase());
      });
    });
  },
};

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  attachToAllTabs();
});

chrome.runtime.onStartup.addListener(() => {
  attachToAllTabs();
});

chrome.tabs.onCreated.addListener(handleTabCreated);
chrome.tabs.onUpdated.addListener(handleTabUpdated);
chrome.tabs.onRemoved.addListener(handleTabRemoved);

chrome.debugger.onEvent.addListener(handleDebuggerEvent);
chrome.debugger.onDetach.addListener(handleDebuggerDetach);

chrome.runtime.onMessage.addListener(handleMessage);
chrome.runtime.onConnect.addListener(handlePortConnection);
