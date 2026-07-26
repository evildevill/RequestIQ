import {
  connectToBackground, sendMessage, onMessage, Channels
} from '../shared/messaging.js';
import {
  getSettings, saveSettings
} from '../shared/storage.js';
import {
  methodColor, statusColor, formatTime, getHostname, getPath,
  computeStats, exportJSON, exportCSV, exportHAR,
  exportMarkdown, exportTXT, formatBytes,
} from '../shared/utils.js';

const ROW_HEIGHT = 36;
const OVERSCAN = 10;

let allRequests = [];
let filteredRequests = [];
let expandedId = null;
let isPaused = false;
let showAlertsOnly = false;
let scrollTop = 0;
let containerHeight = 0;
let rafId = null;
let port = null;

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const virtualList = $('#virtualList');
const listContainer = $('#listContainer');
const emptyState = $('#emptyState');
const detailPanel = $('#detailPanel');
const detailContent = $('#detailContent');
const searchInput = $('#searchInput');
const methodFilter = $('#methodFilter');
const typeFilter = $('#typeFilter');
const statusFilter = $('#statusFilter');
const securityFilterBtn = $('#securityFilterBtn');
const pauseBtn = $('#pauseBtn');
const clearBtn = $('#clearBtn');
const exportBtn = $('#exportBtn');
const statsToggle = $('#statsToggle');
const settingsToggle = $('#settingsToggle');
const statsPanel = $('#statsPanel');
const settingsPanel = $('#settingsPanel');
const requestCount = $('#requestCount');

function applyFilters() {
  const search = searchInput.value.toLowerCase().trim();
  const method = methodFilter.value;
  const type = typeFilter.value;
  const status = statusFilter.value;

  filteredRequests = allRequests.filter(r => {
    if (showAlertsOnly && !r.security) return false;
    if (method && r.method !== method) return false;
    if (type && r.type !== type) return false;
    if (status) {
      const code = r.status;
      if (status === '2xx' && (code < 200 || code >= 300)) return false;
      if (status === '3xx' && (code < 300 || code >= 400)) return false;
      if (status === '4xx' && (code < 400 || code >= 500)) return false;
      if (status === '5xx' && (code < 500 || code >= 600)) return false;
    }
    if (search) {
      const inUrl = r.url?.toLowerCase().includes(search);
      const inHost = r.hostname?.toLowerCase().includes(search);
      const inPath = r.path?.toLowerCase().includes(search);
      const inMethod = r.method?.toLowerCase().includes(search);
      const inType = r.type?.toLowerCase().includes(search);
      if (!inUrl && !inHost && !inPath && !inMethod && !inType) return false;
    }
    return true;
  });

  render();
}

function insertRequests(newReqs) {
  const existingIds = new Set(allRequests.map(r => r.id));
  const fresh = newReqs.filter(r => !existingIds.has(r.id));
  if (!fresh.length) return;
  allRequests = [...fresh, ...allRequests];
  applyFilters();
  updateStats();
  updateRequestCount();
}

function clearAll() {
  allRequests = [];
  filteredRequests = [];
  expandedId = null;
  detailPanel.classList.add('hidden');
  sendMessage('clear:requests');
  render();
  updateStats();
  updateRequestCount();
}

function togglePause() {
  isPaused = !isPaused;
  pauseBtn.classList.toggle('active', isPaused);
  sendMessage(isPaused ? 'pause:capture' : 'resume:capture');
}

