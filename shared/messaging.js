export const Channels = Object.freeze({
  REQUEST_UPDATE: 'request:update',
  REQUESTS_BATCH: 'requests:batch',
  GET_REQUESTS: 'get:requests',
  GET_STATS: 'get:stats',
  CLEAR_REQUESTS: 'clear:requests',
  PAUSE_CAPTURE: 'pause:capture',
  RESUME_CAPTURE: 'resume:capture',
  GET_STATUS: 'get:status',
  SETTINGS_UPDATED: 'settings:updated',
  TAB_CHANGED: 'tab:changed',
  SECURITY_ALERT: 'security:alert',
  EXPORT_REQUESTS: 'export:requests',
  FILTER_REQUESTS: 'filter:requests',
});

let port = null;
const listeners = new Map();
const pendingRequests = new Map();
let requestIdCounter = 0;

export function connectToBackground(name = 'extension') {
  if (port) {
    try { port.disconnect(); } catch {}
  }

  port = chrome.runtime.connect({ name });

  port.onMessage.addListener((msg) => {
    if (msg._responseId && pendingRequests.has(msg._responseId)) {
      const { resolve } = pendingRequests.get(msg._responseId);
      pendingRequests.delete(msg._responseId);
      resolve(msg.data);
      return;
    }

    const handlers = listeners.get(msg.channel);
    if (handlers) {
      for (const handler of handlers) {
        try { handler(msg.data, msg); } catch (e) { console.error('[Messaging] handler error:', e); }
      }
    }
  });

  port.onDisconnect.addListener(() => {
    if (chrome.runtime.lastError) {
      console.debug('[Messaging] Port disconnected:', chrome.runtime.lastError.message);
    }
    port = null;
  });

  return port;
}

export function getPort() {
  return port;
}

export function sendMessage(channel, data = {}) {
  return new Promise((resolve, reject) => {
    const id = ++requestIdCounter;
    const msg = { channel, data, _requestId: id };
    pendingRequests.set(id, { resolve, reject });

    try {
      if (port) {
        port.postMessage(msg);
      } else {
        chrome.runtime.sendMessage(msg).then(response => {
          if (response?._responseId === id) {
            resolve(response.data);
          } else if (response) {
            resolve(response);
          } else {
            resolve(undefined);
          }
        }).catch(reject);
      }
    } catch (err) {
      pendingRequests.delete(id);
      reject(err);
    }

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Request ${channel} timed out`));
      }
    }, 10000);
  });
}

export function onMessage(channel, handler) {
  if (!listeners.has(channel)) listeners.set(channel, new Set());
  listeners.get(channel).add(handler);

  return () => {
    const handlers = listeners.get(channel);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) listeners.delete(channel);
    }
  };
}

export function respondToMessage(request, responseData) {
  if (request._requestId) {
    return { _responseId: request._requestId, data: responseData };
  }
  return responseData;
}
