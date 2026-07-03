'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../../layout';

const ROLE_COLORS = {
  owner: '#f97316', hr: '#06b6d4', sales: '#22c55e', bdm: '#a855f7', pm: '#eab308', dev: '#0ea5e9'
};

export default function UsersPage() {
  const { user, token, API } = useApp();
  const role = user?.role;
  const canManage = role === 'owner' || role === 'hr';
  const canAssignPM = role === 'owner' || role === 'hr';

  const [users, setUsers] = useState([]);
  const [pms, setPms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'dev' });
  const [assignForm, setAssignForm] = useState({ developerId: '', pmId: '' });

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    if (token) { fetchUsers(); fetchPMs(); }
  }, [token]);

  async function fetchUsers() {
    try {
      const res = await fetch(`${API}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch(e) {}
    setLoading(false);
  }

  async function fetchPMs() {
    try {
      const res = await fetch(`${API}/api/users?role=pm`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setPms(data.users);
    } catch(e) {}
  }

  async function createUser(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return showToast('All fields required', 'error');
    try {
      const res = await fetch(`${API}/api/users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User ${form.name} created!`);
        setShowForm(false);
        setForm({ name: '', email: '', password: '', role: 'dev' });
        fetchUsers();
      } else showToast(data.message, 'error');
    } catch(e) { showToast('Error creating user', 'error'); }
  }

  async function assignDeveloperToPM() {
    if (!assignForm.developerId || !assignForm.pmId) return showToast('Select both developer and PM', 'error');
    try {
      const res = await fetch(`${API}/api/users/assign-pm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(assignForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Developer assigned to PM');
        setAssignForm({ developerId: '', pmId: '' });
        fetchUsers();
      } else showToast(data.message, 'error');
    } catch(e) {}
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner"></div></div>;

  const devs = users.filter(u => u.role === 'dev');
  const grouped = { owner: [], hr: [], sales: [], bdm: [], pm: [], dev: [] };
  users.forEach(u => { if (grouped[u.role]) grouped[u.role].push(u); });

  return (
    <div>
      <div className="navbar">
        <h2>👥 Team</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{users.length} members</span>
          {canManage && !showForm && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Add Member</button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-title">Add Team Member</div>
          <form onSubmit={createUser}>
            <div className="grid-2">
              <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Full name" required />
              <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email" required />
              <input className="input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Password (min 6 chars)" minLength={6} required />
              <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="dev">Developer</option>
                <option value="pm">Project Manager</option>
                <option value="bdm">BDM</option>
                <option value="sales">Sales Manager</option>
                <option value="hr">HR</option>
                {role === 'owner' && <option value="owner">Company Owner</option>}
              </select>
            </div>
            <div className="btn-group">
              <button type="submit" className="btn btn-primary">Create User</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Developer to PM */}
      {canAssignPM && devs.length > 0 && pms.length > 0 && (
        <div className="card">
          <div className="card-title">Assign Developer to PM</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="input" value={assignForm.developerId} onChange={e => setAssignForm({...assignForm, developerId: e.target.value})}
              style={{ maxWidth: '250px', marginBottom: 0 }}>
              <option value="">Select Developer</option>
              {devs.map(d => <option key={d._id} value={d._id}>{d.name} {d.assignedPM ? '(assigned)' : ''}</option>)}
            </select>
            <select className="input" value={assignForm.pmId} onChange={e => setAssignForm({...assignForm, pmId: e.target.value})}
              style={{ maxWidth: '250px', marginBottom: 0 }}>
              <option value="">Select PM</option>
              {pms.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={assignDeveloperToPM}>Assign</button>
          </div>
        </div>
      )}

      {/* Team by role */}
      {Object.entries(grouped).map(([roleName, members]) => {
        if (members.length === 0) return null;
        return (
          <div key={roleName} className="card">
            <div className="card-title">
              <span className="role-badge" style={{ background: ROLE_COLORS[roleName] + '22', color: ROLE_COLORS[roleName], fontSize: '12px' }}>
                {roleName.toUpperCase()} ({members.length})
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Assigned PM</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(u => (
                    <tr key={u._id}>
                      <td><strong>{u.name}</strong></td>
                      <td style={{ color: 'var(--text2)' }}>{u.email}</td>
                      <td>
                        <span className="role-badge" style={{ background: ROLE_COLORS[u.role] + '22', color: ROLE_COLORS[u.role] }}>
                          {u.role}
                        </span>
                      </td>
                      <td>{u.assignedPM ? pms.find(p => p._id === u.assignedPM)?.name || 'Unknown' : '-'}</td>
                      <td>
                        <span style={{ color: u.isActive ? 'var(--green)' : 'var(--red)', fontSize: '12px' }}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}