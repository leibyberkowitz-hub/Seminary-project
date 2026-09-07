// Each of the three sites has its own identity and its own sessions: tokens
// are stored under a per-site key and issued by the API for that site only.
const site = { id: 'attendance', name: 'Seminary Attendance' };
export function configureSite(id, name) { site.id = id; site.name = name; }
export const siteId = () => site.id;
export const siteName = () => site.name;

const TOKEN_KEY = () => `seminary_token_${site.id}`;
const USER_KEY = () => `seminary_user_${site.id}`;

export const getToken = () => localStorage.getItem(TOKEN_KEY());
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY())); } catch { return null; }
};
export const isAdmin = () => getUser()?.role === 'admin';

export function logout() {
  localStorage.removeItem(TOKEN_KEY());
  localStorage.removeItem(USER_KEY());
  window.location.reload();
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && getToken()) { logout(); return; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function login(email, password) {
  const data = await api('/auth/login', { method: 'POST', body: { email, password, portal: site.id } });
  localStorage.setItem(TOKEN_KEY(), data.token);
  localStorage.setItem(USER_KEY(), JSON.stringify(data.user));
  return data.user;
}

export function qs(params) {
  const p = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return p ? `?${p}` : '';
}

export async function downloadCsv(entity, filters = {}) {
  const res = await fetch(`/api/export/${entity}.csv${qs(filters)}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${entity}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---- formatting helpers ----
export const fmtMoney = (v) => {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  return (n < 0 ? '-£' : '£') + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
export const fmtDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const isoDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d) ? '' : d.toISOString().slice(0, 10);
};
export const todayIso = () => new Date().toISOString().slice(0, 10);
