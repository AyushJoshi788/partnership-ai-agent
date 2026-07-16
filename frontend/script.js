const messagesEl = document.getElementById('messages');
const formEl = document.getElementById('chat-form');
const inputEl = document.getElementById('message-input');
const API_BASE = "https://partnership-ai-agent.vercel.app";
const loadingEl = document.getElementById('loading');
const toastEl = document.getElementById('toast');
const promptButtons = document.querySelectorAll('.quick-prompts button');
const welcomeScreenEl = document.getElementById('welcome-screen');
const historyListEl = document.getElementById('history-list');
const newChatBtn = document.getElementById('new-chat-btn');
const exportTxtBtn = document.getElementById('export-txt-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const sendButton = formEl.querySelector('button[type="submit"]');
const statCards = Array.from(document.querySelectorAll('.stat-card h3'));
const railListEl = document.querySelector('.rail-list');
const ngoListEl = document.querySelector('.info-panel .info-list');
const activityListEl = document.querySelectorAll('.info-panel .info-list')[1];
const plannerCard = document.getElementById('planner');
const emailCard = document.getElementById('email');
const reportsCard = document.getElementById('reports');
const partnersCard = document.getElementById('partners');
const launchChatButton = document.querySelector('.primary-btn');
const exploreFeaturesButton = document.querySelector('.secondary-btn');
const sidebarScoreEl = document.querySelector('.sidebar-cards .accent-card strong');
const sidebarInsightEl = document.querySelector('.sidebar-cards .mini-card span');
const searchInputEl = document.querySelector('.search-box input');
const profileNameEl = document.querySelector('.profile-pill span');
const profileAvatarEl = document.querySelector('.profile-pill .avatar');
const modalRootEl = document.getElementById('modal-root');
const modalTitleEl = document.getElementById('modal-title');
const modalBodyEl = document.getElementById('modal-body');
const modalCloseBtn = document.getElementById('modal-close');

let conversations = [];
let activeConversationId = null;
let isTyping = false;
let pendingAction = null;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownToHtml(text) {
  const escaped = escapeHtml(text || '');
  const lines = escaped.split('\n');
  const htmlLines = [];
  let inCode = false;
  let codeLines = [];
  let tableLines = [];
  let inList = false;

  function flushList() {
    if (inList) {
      htmlLines.push('</ul>');
      inList = false;
    }
  }

  function flushCode() {
    if (inCode) {
      htmlLines.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
      codeLines = [];
      inCode = false;
    }
  }

  function flushTable() {
    if (tableLines.length) {
      const rows = tableLines.map((row) => row.split('|').filter(Boolean).map((cell) => `<td>${cell.trim()}</td>`).join(''));
      const header = rows.shift();
      htmlLines.push(`<table><thead><tr>${header}</tr></thead><tbody>${rows.map((row) => `<tr>${row}</tr>`).join('')}</tbody></table>`);
      tableLines = [];
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('```')) {
      flushList();
      flushTable();
      if (inCode) {
        flushCode();
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (line.includes('|') && line.trim().startsWith('|')) {
      flushList();
      tableLines.push(line);
      continue;
    }

    if (tableLines.length && !line.trim()) {
      flushTable();
    }

    if (/^###\s+/.test(line)) {
      flushList();
      htmlLines.push(`<h3>${line.replace(/^###\s+/, '')}</h3>`);
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushList();
      htmlLines.push(`<h2>${line.replace(/^##\s+/, '')}</h2>`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushList();
      htmlLines.push(`<h1>${line.replace(/^#\s+/, '')}</h1>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        flushList();
        htmlLines.push('<ul>');
        inList = true;
      }
      htmlLines.push(`<li>${line.replace(/^[-*]\s+/, '')}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushList();
      htmlLines.push(`<p>${line.replace(/^\d+\.\s+/, '')}</p>`);
      continue;
    }

    if (!line.trim()) {
      flushList();
      flushTable();
      htmlLines.push('<div class="spacer"></div>');
      continue;
    }

    flushList();
    flushTable();
    const formatted = line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    htmlLines.push(`<p>${formatted}</p>`);
  }

  flushList();
  flushCode();
  flushTable();
  return htmlLines.join('');
}

function showToast(message, type = 'info') {
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;
  toastEl.classList.remove('hidden');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2600);
}

function setProcessingState(element, processing) {
  if (!element) return;
  if ('disabled' in element) {
    element.disabled = processing;
  }
  if (element.tagName === 'BUTTON') {
    element.style.opacity = processing ? '0.7' : '1';
  } else {
    element.style.opacity = processing ? '0.7' : '1';
    element.style.pointerEvents = processing ? 'none' : 'auto';
  }
}

function openModal(title, contentHtml) {
  modalTitleEl.textContent = title;
  modalBodyEl.innerHTML = contentHtml;
  modalRootEl.classList.remove('hidden');
  modalRootEl.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  modalRootEl.classList.add('hidden');
  modalRootEl.setAttribute('aria-hidden', 'true');
  modalBodyEl.innerHTML = '';
}

async function runFeatureRequest(url, payload, actionElement = null) {
  showLoading(true);
  setProcessingState(actionElement, true);

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Request failed.');
    }

    return data;

  } finally {
    showLoading(false);
    setProcessingState(actionElement, false);
  }
}

function setWelcomeVisible(show) {
  welcomeScreenEl.classList.toggle('hidden', !show);
  messagesEl.classList.toggle('hidden', !show ? false : false);
}

function showLoading(show) {
  loadingEl.classList.toggle('hidden', !show);
  if (sendButton) {
    sendButton.disabled = show;
    sendButton.style.opacity = show ? '0.7' : '1';
  }
}

async function loadSearchInsights() {
  try {
    const searchValue = (searchInputEl?.value || '').trim();
    if (searchInputEl) {
      searchInputEl.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          const query = searchInputEl.value.trim();
          if (!query) return;
          const response = await fetch(`${API_BASE}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.detail || 'Search failed.');
          showToast(`Search results loaded for ${query}.`, 'success');
          if (data.results && ngoListEl) {
            ngoListEl.innerHTML = data.results.map((item) => `<div class="info-item"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.category)} • ${escapeHtml(item.summary)}</span></div>`).join('');
          }
        }
      });
    }

    const response = await fetch(`${API_BASE}/insights`);
    if (!response.ok) throw new Error('Unable to load insights data');
    const data = await response.json();

    if (data.summary && sidebarInsightEl) {
      sidebarInsightEl.textContent = data.summary;
    }

    if (data.highlights && ngoListEl) {
      ngoListEl.innerHTML = data.highlights.map((item) => `<div class="info-item"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div>`).join('');
    }

    if (searchValue) {
      const searchResponse = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchValue })
      });
      const searchData = await searchResponse.json();
      if (searchResponse.ok && searchData.results && ngoListEl) {
        ngoListEl.innerHTML = searchData.results.map((item) => `<div class="info-item"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.category)} • ${escapeHtml(item.summary)}</span></div>`).join('');
      }
    }
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Insights unavailable.', 'warning');
  }
}

async function loadTaskAndProfileData() {
  try {
    const tasksResponse = await fetch(`${API_BASE}/tasks`);
    if (!tasksResponse.ok) throw new Error('Unable to load tasks');
    const tasksData = await tasksResponse.json();

    if (activityListEl && tasksData.tasks) {
      activityListEl.innerHTML = tasksData.tasks.map((task) => `<div class="info-item"><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.status)}</span></div>`).join('');
    }

    const profileResponse = await fetch(`${API_BASE}/profile`);
    if (!profileResponse.ok) throw new Error('Unable to load profile');
    const profileData = await profileResponse.json();

    if (profileNameEl) {
      profileNameEl.textContent = profileData.name || 'Maya';
    }
    if (profileAvatarEl) {
      profileAvatarEl.textContent = (profileData.name || 'Maya').charAt(0).toUpperCase();
    }
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Profile data unavailable.', 'warning');
  }
}

function formatTitle(text) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 42) || 'New conversation';
}

function getActiveConversation() {
  return conversations.find((conversation) => conversation.id === activeConversationId) || null;
}

function renderHistory() {
  historyListEl.innerHTML = '';
  if (!conversations.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'history-item';
    emptyState.innerHTML = '<strong>No history yet</strong><span>New chats will appear here.</span>';
    historyListEl.appendChild(emptyState);
    return;
  }

  conversations.slice().reverse().forEach((conversation) => {
    const button = document.createElement('button');
    button.className = 'history-item';
    button.innerHTML = `<strong>${escapeHtml(conversation.title)}</strong><small>${escapeHtml(new Date(conversation.updatedAt).toLocaleString())}</small>`;
    button.addEventListener('click', () => {
      activeConversationId = conversation.id;
      renderConversation();
      showToast('Conversation reopened.', 'info');
    });
    historyListEl.appendChild(button);
  });
}

function renderConversation() {
  const activeConversation = getActiveConversation();
  if (!activeConversation || activeConversation.messages.length === 0) {
    welcomeScreenEl.classList.remove('hidden');
    messagesEl.innerHTML = '';
    messagesEl.classList.add('hidden');
    return;
  }

  welcomeScreenEl.classList.add('hidden');
  messagesEl.classList.remove('hidden');
  messagesEl.innerHTML = '';

  activeConversation.messages.forEach((message) => {
    if (message.typing) {
      const bubble = document.createElement('div');
      bubble.className = 'message assistant typing';
      bubble.innerHTML = '<span></span><span></span><span></span>';
      messagesEl.appendChild(bubble);
      return;
    }

    const bubble = document.createElement('div');
    bubble.className = `message ${message.role}`;
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const roleLabel = document.createElement('span');
    roleLabel.textContent = message.role === 'user' ? 'You' : 'Agent';
    meta.appendChild(roleLabel);
    if (message.role === 'assistant') {
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-btn';
      copyButton.type = 'button';
      copyButton.textContent = 'Copy';
      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(message.content);
          showToast('Response copied.', 'success');
        } catch (error) {
          showToast('Copy failed.', 'warning');
        }
      });
      meta.appendChild(copyButton);
    }

    bubble.appendChild(meta);
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = message.role === 'assistant' ? markdownToHtml(message.content) : escapeHtml(message.content);
    bubble.appendChild(content);
    messagesEl.appendChild(bubble);
  });

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function loadDashboardData() {
  try {
    const response = await fetch(`${API_BASE}/dashboard`);
    if (!response.ok) throw new Error('Unable to load dashboard data');
    const data = await response.json();

    if (data.stats) {
      statCards.forEach((card, index) => {
        const item = data.stats[index];
        if (item) {
          card.setAttribute('data-target', item.value);
        }
      });
    }

    if (data.upcoming_events && railListEl) {
      railListEl.innerHTML = data.upcoming_events.map((event) => `<div class="rail-item"><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(event.time)}</span></div>`).join('');
    }

    if (data.ngo_suggestions && ngoListEl) {
      ngoListEl.innerHTML = data.ngo_suggestions.map((partner) => `<div class="info-item"><strong>${escapeHtml(partner.name)}</strong><span>${escapeHtml(partner.focus)} • ${escapeHtml(partner.reason)}</span></div>`).join('');
    }

    if (data.activity && activityListEl) {
      activityListEl.innerHTML = data.activity.map((item) => `<div class="info-item"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.time)}</span></div>`).join('');
    }

    if (data.sidebar) {
      if (sidebarScoreEl) {
        sidebarScoreEl.textContent = data.sidebar.impact_score;
      }
      if (sidebarInsightEl) {
        sidebarInsightEl.textContent = data.sidebar.insight;
      }
    }

    animateStats();
  } catch (error) {
    showToast(error.message || 'Dashboard unavailable.', 'error');
    console.error(error);
  }
}

function animateStats() {
  statCards.forEach((counter) => {
    const target = Number(counter.getAttribute('data-target') || 0);
    let start = 0;
    const step = Math.max(1, Math.floor(target / 20));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        counter.textContent = target.toString();
        clearInterval(timer);
      } else {
        counter.textContent = start.toString();
      }
    }, 30);
  });
}

function observeReveals() {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  reveals.forEach((element) => observer.observe(element));
}

async function loadHistory() {
  try {
    const response = await fetch(`${API_BASE}/history`);
    if (!response.ok) throw new Error('Unable to load chat history');
    const data = await response.json();
    const historyItems = data.history || [];
    const parsedConversations = [];
    let currentConversation = null;

    historyItems.forEach((item) => {
      if (item.role === 'user') {
        currentConversation = {
          id: `conv-${item.id}`,
          title: formatTitle(item.content),
          messages: [{ role: 'user', content: item.content }],
          updatedAt: item.created_at || new Date().toISOString(),
        };
        parsedConversations.push(currentConversation);
      } else if (item.role === 'assistant' && currentConversation) {
        currentConversation.messages.push({ role: 'assistant', content: item.content });
        currentConversation.updatedAt = item.created_at || currentConversation.updatedAt;
      }
    });

    conversations = parsedConversations;
    if (conversations.length) {
      activeConversationId = conversations[conversations.length - 1].id;
    } else {
      activeConversationId = null;
    }
    renderHistory();
    renderConversation();
  } catch (error) {
    showToast('Unable to load previous history.', 'warning');
    console.error(error);
  }
}

function startNewConversation() {
  activeConversationId = null;
  renderConversation();
  showToast('Started a new conversation.', 'info');
}

async function sendMessage(message, mode = 'chat') {
  let activeConversation = getActiveConversation();
  if (!activeConversation) {
    activeConversation = {
      id: `conv-${Date.now()}`,
      title: formatTitle(message),
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    conversations.unshift(activeConversation);
    activeConversationId = activeConversation.id;
  }

  if (mode === 'chat') {
    activeConversation.messages.push({ role: 'user', content: message });
    activeConversation.updatedAt = new Date().toISOString();
    activeConversation.title = formatTitle(message);
    renderConversation();
    renderHistory();
  }

  showLoading(true);
  isTyping = true;
  if (mode === 'chat') {
    activeConversation.messages.push({ role: 'assistant', content: '', typing: true });
    renderConversation();
  }

  try {
    let response;
    let data;

    if (mode === 'chat') {
      response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to process your request.');
      activeConversation.messages = activeConversation.messages.filter((entry) => !entry.typing);
      activeConversation.messages.push({ role: 'assistant', content: data.reply || 'No response received.' });
      activeConversation.updatedAt = new Date().toISOString();
      renderConversation();
      renderHistory();
      showToast('Response received.', 'success');
      return data.reply;
    }

    if (mode === 'planner') {
      response = await fetch(`${API_BASE}/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: message })
      });
      data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to generate planner output.');
      activeConversation.messages = activeConversation.messages.filter((entry) => !entry.typing);
      activeConversation.messages.push({ role: 'assistant', content: data.plan || 'No planner output received.' });
      activeConversation.updatedAt = new Date().toISOString();
      renderConversation();
      renderHistory();
      showToast('Planner generated.', 'success');
      return data.plan;
    }

    if (mode === 'email') {
      response = await fetch(`${API_BASE}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: message })
      });
      data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to generate email draft.');
      activeConversation.messages = activeConversation.messages.filter((entry) => !entry.typing);
      activeConversation.messages.push({ role: 'assistant', content: data.email || 'No email draft received.' });
      activeConversation.updatedAt = new Date().toISOString();
      renderConversation();
      renderHistory();
      showToast('Email draft generated.', 'success');
      return data.email;
    }

    if (mode === 'report') {
      response = await fetch(`${API_BASE}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: message })
      });
      data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to generate report.');
      activeConversation.messages = activeConversation.messages.filter((entry) => !entry.typing);
      activeConversation.messages.push({ role: 'assistant', content: data.report || 'No report received.' });
      activeConversation.updatedAt = new Date().toISOString();
      renderConversation();
      renderHistory();
      showToast('Report generated.', 'success');
      return data.report;
    }

    if (mode === 'partners') {
      response = await fetch(`${API_BASE}/partners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: message })
      });
      data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to load partner suggestions.');
      if (data.partners && ngoListEl) {
        ngoListEl.innerHTML = data.partners.map((partner) => `<div class="info-item"><strong>${escapeHtml(partner.name)}</strong><span>${escapeHtml(partner.focus)} • ${escapeHtml(partner.reason)}</span></div>`).join('');
      }
      activeConversation.messages = activeConversation.messages.filter((entry) => !entry.typing);
      activeConversation.messages.push({ role: 'assistant', content: data.partners.map((partner) => `• ${partner.name}: ${partner.reason}`).join('\n') });
      activeConversation.updatedAt = new Date().toISOString();
      renderConversation();
      renderHistory();
      showToast('Partner suggestions loaded.', 'success');
      return data.partners;
    }

    throw new Error('Unsupported action.');
  } catch (error) {
    if (mode === 'chat') {
      isTyping = false;
      activeConversation.messages = activeConversation.messages.filter((entry) => !entry.typing);
      activeConversation.messages.push({ role: 'assistant', content: 'Sorry, I could not reach the agent service.' });
      renderConversation();
      renderHistory();
    }
    showToast(error.message || 'Service unavailable.', 'error');
    console.error(error);
    return null;
  } finally {
    showLoading(false);
    isTyping = false;
  }
}

function exportConversation(format) {
  const activeConversation = getActiveConversation();
  if (!activeConversation) {
    showToast('Start a conversation before exporting.', 'warning');
    return;
  }

  const content = activeConversation.messages.map((message) => `${message.role === 'user' ? 'You' : 'Agent'}:\n${message.content}`).join('\n\n');

  if (format === 'txt') {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'conversation.txt';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Conversation exported as TXT.', 'success');
    return;
  }

  const printWindow = window.open('', '', 'width=800,height=900');
  if (!printWindow) {
    showToast('Allow popups to export as PDF.', 'warning');
    return;
  }

  printWindow.document.write(`<!doctype html><html><head><title>Conversation</title><style>body{font-family:Arial;padding:24px;}pre{white-space:pre-wrap;}</style></head><body><pre>${escapeHtml(content)}</pre></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  showToast('Print dialog opened for PDF export.', 'info');
}

function clearConversation() {
  const activeConversation = getActiveConversation();
  if (!activeConversation) {
    showToast('There is no active conversation to clear.', 'warning');
    return;
  }
  if (!window.confirm('Delete this conversation?')) {
    return;
  }
  conversations = conversations.filter((conversation) => conversation.id !== activeConversation.id);
  activeConversationId = conversations[0]?.id || null;
  renderConversation();
  renderHistory();
  showToast('Conversation cleared.', 'info');
}

formEl.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = inputEl.value.trim();
  if (!message) return;

  inputEl.value = '';
  await sendMessage(message);
});

inputEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    formEl.requestSubmit();
  } else if (event.key === 'Enter' && event.shiftKey) {
    event.preventDefault();
    const start = inputEl.selectionStart;
    const end = inputEl.selectionEnd;
    inputEl.value = `${inputEl.value.slice(0, start)}\n${inputEl.value.slice(end)}`;
    inputEl.setSelectionRange(start + 1, start + 1);
  }
});

promptButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const prompt = button.getAttribute('data-prompt');
    inputEl.value = prompt;
    inputEl.focus();
    await sendMessage(prompt, 'chat');
  });
});

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    inputEl.focus();
  }
});

newChatBtn.addEventListener('click', startNewConversation);
exportTxtBtn.addEventListener('click', () => exportConversation('txt'));
exportPdfBtn.addEventListener('click', () => exportConversation('pdf'));
clearChatBtn.addEventListener('click', clearConversation);

if (launchChatButton) {
  launchChatButton.addEventListener('click', () => {
    const chatSection = document.getElementById('chat');
    chatSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    inputEl.focus();
  });
}

if (exploreFeaturesButton) {
  exploreFeaturesButton.addEventListener('click', () => {
    const featureSection = document.getElementById('planner');
    featureSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

plannerCard.addEventListener('click', () => {
  openModal('Event Planner', `
    <form id="planner-form" class="modal-form">
      <label>Event Name<input name="event_name" required placeholder="Community Orchard Day" /></label>
      <label>Location<input name="location" required placeholder="Seattle" /></label>
      <label>Date<input name="date" required type="date" /></label>
      <label>Number of Volunteers<input name="volunteers" required type="number" min="1" value="15" /></label>
      <div class="modal-actions">
        <button type="button" class="ghost-btn" id="planner-cancel">Cancel</button>
        <button type="submit" class="primary-btn">Generate Plan</button>
      </div>
    </form>
  `);

  document.getElementById('planner-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    payload.volunteers = Number(payload.volunteers);
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    try {
      const data = await runFeatureRequest('/event-plan', payload, submitButton);
      const plan = data.plan;
      openModal('Event Planner', `
        <div class="result-card">
          <h4>${escapeHtml(plan.event_name)}</h4>
          <p><strong>Objectives</strong></p>
          <ul>${plan.objectives.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          <p><strong>Budget</strong>: ${escapeHtml(plan.budget)}</p>
          <p><strong>Materials</strong>: ${escapeHtml(plan.materials.join(', '))}</p>
          <p><strong>Volunteer Roles</strong></p>
          <ul>${plan.volunteer_roles.map((item) => `<li>${escapeHtml(item.role)} — ${escapeHtml(item.responsibility)}</li>`).join('')}</ul>
          <p><strong>Timeline</strong></p>
          <ul>${plan.timeline.map((item) => `<li>${escapeHtml(item.step)}: ${escapeHtml(item.detail)}</li>`).join('')}</ul>
          <p><strong>Checklist</strong></p>
          <ul>${plan.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
      `);
      showToast('Event plan generated.', 'success');
    } catch (error) {
      showToast(error.message || 'Unable to generate event plan.', 'error');
    }
  });

  document.getElementById('planner-cancel').addEventListener('click', closeModal);
});

partnersCard.addEventListener('click', () => {
  openModal('Partner Finder', `
    <form id="partner-form" class="modal-form">
      <label>Event Type<input name="event_type" required placeholder="tree planting" /></label>
      <label>City<input name="city" required placeholder="Seattle" /></label>
      <div class="modal-actions">
        <button type="button" class="ghost-btn" id="partner-cancel">Cancel</button>
        <button type="submit" class="primary-btn">Find Partners</button>
      </div>
    </form>
  `);

  document.getElementById('partner-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    try {
      const data = await runFeatureRequest('/partner-finder', payload, submitButton);
      openModal('Partner Finder', `
        <div class="partner-grid">
          ${data.partners.map((partner) => `
            <div class="partner-card">
              <strong>${escapeHtml(partner.name)}</strong>
              <span>${escapeHtml(partner.category)}</span>
              <p>${escapeHtml(partner.description)}</p>
              <p><strong>Contact</strong>: ${escapeHtml(partner.contact)}</p>
            </div>
          `).join('')}
        </div>
      `);
      showToast('Partner suggestions loaded.', 'success');
    } catch (error) {
      showToast(error.message || 'Unable to find partners.', 'error');
    }
  });

  document.getElementById('partner-cancel').addEventListener('click', closeModal);
});

