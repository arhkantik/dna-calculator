const BASE = '/api';

async function request(url, opts = {}) {
  const res = await fetch(BASE + url, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function diagnose(formData, answers) {
  return request('/diagnose', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...formData, answers })
  });
}

export function getHistory() {
  return request('/history');
}

export function getDiagnostic(id) {
  return request(`/diagnostic/${id}`);
}
