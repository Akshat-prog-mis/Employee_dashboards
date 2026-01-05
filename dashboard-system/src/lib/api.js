import { getAuthUser } from './auth.js';

const CACHE = new Map();
const CACHE_TTL = 30 * 1000;
const CF_PROXY = 'https://employeedas.mis-truetone.workers.dev';

const API_BASES = {
  tasks: 'https://script.google.com/macros/s/AKfycbwEG5QTclinIyBCGzqnY6ofnx1mw6gh5RW1ogTjcBjUghssttCc0YZLGkKSuXB1xRl9/exec',
  bis: 'https://script.google.com/macros/s/AKfycby7CrJGDyOhEkjRDgZe0rGRCztzniMVW1G6G9fYfyDbiG77EAtEvD1zjSWp1wN3a9jTjg/exec',
  systems: 'https://script.google.com/macros/s/AKfycbwmYPnRKjTH9H_RdM7WBQQ1TzvxYQKQuE6k7UAMFQgL0_DVe4KteuVm6BubHTF7WkAZWw/exec',
  delegation: 'https://script.google.com/macros/s/AKfycbwdoJqTCz9ocP02UBPtasFuImG-gHK8r-TBmQg3NvvOuF83SHiTrv_kOn3nop_Po2XW/exec'
};

/* ================= AUTH ================= */

function getCurrentUserEmail() {
  const email = getAuthUser();
  if (!email) throw new Error('AUTH_REQUIRED');
  return email.toLowerCase();
}

/* ================= DATE UTILS ================= */

const parseDate = v => {
  const d = new Date(v);
  return isNaN(d) ? null : d;
};

const normalizeDate = d => {
  if (!d) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDate = d =>
  d ? new Date(d).toLocaleDateString('en-GB') : '';

const formatDateTime = d =>
  d
    ? new Date(d)
        .toLocaleString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
        .replace(',', '')
    : '';

/* ================= CORE FETCH ================= */

async function apiFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const proxyUrl = `${CF_PROXY}?target=${encodeURIComponent(url)}`;

  try {
    const res = await fetch(proxyUrl, { ...options, signal: controller.signal });
    const text = await res.text();

    if (text.trim().startsWith('<')) {
      throw new Error('BACKEND_RETURNED_HTML');
    }

    const json = text ? JSON.parse(text) : null;

    if (!res.ok) {
      throw new Error(json?.error || `HTTP_${res.status}`);
    }

    return { ok: true, data: json, error: null };
  } catch (e) {
    return {
      ok: false,
      data: null,
      error: e.name === 'AbortError' ? 'TIMEOUT' : e.message
    };
  } finally {
    clearTimeout(timeout);
  }
}

/* ================= CACHE WRAPPER ================= */

async function cachedFetch(key, fetcher) {
  const now = Date.now();
  const cached = CACHE.get(key);

  if (cached && now - cached.ts < CACHE_TTL) return cached.value;

  const result = await fetcher();
  if (result.ok) CACHE.set(key, { value: result, ts: now });
  return result;
}

/* ================= TASKS ================= */

export async function fetchTasks() {
  const email = getCurrentUserEmail();
  return cachedFetch(`tasks:${email}`, async () => {
    const res = await apiFetch(
      `${API_BASES.tasks}?action=getTasks&user_email=${encodeURIComponent(email)}`
    );

    if (!res.ok) return res;

    const today = normalizeDate(new Date());

    const data = (Array.isArray(res.data) ? res.data : [])
      .filter(r => {
        const p = normalizeDate(parseDate(r.Planned));
        return (
          r.Email?.toLowerCase() === email &&
          !r.Actual &&
          (!r['Task Status'] || r['Task Status'] === 'Due') &&
          p && p <= today
        );
      })
      .map(r => ({
        id: String(r['Task ID'] || ''),
        name: String(r.Task || ''),
        planned: formatDate(r.Planned)
      }));

    return { ok: true, data, error: null };
  });
}

export async function completeTask(taskId) {
  if (!taskId) throw new Error('TASK_ID_REQUIRED');
  return apiFetch(
    `${API_BASES.tasks}?action=markCompleted&task_id=${encodeURIComponent(taskId)}`
  );
}

/* ================= BIS ================= */

export async function fetchBisTasks() {
  const email = getCurrentUserEmail();
  return cachedFetch(`bis:${email}`, async () => {
    const res = await apiFetch(
      `${API_BASES.bis}?action=getBisTasks&user_email=${encodeURIComponent(email)}`
    );
    if (!res.ok) return res;

    const today = normalizeDate(new Date());

    const data = (res.data || [])
      .filter(r => {
        const p = normalizeDate(parseDate(r.Planned));
        return r['Doer Email']?.toLowerCase() === email && p && p <= today;
      })
      .map(r => {
        const planned = parseDate(r.Planned);
        return {
          id: String(r['Unique Keys']),
          planned: formatDateTime(planned),
          step: String(r.Step || ''),
          description: String(r.How || ''),
          markDoneUrl: String(r.Link || ''),
          fmsLink: String(r['FMS Link'] || ''),
          fmsName: String(r['FMS Name'] || ''),
          timeDelayHrs: planned
            ? Math.max(0, Math.floor((Date.now() - planned) / 36e5))
            : 0
        };
      });

    return { ok: true, data, error: null };
  });
}

/* ================= SYSTEMS ================= */

export async function fetchSystems() {
  const email = getCurrentUserEmail();
  return cachedFetch(`systems:${email}`, async () => {
    const res = await apiFetch(
      `${API_BASES.systems}?action=getSystems&user_email=${encodeURIComponent(email)}`
    );
    if (!res.ok) return res;

    const launcher = [];
    const mySystem = [];

    (res.data || []).forEach(r => {
      if (r['Doer Email']?.toLowerCase() !== email) return;

      const item = {
        name: r['System Name'],
        url: r['System URL'],
        description: r.Description || '',
        associatedLink: r['Associated Links'] || null
      };

      r['Starter/ Performer'] === 'S'
        ? launcher.push(item)
        : mySystem.push(item);
    });

    return { ok: true, data: { launcher, mySystem }, error: null };
  });
}

/* ================= DELEGATION ================= */

const delegationFetch = (action, email, options = {}) =>
  apiFetch(
    `${API_BASES.delegation}?action=${action}&user_email=${encodeURIComponent(
      email
    )}`,
    options
  );

export async function fetchDelegationData() {
  const email = getCurrentUserEmail();
  return cachedFetch(`delegation:${email}`, async () => {
    const [tasks, users] = await Promise.all([
      delegationFetch('get_tasks', email),
      delegationFetch('get_users', email)
    ]);

    if (!tasks.ok) return tasks;
    if (!users.ok) return users;

    return {
      ok: true,
      data: {
        tasks: tasks.data || [],
        users: users.data || []
      },
      error: null
    };
  });
}

export const createDelegationTask = payload =>
  delegationWrite('create_task', payload);

export const updateDelegationTask = payload =>
  delegationWrite('update_task', payload);

async function delegationWrite(action, payload) {
  if (!payload || typeof payload !== 'object')
    throw new Error('INVALID_PAYLOAD');

  const email = getCurrentUserEmail();

  return delegationFetch(action, email, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(payload)
  });
}