emailCard.addEventListener('click', () => {
  openModal('Email Generator', `
    <form id="email-form" class="modal-form">
      <label>Recipient<input name="recipient" required placeholder="maria@ngo.org" /></label>
      <label>Purpose<textarea name="purpose" rows="4" required placeholder="Request a partnership for a sustainability event"></textarea></label>
      <div class="modal-actions">
        <button type="button" class="ghost-btn" id="email-cancel">Cancel</button>
        <button type="submit" class="primary-btn">Generate Email</button>
      </div>
    </form>
  `);

  document.getElementById('email-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    try {
      const data = await runFeatureRequest('/email-generator', payload, submitButton);
      const email = data.email;
      openModal('Email Generator', `
        <div class="result-card">
          <h4>${escapeHtml(email.subject)}</h4>
          <p>${escapeHtml(email.body)}</p>
          <div class="modal-actions">
            <button type="button" class="ghost-btn copy-btn-inline" id="copy-email">Copy Email</button>
          </div>
        </div>
      `);
      document.getElementById('copy-email').addEventListener('click', async () => {
        await navigator.clipboard.writeText(email.body);
        showToast('Email copied.', 'success');
      });
      showToast('Email generated.', 'success');
    } catch (error) {
      showToast(error.message || 'Unable to generate email.', 'error');
    }
  });

  document.getElementById('email-cancel').addEventListener('click', closeModal);
});

