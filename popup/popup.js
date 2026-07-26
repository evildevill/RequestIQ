import { connectToBackground, sendMessage, onMessage, Channels } from '../shared/messaging.js';

let port = null;

function $(sel) { return document.querySelector(sel); }

function updateStatus(status) {
  const indicator = $('#statusIndicator');
  const text = $('#statusText');
  indicator.className = 'status-indicator';

  if (status.paused) {
    indicator.classList.add('paused');
    text.textContent = 'Paused';
  } else if (status.attachedTabs > 0) {
    indicator.classList.add('attached');
    text.textContent = `Monitoring ${status.attachedTabs} tab${status.attachedTabs > 1 ? 's' : ''}`;
  } else {
    indicator.classList.add('detached');
    text.textContent = status.error || 'Waiting for tabs...';
  }
}

function updateStats(stats) {
  if (!stats) return;
  $('#totalRequests').textContent = stats.total || 0;
  $('#uniqueDomains').textContent = stats.uniqueDomains || 0;
  $('#failedRequests').textContent = stats.failed || 0;
}

async function refresh() {
  const status = await sendMessage('get:status');
  if (status) updateStatus(status);
  const stats = await sendMessage('get:stats');
  if (stats) updateStats(stats);
}

$('#openSidePanel').addEventListener('click', async () => {
  if (chrome.sidePanel) {
    try {
      await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
    } catch {
      chrome.runtime.openOptionsPage?.();
    }
  }
  window.close();
});

$('#clearBtn').addEventListener('click', async () => {
  await sendMessage('clear:requests');
  refresh();
});

function init() {
  port = connectToBackground('popup');

  onMessage('status:changed', (data) => {
    if (data) updateStatus(data);
  });

  refresh();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
