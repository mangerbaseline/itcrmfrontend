'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../../layout';

export default function TimesheetPage() {
  const { user, token, API } = useApp();
  const role = user?.role;
  const isDev = role === 'dev';
  const isPM = role === 'pm';
  const isOwner = role === 'owner';

  const [projects, setProjects] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Submit form
  const [form, setForm] = useState({ projectId: '', date: new Date().toISOString().split('T')[0], onlineHours: '', offlineHours: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterProject, setFilterProject] = useState('');
  const [filterDev, setFilterDev] = useState('');

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    if (token) { fetchProjects(); fetchTimesheets(); if (!isDev) fetchUsers(); }
  }, [token]);

  async function fetchProjects() {
    try {
      const res = await fetch(`${API}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setProjects(data.projects);
    } catch(e) {}
  }

  async function fetchUsers() {
    try {
      const res = await fetch(`${API}/api/users?role=dev`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch(e) {}
  }

  async function fetchTimesheets() {
    setLoading(true);
    try {
      let url = `${API}/api/timesheets?`;
      if (filterProject) url += `projectId=${filterProject}&`;
      if (filterDev && !isDev) url += `developerId=${filterDev}&`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setTimesheets(data.timesheets);
    } catch(e) {}
    setLoading(false);
  }

  useEffect(() => { if (token) fetchTimesheets(); }, [filterProject, filterDev]);

  async function submitTimesheet(e) {
    e.preventDefault();
    if (!form.projectId || !form.date) return showToast('Project and date required', 'error');
    if (!form.onlineHours && !form.offlineHours) return showToast('Enter at least some hours', 'error');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/timesheets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          projectId: form.projectId,
          date: form.date,
          onlineHours: Number(form.onlineHours) || 0,
          offlineHours: Number(form.offlineHours) || 0,
          description: form.description
        })
      });
      const data = await res.json();
      if (data.success) {
        const ai = data.timesheet.aiFeedback;
        showToast(`Timesheet submitted! ${ai ? `AI: ${ai}` : ''}`);
        setForm({ projectId: '', date: new Date().toISOString().split('T')[0], onlineHours: '', offlineHours: '', description: '' });
        fetchTimesheets();
      } else showToast(data.message, 'error');
    } catch(e) { showToast('Error submitting', 'error'); }
    setSubmitting(false);
  }

  async function approveTimesheet(id, status) {
    try {
      const res = await fetch(`${API}/api/timesheets/${id}/approve`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) { showToast(`Timesheet ${status}`); fetchTimesheets(); }
    } catch(e) {}
  }

  // Filter projects for timesheet submission (dev sees only their assigned projects)
  const myProjects = isDev ? projects.filter(p => p.developers?.some(d => d._id === user?.id) || p.developers?.some(d => d._id === user?._id)) : projects;

  const totalHours = timesheets.reduce((s, t) => s + t.totalHours, 0);
  const totalOnline = timesheets.reduce((s, t) => s + t.onlineHours, 0);
  const totalOffline = timesheets.reduce((s, t) => s + t.offlineHours, 0);

  return (
    <div>
      <div className="navbar">
        <h2>⏱️ Timesheet</h2>
        <span style={{ fontSize: '12px', color: 'var(--text2)' }}>
          {totalHours > 0 ? `${totalHours}h total (${totalOnline}h online, ${totalOffline}h offline)` : ''}
        </span>
      </div>

      {/* Submit timesheet (Dev only) */}
      {isDev && (
        <div className="card">
          <div className="card-title">Submit Daily Hours</div>
          <form onSubmit={submitTimesheet}>
            <div className="grid-3">
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Project *</label>
                <select className="input" value={form.projectId} onChange={e => setForm({...form, projectId: e.target.value})} required>
                  <option value="">Select project</option>
                  {myProjects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Date *</label>
                <input className="input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Online Hours</label>
                <input className="input" type="number" step="0.5" value={form.onlineHours} onChange={e => setForm({...form, onlineHours: e.target.value})} placeholder="e.g. 6" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Offline Hours</label>
                <input className="input" type="number" step="0.5" value={form.offlineHours} onChange={e => setForm({...form, offlineHours: e.target.value})} placeholder="e.g. 2" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>What did you work on? *</label>
                <textarea className="input" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Describe your work today - AI will verify if it's project-related" required />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Timesheet'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      {!isDev && (
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="input" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ maxWidth: '200px', marginBottom: 0 }}>
              <option value="">All Projects</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
            </select>
            {!isDev && (
              <select className="input" value={filterDev} onChange={e => setFilterDev(e.target.value)} style={{ maxWidth: '200px', marginBottom: 0 }}>
                <option value="">All Developers</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Timesheet list */}
      <div className="card">
        <div className="card-title">Timesheet Entries</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}><div className="spinner"></div></div>
        ) : timesheets.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <h3>No timesheets</h3>
            <p>Submit your daily hours above.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  {!isDev && <th>Developer</th>}
                  <th>Project</th>
                  <th>Online</th>
                  <th>Offline</th>
                  <th>Total</th>
                  <th>AI Score</th>
                  <th>Status</th>
                  {(isPM || isOwner) && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {timesheets.map(t => (
                  <tr key={t._id}>
                    <td>{new Date(t.date).toLocaleDateString()}</td>
                    {!isDev && <td>{t.developer?.name}</td>}
                    <td>{t.project?.title}</td>
                    <td>{t.onlineHours}h</td>
                    <td>{t.offlineHours}h</td>
                    <td><strong>{t.totalHours}h</strong></td>
                    <td>
                      <span style={{ color: t.aiScore >= 60 ? 'var(--green)' : 'var(--yellow)', fontSize: '12px' }}>
                        {t.aiScore}% {t.aiVerified ? '✅' : '⚠️'}
                      </span>
                      {t.aiFeedback && (
                        <div style={{ fontSize: '10px', color: 'var(--text2)', marginTop: '2px' }}>{t.aiFeedback}</div>
                      )}
                    </td>
                    <td>
                      <span className={`status-${t.status}`}>{t.status}</span>
                    </td>
                    {(isPM || isOwner) && t.status === 'pending' && (
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn btn-success btn-sm" onClick={() => approveTimesheet(t._id, 'approved')}>✓</button>
                          <button className="btn btn-danger btn-sm" onClick={() => approveTimesheet(t._id, 'rejected')}>✕</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}