function render() {
  const totalHeight = filteredRequests.length * ROW_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIdx = Math.min(filteredRequests.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN);

  virtualList.style.height = totalHeight + 'px';

  let html = '';
  for (let i = startIdx; i < endIdx; i++) {
    const r = filteredRequests[i];
    const top = i * ROW_HEIGHT;
    const mColor = methodColor(r.method);
    const sColor = r.status ? statusColor(r.status) : 'var(--text-muted)';
    const hasAlerts = r.security && r.security.length > 0;
    const isExpanded = r.id === expandedId;

    html += `<div class="request-row${hasAlerts ? ' has-alerts' : ''}${isExpanded ? ' selected' : ''}"
                  style="top:${top}px" data-id="${r.id}">
      <span class="col-method" style="color:${mColor}">${r.method || '?'}</span>
      <span class="col-host" title="${r.hostname || ''}">${r.hostname || ''}</span>
      <span class="col-path" title="${r.url || ''}">${(r.path || r.url || '').slice(0, 80)}</span>
      <span class="col-status" style="color:${sColor}">${r.status || '-'}</span>
      <span class="col-type">${r.type || ''}</span>
      <span class="col-time">${r.timestamp ? formatTime(r.timestamp) : ''}</span>
      <span class="col-duration">${r.duration > 0 ? (r.duration.toFixed(0) + 'ms') : ''}</span>
      <span class="col-alerts">${hasAlerts ? '<span class="alert-dot"></span>' : ''}</span>
    </div>`;
  }

  if (filteredRequests.length === 0) {
    emptyState.classList.remove('hidden');
    virtualList.innerHTML = '';
  } else {
    emptyState.classList.add('hidden');
    virtualList.innerHTML = html;
  }

  requestCount.textContent = filteredRequests.length;
}

function updateRequestCount() {
  requestCount.textContent = filteredRequests.length;
}

function updateStats() {
  const stats = computeStats(allRequests);
  $('#statTotal').textContent = stats.total;
  $('#statDomains').textContent = stats.uniqueDomains;
  $('#statGet').textContent = stats.getCount;
  $('#statPost').textContent = stats.postCount;
  $('#statFailed').textContent = stats.failed;
  $('#statAvgTime').textContent = stats.avgTime ? stats.avgTime.toFixed(0) + 'ms' : '0ms';
  $('#statLargest').textContent = stats.largestSize > 0 ? (stats.largestSize / 1024).toFixed(1) + 'KB' : '-';
  $('#statTopDomain').textContent = stats.mostRequestedDomain || '-';
}

