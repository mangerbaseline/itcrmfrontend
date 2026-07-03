'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../../layout';

const NOTICE_TYPES = [
  { value: 'notification', label: 'Notification (Blue)', color: '#0ea5e9' },
  { value: 'warning', label: 'Warning (Red)', color: '#ef4444' },
  { value: 'greeting', label: 'Greeting (Green)', color: '#10b981' },
  { value: 'announcement', label: 'Announcement (Yellow)', color: '#f59e0b' },
  { value: 'urgent', label: 'Urgent (Orange)', color: '#f97316' },
  { value: 'info', label: 'Info (Purple)', color: '#8b5cf6' },
];

export default function NoticesPage() {
  const { user, token, API } = useApp();
  const [notices, setNotices] = useState([]);
  const [sentNotices, setSentNotices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('notification');
  const [targetType, setTargetType] = useState('all');
  const [targetUser, setTargetUser] = useState('');
  
  // Tab control for HR/Owner: 'received' or 'manage'
  const [activeTab, setActiveTab] = useState('received');

  const isHrOrOwner = user && (user.role === 'hr' || user.role === 'owner');

  useEffect(() => {
    if (token) {
      fetchReceivedNotices();
      if (isHrOrOwner) {
        fetchSentNotices();
        fetchUsers();
      }
    }
  }, [token, user]);

  async function fetchReceivedNotices() {
    try {
      const res = await fetch(API + '/api/notices', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      if (data.success) {
        setNotices(data.notices);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchSentNotices() {
    try {
      const res = await fetch(API + '/api/notices/all', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      if (data.success) {
        setSentNotices(data.notices);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch(API + '/api/users', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      if (data.success) {
        // Filter out current user from target selection
        setUsers(data.users.filter(u => u._id !== user.id));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const selectedTypeObj = NOTICE_TYPES.find(t => t.value === type);
    const color = selectedTypeObj ? selectedTypeObj.color : '#0ea5e9';

    try {
      const res = await fetch(API + '/api/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          title,
          message,
          type,
          color,
          targetType,
          targetUser: targetType === 'individual' ? targetUser : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Notice sent successfully!');
        setTitle('');
        setMessage('');
        setType('notification');
        setTargetType('all');
        setTargetUser('');
        fetchSentNotices();
        fetchReceivedNotices(); // Update if it also targets current user
      } else {
        setError(data.message || 'Failed to send notice');
      }
    } catch (err) {
      setError('Connection error');
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(API + `/api/notices/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Notice deleted successfully.');
        fetchSentNotices();
        fetchReceivedNotices();
      } else {
        setError(data.message || 'Failed to delete notice');
      }
    } catch (err) {
      setError('Connection error');
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="navbar">
        <h2>🔔 Notice Center</h2>
        <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
          Keep up with updates and announcements
        </div>
      </div>

      {isHrOrOwner && (
        <div className="tabs">
          <button className={`tab ${activeTab === 'received' ? 'active' : ''}`} onClick={() => setActiveTab('received')}>
            📥 Personal Notices Tab
          </button>
          <button className={`tab ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => setActiveTab('manage')}>
            ⚙️ Send & Manage Notices
          </button>
        </div>
      )}

      {error && <div className="error-msg" style={{ marginBottom: '16px' }}>{error}</div>}
      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--green)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '13px',
          marginBottom: '16px'
        }}>
          {successMsg}
        </div>
      )}

      {/* Tab 1: Received Notices */}
      {(!isHrOrOwner || activeTab === 'received') && (
        <div className="card">
          <div className="card-title">My Notices</div>
          {notices.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📭</div>
              <h3>No notices yet</h3>
              <p>You are all caught up! When notices are sent to everyone or you specifically, they will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notices.map(notice => {
                const badgeStyle = {
                  background: notice.color + '22',
                  color: notice.color,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  display: 'inline-block',
                  marginRight: '8px'
                };
                return (
                  <div key={notice._id} style={{
                    padding: '16px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--bg2)',
                    borderLeft: `4px solid ${notice.color}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '600' }}>{notice.title}</h4>
                      <span style={badgeStyle}>{notice.type}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                      {notice.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px', color: 'var(--text2)' }}>
                      <span>Sent by: <strong>{notice.sentByName} ({notice.sentByRole.toUpperCase()})</strong></span>
                      <span>{new Date(notice.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Send & Manage Notices (HR/Owner Only) */}
      {isHrOrOwner && activeTab === 'manage' && (
        <div className="grid-2">
          {/* Send Form */}
          <div className="card">
            <div className="card-title">Create New Notice</div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>
                  Notice Title
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Server Maintenance or Holiday Greeting"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>
                  Notice Type (Determines Banner Color)
                </label>
                <select
                  className="input"
                  value={type}
                  onChange={e => setType(e.target.value)}
                >
                  {NOTICE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>
                  Target Audience
                </label>
                <select
                  className="input"
                  value={targetType}
                  onChange={e => setTargetType(e.target.value)}
                >
                  <option value="all">Send to Everyone</option>
                  <option value="individual">Send to One Person</option>
                </select>
              </div>

              {targetType === 'individual' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>
                    Select User
                  </label>
                  <select
                    className="input"
                    value={targetUser}
                    onChange={e => setTargetUser(e.target.value)}
                    required={targetType === 'individual'}
                  >
                    <option value="">-- Choose User --</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.role.toUpperCase()} - {u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>
                  Notice Message
                </label>
                <textarea
                  className="input"
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  placeholder="Write the details here..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Sending Notice...' : '📢 Broadcast Notice'}
              </button>
            </form>
          </div>

          {/* Manage Sent Notices */}
          <div className="card">
            <div className="card-title">Sent Notices History</div>
            {sentNotices.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 10px' }}>
                <div className="icon">📋</div>
                <h3>No sent notices</h3>
                <p>Notices you broadcast will show here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
                {sentNotices.map(notice => (
                  <div key={notice._id} style={{
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--bg2)',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px' }}>{notice.title}</strong>
                      <button
                        onClick={() => handleDelete(notice._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--red)',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '11px'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                    <div style={{ color: 'var(--text2)', marginBottom: '8px', fontSize: '11px' }}>
                      Target: {notice.targetType === 'all' ? 'Everyone' : `One Person (${notice.targetUser?.name || 'Unknown'})`}
                    </div>
                    <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                      {notice.message.length > 100 ? notice.message.substring(0, 100) + '...' : notice.message}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text2)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>By: {notice.sentByName} ({notice.sentByRole.toUpperCase()})</span>
                      <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
