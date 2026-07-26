(function () {
  'use strict';

  const APP_ID = '__network_inspector__';

  if (document.getElementById(APP_ID)) return;
  const marker = document.createElement('div');
  marker.id = APP_ID;
  marker.style.display = 'none';
  document.documentElement.appendChild(marker);

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('content/injected.js');
  script.id = APP_ID + '_script';
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  const requests = [];
  let port = null;

  function connect() {
    try {
      port = chrome.runtime.connect({ name: 'content' });
      port.onDisconnect.addListener(() => {
        port = null;
        setTimeout(connect, 1000);
      });
    } catch {}
  }

  function sendToBackground(data) {
    if (port) {
      try { port.postMessage(data); } catch {}
    } else {
      try { chrome.runtime.sendMessage(data); } catch {}
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== 'network-inspector-injected') return;

    const req = event.data.request;
    if (req) {
      requests.push(req);
      sendToBackground({
        channel: 'content:request',
        data: req,
      });
    }
  });

  connect();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      sendToBackground({ channel: 'content:ready', data: { url: location.href } });
    });
  } else {
    sendToBackground({ channel: 'content:ready', data: { url: location.href } });
  }
})();
