import { connectToBackground, sendMessage, onMessage, Channels } from '../shared/messaging.js';

let port = null;

function $(sel) { return document.querySelector(sel); }

function updateStatus(status) {
  const indicator = $('#statusIndicator');
  const text = $('#statusText');
  indicator.className = 'status-indicator';

  if (status.paused) {
    indicator.classList.add('paused');
    text.textContent = 'Capture paused';
  } else if (status.capturing || status.attachedTabs > 0) {
    indicator.classList.add('attached');
    text.textContent = 'Capturing this tab';
  } else {
    indicator.classList.add('detached');
    text.textContent = status.error || 'Capture is off';
  }

  $('#startCapture').disabled = Boolean(status.capturing);
  $('#stopCapture').disabled = !status.capturing && !status.paused;
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

async function openSidePanel() {
  if (chrome.sidePanel) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      $('#statusText').textContent = error.message || 'Could not open the side panel';
      return;
    }
  }
  window.close();
}

$('#openSidePanel').addEventListener('click', openSidePanel);
$('#settingsBtn').addEventListener('click', openSidePanel);

$('#startCapture').addEventListener('click', async () => {
  const button = $('#startCapture');
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = 'Starting…';
  let errorMessage = '';
  try {
    const result = await sendMessage('start:capture');
    if (!result?.success) errorMessage = result?.error || 'Could not start capture';
  } catch (error) {
    errorMessage = error.message || 'Could not start capture';
  } finally {
    button.textContent = originalText;
    await refresh();
    if (errorMessage) {
      $('#statusText').textContent = errorMessage;
      $('#statusIndicator').className = 'status-indicator detached';
    }
  }
});

$('#stopCapture').addEventListener('click', async () => {
  $('#stopCapture').disabled = true;
  try {
    await sendMessage('stop:capture');
    await refresh();
  } catch (error) {
    $('#statusText').textContent = error.message || 'Could not stop capture';
  }
});

$('#clearBtn').addEventListener('click', async () => {
  await sendMessage('clear:requests');
  refresh();
});

function init() {
  document.getElementById('popupLogo').src = chrome.runtime.getURL('images/icon32.png');
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
