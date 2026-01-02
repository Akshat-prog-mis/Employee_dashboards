import { getAuthUser } from './auth.js';
const CACHE = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds

// API Endpoints
const API_BASES = {
  tasks: 'https://script.google.com/macros/s/AKfycbwEG5QTclinIyBCGzqnY6ofnx1mw6gh5RW1ogTjcBjUghssttCc0YZLGkKSuXB1xRl9/exec',
  bis: 'https://script.google.com/macros/s/AKfycby7CrJGDyOhEkjRDgZe0rGRCztzniMVW1G6G9fYfyDbiG77EAtEvD1zjSWp1wN3a9jTjg/exec',
  systems: 'https://script.google.com/macros/s/AKfycbwmYPnRKjTH9H_RdM7WBQQ1TzvxYQKQuE6k7UAMFQgL0_DVe4KteuVm6BubHTF7WkAZWw/exec',
  delegation: 'https://script.google.com/macros/s/AKfycbzBNI6aIfiS8_yi0wNj5OqQdttDKzmgJShoO1rR3qAitDh1naxu2AoDsfIkddkLMkpC/exec'
};

// ========== Shared Utilities ==========
function getCurrentUserEmail() {
  const email = getAuthUser();
  if (!email) throw new Error('Authentication required');
  return email.toLowerCase();
}

// Parse ISO or locale date safely
/**
 * @param {string | null | undefined} dateStr
 * @returns {Date | null}
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

// Normalize date for comparison (set to start of day)
/**
 * @param {Date | null | undefined} date
 * @returns {Date | null}
 */
function normalizeDate(date) {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Format date as DD/MM/YYYY
/**
 * @param {Date | null | undefined} date
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB');
}

// Format datetime as DD/MM/YYYY, HH:MM (24h)
/**
 * @param {Date | null | undefined} date
 * @returns {string}
 */
function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(',', '');
}

// ✅ Robust fetch with timeout and HTML error check
/**
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<any>}
 */
