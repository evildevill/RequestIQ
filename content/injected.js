(function () {
  'use strict';

  if (window.__networkInspectorInjected) return;
  window.__networkInspectorInjected = true;

  const requestIdCounter = { value: 0 };
  const originalFetch = window.fetch.bind(window);
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalSendBeacon = navigator.sendBeacon.bind(navigator);

  function getRequestId() {
    return 'inj_' + (++requestIdCounter.value) + '_' + Date.now();
  }

  function postToContent(data) {
    window.postMessage({
      source: 'network-inspector-injected',
      request: data,
    }, '*');
  }

  function buildRequestData(method, url, type, extra = {}) {
    let resolvedUrl;
    try {
      resolvedUrl = new URL(url, location.href).href;
    } catch {
      resolvedUrl = url;
    }
    return {
      id: getRequestId(),
      url: resolvedUrl,
      method: method.toUpperCase(),
      type: type || 'fetch',
      timestamp: Date.now(),
      tabId: -1,
      ...extra,
    };
  }

  window.fetch = async function (input, init = {}) {
    const url = typeof input === 'string' ? input : (input.url || input.toString());
    const method = (init.method || 'GET').toUpperCase();
    const body = init.body || null;
    const reqData = buildRequestData(method, url, 'fetch', {
      requestBody: body ? (typeof body === 'string' ? body : '[binary]') : null,
    });

    postToContent({ ...reqData, phase: 'start' });

    const startTime = performance.now();
    try {
      const response = await originalFetch(input, init);
      const duration = performance.now() - startTime;
      postToContent({
        ...reqData,
        phase: 'complete',
        status: response.status,
        statusText: response.statusText,
        duration: Math.round(duration),
        size: parseInt(response.headers.get('content-length') || '0'),
        contentType: response.headers.get('content-type') || '',
      });
      return response;
    } catch (err) {
      postToContent({ ...reqData, phase: 'error', error: err.message });
      throw err;
    }
  };

  XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
    this._niData = buildRequestData(method, url, 'xhr');
    this._niStartTime = performance.now();
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (this._niData) {
      this._niData.requestBody = body ? (typeof body === 'string' ? body : '[binary]') : null;
      postToContent({ ...this._niData, phase: 'start' });
    }

    this.addEventListener('loadend', function () {
      if (!this._niData) return;
      const duration = performance.now() - (this._niStartTime || performance.now());
      postToContent({
        ...this._niData,
        phase: 'complete',
        status: this.status,
        statusText: this.statusText,
        duration: Math.round(duration),
        size: parseInt(this.getResponseHeader('content-length') || '0'),
        contentType: this.getResponseHeader('content-type') || '',
      });
    });

    this.addEventListener('error', function () {
      if (!this._niData) return;
      postToContent({ ...this._niData, phase: 'error', error: 'Network error' });
    });

    return originalXHRSend.apply(this, arguments);
  };

  navigator.sendBeacon = function (url, data) {
    const reqData = buildRequestData('POST', url, 'beacon', {
      requestBody: data ? (typeof data === 'string' ? data : '[blob]') : null,
      phase: 'beacon',
    });
    postToContent(reqData);
    return originalSendBeacon.apply(this, arguments);
  };

  const OrigWebSocket = function (url, protocols) {
    const reqData = buildRequestData('WS', url, 'websocket');
    postToContent({ ...reqData, phase: 'start' });

    const ws = new WebSocket(url, protocols);

    ws.addEventListener('open', () => {
      postToContent({ ...reqData, phase: 'connected', status: 101 });
    });
    ws.addEventListener('error', () => {
      postToContent({ ...reqData, phase: 'error', error: 'WebSocket error' });
    });
    ws.addEventListener('close', (e) => {
      postToContent({ ...reqData, phase: 'closed', status: e.code });
    });

    return ws;
  };
  OrigWebSocket.CONNECTING = 0;
  OrigWebSocket.OPEN = 1;
  OrigWebSocket.CLOSING = 2;
  OrigWebSocket.CLOSED = 3;

  const OrigEventSource = function (url, eventSourceInitDict) {
    const reqData = buildRequestData('GET', url, 'eventsource');
    postToContent({ ...reqData, phase: 'start' });

    const es = new EventSource(url, eventSourceInitDict);

    const origAddEventListener = es.addEventListener.bind(es);
    es.addEventListener = function (type, listener, options) {
      if (type === 'open') {
        postToContent({ ...reqData, phase: 'connected', status: 200 });
      }
      if (type === 'error') {
        postToContent({ ...reqData, phase: 'error', error: 'EventSource error' });
      }
      return origAddEventListener(type, listener, options);
    };

    return es;
  };

  const origWebSocket = window.WebSocket;
  const origEventSource = window.EventSource;
  window.WebSocket = OrigWebSocket;
  window.EventSource = OrigEventSource;
})();
