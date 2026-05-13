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

export function saveLead(data) {
  return request('/leads', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data)
  });
}

export function getAdminLeads(includeArchived = false) {
  return request(`/admin/leads${includeArchived ? '?archived=true' : ''}`);
}

export function archiveLead(id, archived) {
  return request(`/admin/leads/${id}/archive`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ archived })
  });
}

export function getLeadResults(id) {
  return request(`/admin/leads/${id}/results`);
}

export function updateLeadStatus(id, status) {
  return request(`/admin/leads/${id}/status`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ status })
  });
}

export function updateLeadManager(id, manager) {
  return request(`/admin/leads/${id}/manager`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ manager })
  });
}

export function markLeadClicked(lead_id) {
  return request('/lead-clicked', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ lead_id })
  });
}

export function syncToSheets() {
  return request('/admin/sync-sheets', { method: 'POST' });
}