reportsCard.addEventListener('click', async () => {
  try {
    const data = await runFeatureRequest('/report-generator', { topic: 'community sustainability' }, reportsCard);
    const report = data.report;
    openModal('Report Generator', `
      <div class="result-card">
        <h4>${escapeHtml(report.title)}</h4>
        <p>${escapeHtml(report.summary)}</p>
        ${report.sections.map((section) => `<div class="result-card"><h4>${escapeHtml(section.heading)}</h4><p>${escapeHtml(section.content)}</p></div>`).join('')}
        <div class="modal-actions">
          <button type="button" class="ghost-btn" id="download-report">Download PDF</button>
        </div>
      </div>
    `);
    document.getElementById('download-report').addEventListener('click', () => {
      const printWindow = window.open('', '', 'width=800,height=900');
      if (!printWindow) return;
      printWindow.document.write(`<html><body><h2>${escapeHtml(report.title)}</h2><p>${escapeHtml(report.summary)}</p>${report.sections.map((section) => `<h3>${escapeHtml(section.heading)}</h3><p>${escapeHtml(section.content)}</p>`).join('')}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      showToast('Report ready for download.', 'success');
    });
    showToast('Report generated.', 'success');
  } catch (error) {
    showToast(error.message || 'Unable to generate report.', 'error');
  }
});

const insightsCard = document.getElementById('insights');
insightsCard.addEventListener('click', async () => {
  try {
    const data = await runFeatureRequest('/sdg-insights', { topic: 'SDG 17' }, insightsCard);
    openModal('SDG Insights', `
      <div class="result-card">
        <h4>SDG Insights</h4>
        <p>${escapeHtml(data.summary)}</p>
        <ul>${data.points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>
      </div>
    `);
    showToast('Insights generated.', 'success');
  } catch (error) {
    showToast(error.message || 'Unable to generate insights.', 'error');
  }
});

modalCloseBtn.addEventListener('click', closeModal);
modalRootEl.addEventListener('click', (event) => {
  if (event.target === modalRootEl) closeModal();
});

observeReveals();
loadDashboardData();
loadHistory();
loadSearchInsights();
loadTaskAndProfileData();