async function apiFetch(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    // Check for HTML response (e.g., Google Apps Script permission error)
    const text = await res.text();
    if (text.trim().startsWith('<')) {
      console.error('API returned HTML (likely permission/CORS issue):', text.substring(0, 200));
      throw new Error('Service unavailable. Please contact admin.');
    }
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      // ✅ Fixed: use backticks for template literal
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    return json;
  } catch (err) {
    clearTimeout(timeoutId);
    const error = /** @type {Error} */ (err);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

// ========== TASKS API ==========
export async function fetchTasks() {
  const email = getCurrentUserEmail();
  const cacheKey = `tasks:${email}`;
  const now = Date.now();

  if (CACHE.has(cacheKey)) {
    const cached = CACHE.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    // ✅ Pass user_email to backend!
    const data = await apiFetch(`${API_BASES.tasks}?action=getTasks&user_email=${encodeURIComponent(email)}`);
    const today = normalizeDate(new Date());
    if (!today) throw new Error('Invalid current date');
    const tasks = (Array.isArray(data) ? data : [])
      .filter(row => {
        const planned = parseDate(row.Planned);
        if (!planned) return false;
        const normalized = normalizeDate(planned);
        if (!normalized) return false;
        return (
          row.Email?.toLowerCase() === email &&
          !row.Actual &&
          (!row['Task Status'] || row['Task Status'] === 'Due') &&
          normalized <= today
        );
      })
      .map(row => ({
        id: String(row['Task ID'] || ''),
        name: String(row.Task || '(No title)'),
        planned: formatDate(parseDate(row.Planned))
      }));

    const result = tasks;
    CACHE.set(cacheKey, { data: result, timestamp: now });
    return result;
  } catch (err) {
    throw err;
  }
}

/**
 * @param {string} taskId
 * @returns {Promise<boolean>}
 */
export async function completeTask(taskId) {
  if (!taskId) throw new Error('Task ID required');
  await apiFetch(`${API_BASES.tasks}?action=markCompleted&task_id=${encodeURIComponent(taskId)}`);
  return true;
}

// ========== BIS TASKS API ==========
// ========== BIS TASKS API ==========
export async function fetchBisTasks() {
  const email = getCurrentUserEmail();
  const cacheKey = `bis:${email}`;
  const now = Date.now();

  // ✅ Return cached result if fresh
  if (CACHE.has(cacheKey)) {
    const cached = CACHE.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    const data = await apiFetch(`${API_BASES.bis}?action=getBisTasks&user_email=${encodeURIComponent(email)}`);
    const nowDate = normalizeDate(new Date());
    if (!nowDate) throw new Error('Invalid current date');
    const tasks = (Array.isArray(data) ? data : [])
      .filter(row => {
        const planned = parseDate(row.Planned);
        if (!planned) return false;
        const normalized = normalizeDate(planned);
        if (!normalized) return false;
        return (
          row['Doer Email']?.toLowerCase() === email &&
          normalized <= nowDate
        );
      })
      .map(row => {
        const plannedDate = parseDate(row.Planned);
        if (!plannedDate) throw new Error('Invalid planned date');
        const delayMs = Date.now() - plannedDate.getTime();
        const timeDelayHrs = delayMs > 0 ? Math.floor(delayMs / (1000 * 60 * 60)) : 0;
        return {
          id: String(row['Unique Keys'] || ''),
          planned: formatDateTime(plannedDate),
          step: String(row.Step || ''),
          description: String(row.How || ''),
          markDoneUrl: String(row.Link || ''),
          fmsLink: String(row['FMS Link'] || ''),
          fmsName: String(row['FMS Name'] || ''),
          timeDelayHrs
        };
      });

    // ✅ Cache the result
    const result = tasks;
    CACHE.set(cacheKey, { data: result, timestamp: now });
    return result;
  } catch (err) {
    // Don't cache errors
    throw err;
  }
}

// ========== SYSTEMS API ==========
export async function fetchSystems() {
  const email = getCurrentUserEmail();
  const cacheKey = `systems:${email}`;
  const now = Date.now();

  // ✅ Return cached result if fresh
  if (CACHE.has(cacheKey)) {
    const cached = CACHE.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    const data = await apiFetch(`${API_BASES.systems}?action=getSystems&user_email=${encodeURIComponent(email)}`);
    /** @type {any[]} */
    const launcher = [];
    /** @type {any[]} */
    const mySystem = [];

    (Array.isArray(data) ? data : [])
      .filter(row => {
        const rowEmail = String(row['Doer Email'] || '').trim().toLowerCase();
        return (
          rowEmail === email &&
          row['System Name'] &&
          row['System URL'] &&
          (row['Starter/ Performer'] === 'S' || row['Starter/ Performer'] === 'P')
        );
      })
      .forEach(row => {
        const item = {
          name: String(row['System Name']),
          url: String(row['System URL']),
          description: String(row['Description'] || ''),
          associatedLink: row['Associated Links'] ? String(row['Associated Links']) : null
        };
        if (row['Starter/ Performer'] === 'S') {
          launcher.push(item);
        } else if (row['Starter/ Performer'] === 'P') {
          mySystem.push(item);
        }
      });

    const result = { launcher, mySystem };
    // ✅ Cache the result
    CACHE.set(cacheKey, { data: result, timestamp: now });
    return result;
  } catch (err) {
    // Don't cache errors
    throw err;
  }
}

// ========== DELEGATION API ==========
export async function fetchDelegationData() {
  const user_email = getCurrentUserEmail();
  const cacheKey = `delegation:${user_email}`;
  const now = Date.now();

  // ✅ Add caching
  if (CACHE.has(cacheKey)) {
    const cached = CACHE.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    // ✅ Pass user_email to both endpoints
    const [tasks, users] = await Promise.all([
      apiFetch(`${API_BASES.delegation}?action=get_tasks&user_email=${encodeURIComponent(user_email)}`),
      apiFetch(`${API_BASES.delegation}?action=get_users&user_email=${encodeURIComponent(user_email)}`)
    ]);
    
    // ✅ Backend already filters tasks - no need to filter again
    const result = {
      tasks: Array.isArray(tasks) ? tasks : [],
      users: Array.isArray(users) ? users : []
    };
    
    // ✅ Cache the result
    CACHE.set(cacheKey, { data: result, timestamp: now });
    return result;
  } catch (err) {
    throw err;
  }
}

// ✅ Add user_email to create/update calls
/**
 * @param {any} payload
 * @returns {Promise<any>}
 */
export async function createDelegationTask(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
  const user_email = getCurrentUserEmail();
  return await apiFetch(`${API_BASES.delegation}?action=create_task&user_email=${encodeURIComponent(user_email)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

/**
 * @param {any} payload
 * @returns {Promise<any>}
 */
export async function updateDelegationTask(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
  const user_email = getCurrentUserEmail();
  return await apiFetch(`${API_BASES.delegation}?action=update_task&user_email=${encodeURIComponent(user_email)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}