function showDetails(request) {
  if (!request) return;
  expandedId = request.id;
  detailPanel.classList.remove('hidden');

  let alertsHtml = '';
  if (request.security && request.security.length) {
    alertsHtml = '<div class="security-alerts-section">';
    for (const alert of request.security) {
      alertsHtml += `<div class="security-alert severity-${alert.severity}">
        <span class="security-alert-type">${alert.type.replace(/_/g, ' ')}</span>
        <span class="security-alert-detail">${escapeHtml(alert.detail)}</span>
      </div>`;
    }
    alertsHtml += '</div>';
  }

  let headersHtml = '';
  if (request.requestHeaders) {
    headersHtml = '<div class="detail-section"><div class="detail-section-title">Request Headers</div>';
    for (const [k, v] of Object.entries(request.requestHeaders)) {
      headersHtml += `<div class="detail-row"><span class="detail-key">${escapeHtml(k)}</span><span class="detail-value">${escapeHtml(String(v))}</span></div>`;
    }
    headersHtml += '</div>';
  }

  let resHeadersHtml = '';
  if (request.responseHeaders) {
    resHeadersHtml = '<div class="detail-section"><div class="detail-section-title">Response Headers</div>';
    for (const [k, v] of Object.entries(request.responseHeaders)) {
      resHeadersHtml += `<div class="detail-row"><span class="detail-key">${escapeHtml(k)}</span><span class="detail-value">${escapeHtml(String(v))}</span></div>`;
    }
    resHeadersHtml += '</div>';
  }

  let paramsHtml = '';
  if (request.queryParams && Object.keys(request.queryParams).length) {
    paramsHtml = '<div class="detail-section"><div class="detail-section-title">Query Parameters</div>';
    for (const [k, v] of Object.entries(request.queryParams)) {
      paramsHtml += `<div class="detail-row"><span class="detail-key">${escapeHtml(k)}</span><span class="detail-value">${escapeHtml(v)}</span></div>`;
    }
    paramsHtml += '</div>';
  }

  let bodyHtml = '';
  if (request.requestBody) {
    bodyHtml = '<div class="detail-section"><div class="detail-section-title">Request Body</div>';
    bodyHtml += `<div class="detail-row"><span class="detail-value" style="white-space:pre-wrap;font-size:11px">${escapeHtml(String(request.requestBody).slice(0, 5000))}</span></div>`;
    bodyHtml += '</div>';
  }

  detailContent.innerHTML = `
    ${alertsHtml}
    <div class="detail-section">
      <div class="detail-section-title">General</div>
      <div class="detail-row"><span class="detail-key">URL</span><span class="detail-value url">${escapeHtml(request.url)}</span></div>
      <div class="detail-row"><span class="detail-key">Method</span><span class="detail-value" style="color:${methodColor(request.method)}">${request.method}</span></div>
      <div class="detail-row"><span class="detail-key">Status</span><span class="detail-value" style="color:${statusColor(request.status)}">${request.status} ${request.statusText || ''}</span></div>
      <div class="detail-row"><span class="detail-key">Type</span><span class="detail-value">${request.type}</span></div>
      <div class="detail-row"><span class="detail-key">Hostname</span><span class="detail-value">${escapeHtml(request.hostname)}</span></div>
      <div class="detail-row"><span class="detail-key">Path</span><span class="detail-value">${escapeHtml(request.path)}</span></div>
      <div class="detail-row"><span class="detail-key">Origin</span><span class="detail-value">${escapeHtml(request.origin || '')}</span></div>
      <div class="detail-row"><span class="detail-key">Timestamp</span><span class="detail-value">${new Date(request.timestamp).toISOString()}</span></div>
      <div class="detail-row"><span class="detail-key">Duration</span><span class="detail-value">${request.duration > 0 ? request.duration.toFixed(1) + 'ms' : '-'}</span></div>
      <div class="detail-row"><span class="detail-key">Size</span><span class="detail-value">${request.size > 0 ? formatBytes(request.size) : '-'}</span></div>
      <div class="detail-row"><span class="detail-key">Initiator</span><span class="detail-value">${escapeHtml(request.initiator || '-')}</span></div>
      <div class="detail-row"><span class="detail-key">Frame ID</span><span class="detail-value">${request.frameId ?? '-'}</span></div>
      <div class="detail-row"><span class="detail-key">Cached</span><span class="detail-value">${request.cached ? 'Yes' : 'No'}</span></div>
      <div class="detail-row"><span class="detail-key">HTTP Version</span><span class="detail-value">${request.httpVersion || '-'}</span></div>
    </div>
    ${paramsHtml}
    ${headersHtml}
    ${bodyHtml}
    ${resHeadersHtml}
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function handleRowClick(e) {
  const row = e.target.closest('.request-row');
  if (!row) return;
  const id = row.dataset.id;
  const request = filteredRequests.find(r => r.id === id);
  if (!request) return;
  if (expandedId === id) {
    expandedId = null;
    detailPanel.classList.add('hidden');
  } else {
    showDetails(request);
  }
}

async function handleExport() {
  const format = $('#exportFormat').value;
  try {
    const requests = await sendMessage('get:requests');
    if (!requests || !requests.length) {
      console.warn('[Export] No requests to export');
      return;
    }
    let data, ext, mime;
    switch (format) {
      case 'csv':
        data = exportCSV(requests); ext = 'csv'; mime = 'text/csv';
        break;
      case 'har':
        data = exportHAR(requests); ext = 'har'; mime = 'application/json';
        break;
      case 'md':
        data = exportMarkdown(requests); ext = 'md'; mime = 'text/markdown';
        break;
      case 'txt':
        data = exportTXT(requests); ext = 'txt'; mime = 'text/plain';
        break;
      default:
        data = exportJSON(requests); ext = 'json'; mime = 'application/json';
    }
    const blob = new Blob([data], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-inspector-${Date.now()}.${ext}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (err) {
    console.error('[Export] Failed:', err);
  }
}

async function loadSettings() {
  const settings = await getSettings();
  $('#maxHistory').value = String(settings.maxHistory || 1000);
  $('#theme').value = settings.theme || 'dark';
  $('#ignoredDomains').value = (settings.ignoredDomains || []).join(', ');
  applyTheme(settings.theme || 'dark');
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.style.setProperty('--bg-primary', '#ffffff');
    document.documentElement.style.setProperty('--bg-secondary', '#f6f8fa');
    document.documentElement.style.setProperty('--bg-tertiary', '#eaeef2');
    document.documentElement.style.setProperty('--bg-hover', '#d0d7de');
    document.documentElement.style.setProperty('--text-primary', '#1f2328');
    document.documentElement.style.setProperty('--text-secondary', '#656d76');
  } else {
    document.documentElement.style.removeProperty('--bg-primary');
    document.documentElement.style.removeProperty('--bg-secondary');
    document.documentElement.style.removeProperty('--bg-tertiary');
    document.documentElement.style.removeProperty('--bg-hover');
    document.documentElement.style.removeProperty('--text-primary');
    document.documentElement.style.removeProperty('--text-secondary');
  }
}

async function saveSettingsDebounced() {
  await saveSettings({
    maxHistory: parseInt($('#maxHistory').value) || 1000,
    theme: $('#theme').value,
    ignoredDomains: $('#ignoredDomains').value.split(',').map(s => s.trim()).filter(Boolean),
  });
}

listContainer.addEventListener('scroll', () => {
  scrollTop = listContainer.scrollTop;
  if (!rafId) {
    rafId = requestAnimationFrame(() => {
      rafId = null;
      render();
    });
  }
});

listContainer.addEventListener('click', handleRowClick);

searchInput.addEventListener('input', applyFilters);
methodFilter.addEventListener('change', applyFilters);
typeFilter.addEventListener('change', applyFilters);
statusFilter.addEventListener('change', applyFilters);

securityFilterBtn.addEventListener('click', () => {
  showAlertsOnly = !showAlertsOnly;
  securityFilterBtn.classList.toggle('active', showAlertsOnly);
  applyFilters();
});

pauseBtn.addEventListener('click', togglePause);
clearBtn.addEventListener('click', clearAll);
exportBtn.addEventListener('click', handleExport);

$('#detailClose').addEventListener('click', () => {
  expandedId = null;
  detailPanel.classList.add('hidden');
});

statsToggle.addEventListener('click', () => {
  const isOpen = !statsPanel.classList.contains('hidden');
  statsPanel.classList.toggle('hidden');
  if (!isOpen) updateStats();
});

settingsToggle.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

$('#maxHistory').addEventListener('change', saveSettingsDebounced);
$('#theme').addEventListener('change', async () => {
  applyTheme($('#theme').value);
  await saveSettingsDebounced();
});
$('#ignoredDomains').addEventListener('change', saveSettingsDebounced);

function init() {
  port = connectToBackground('sidepanel');

  onMessage('requests:batch', (data) => {
    if (data && data.requests) {
      insertRequests(data.requests);
    }
  });

  onMessage('status:changed', (data) => {
    if (data) {
      if (data.paused !== undefined) {
        isPaused = data.paused;
        pauseBtn.classList.toggle('active', isPaused);
      }
    }
  });

  onMessage('requests:batch', (data) => {
    if (data && data.action === 'tab_navigated') return;
  });

  onMessage('security:alert', (data) => {
    if (data && data.entry) {
      insertRequests([data.entry]);
    }
  });

  loadSettings();

  sendMessage('get:requests').then(requests => {
    if (requests && requests.length) {
      allRequests = requests;
      applyFilters();
      updateStats();
    }
  });

  new ResizeObserver(() => {
    containerHeight = listContainer.clientHeight;
    render();
  }).observe(listContainer);

  containerHeight = listContainer.clientHeight;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
