'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../../layout';

export default function LeavesPage() {
  const { user, token, API } = useApp();
  const role = user?.role;

  // Roles eligible to request leaves: dev, pm, bdm, sales (everyone but owner/hr usually, but we allow anyone to request)
  const canRequest = ['dev', 'pm', 'bdm', 'sales', 'hr'].includes(role);
  // Roles eligible to approve leaves: owner, hr, pm, bdm, sales
  const canApprove = ['owner', 'hr', 'pm', 'bdm', 'sales'].includes(role);
  // HR & Owner see the HR Leaves Log
  const isHRorOwner = ['owner', 'hr'].includes(role);

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Leave request form state
  const [leaveDate, setLeaveDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [actioningId, setActioningId] = useState(null);

  useEffect(() => {
    if (token) {
      fetchLeaves();
    }
  }, [token]);

  async function fetchLeaves() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/leaves`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (d.success) {
        setLeaves(d.leaves);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleRequestLeave(e) {
    e.preventDefault();
    if (!leaveDate) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch(`${API}/api/leaves`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ date: leaveDate, reason })
      });
      const d = await res.json();
      if (d.success) {
        setLeaveDate('');
        setReason('');
        setMessage('Leave request submitted successfully!');
        fetchLeaves();
      } else {
        setMessage(d.message || 'Failed to submit leave request');
      }
    } catch (err) {
      setMessage('Network error. Failed to submit.');
    }
    setSubmitting(false);
  }

  async function handleApproveLeave(leaveId, status) {
    setActioningId(leaveId);
    try {
      const res = await fetch(`${API}/api/leaves/${leaveId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const d = await res.json();
      if (d.success) {
        setLeaves(prev => prev.map(item => item._id === leaveId ? d.leave : item));
        fetchLeaves(); // Re-fetch to ensure applicant populated detail is loaded
      }
    } catch (e) {
      console.error(e);
    }
    setActioningId(null);
  }

  if (loading && leaves.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Filter leaves for different sections
  const myLeaves = leaves.filter(item => item.applicant?._id === user?.id);
  const pendingApprovals = leaves.filter(item => item.status === 'pending' && item.applicant?._id !== user?.id);
  const resolvedLeaves = leaves.filter(item => item.status !== 'pending');

  return (
    <div>
      <div className="navbar">
        <h2>🌴 Leave Management</h2>
      </div>

      <div className="grid-2">
        {/* REQUEST LEAVE SECTION */}
        {canRequest && (
          <div className="card">
            <div className="card-title">Request a Leave</div>
            {message && (
              <div className="note-item" style={{ borderLeftColor: message.includes('success') ? 'var(--green)' : 'var(--red)', background: 'var(--bg2)', padding: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: message.includes('success') ? 'var(--green)' : 'var(--red)' }}>{message}</span>
              </div>
            )}
            <form onSubmit={handleRequestLeave}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px' }}>Leave Date</label>
                <input
                  type="date"
                  className="input"
                  value={leaveDate}
                  onChange={e => setLeaveDate(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px' }}>Reason / Notes</label>
                <textarea
                  className="input"
                  style={{ minHeight: '90px', resize: 'vertical' }}
                  placeholder="Enter reason for your leave request..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        )}

        {/* PERSONAL LEAVE HISTORY */}
        {canRequest && (
          <div className="card">
            <div className="card-title">My Leave History</div>
            {myLeaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text2)', fontSize: '13px' }}>
                You have not requested any leaves yet.
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Approver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaves.map(item => {
                      const statusColor = item.status === 'approved' ? 'var(--green)' : item.status === 'rejected' ? 'var(--red)' : 'var(--yellow)';
                      const statusBg = item.status === 'approved' ? 'rgba(16, 185, 129, 0.15)' : item.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)';
                      return (
                        <tr key={item._id}>
                          <td><strong>{new Date(item.date).toLocaleDateString()}</strong></td>
                          <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.reason}>{item.reason}</td>
                          <td>
                            <span className="role-badge" style={{ background: statusBg, color: statusColor }}>
                              {item.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text2)' }}>
                            {item.status === 'pending' ? '-' : `${item.approvedByName} (${item.approvedByRole?.toUpperCase()})`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* APPROVAL SECTION */}
      {canApprove && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-title">Pending Leave Requests</div>
          {pendingApprovals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text2)', fontSize: '13px' }}>
              No pending leave requests to review.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Role</th>
                    <th>Leave Date</th>
                    <th>Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.map(item => (
                    <tr key={item._id}>
                      <td><strong>{item.applicant?.name}</strong></td>
                      <td>
                        <span className="role-badge" style={{ background: 'var(--bg3)', color: 'var(--text)' }}>
                          {item.applicant?.role.toUpperCase()}
                        </span>
                      </td>
                      <td><strong>{new Date(item.date).toLocaleDateString()}</strong></td>
                      <td>{item.reason}</td>
                      <td>
                        <div className="btn-group" style={{ margin: 0 }}>
                          <button
                            className="btn btn-success btn-sm"
                            disabled={actioningId === item._id}
                            onClick={() => handleApproveLeave(item._id, 'approved')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={actioningId === item._id}
                            onClick={() => handleApproveLeave(item._id, 'rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* HR / OWNER LEAVES LOG */}
      {isHRorOwner && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-title">HR Leaves Log & Audit</div>
          <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '14px' }}>
            Auditable list of all leaves and the managers who approved/rejected them.
          </p>
          {resolvedLeaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text2)', fontSize: '13px' }}>
              No resolved leave requests in logs yet.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Role</th>
                    <th>Leave Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actioned By</th>
                    <th>Actioned Role</th>
                    <th>Actioned At</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedLeaves.map(item => {
                    const statusColor = item.status === 'approved' ? 'var(--green)' : 'var(--red)';
                    const statusBg = item.status === 'approved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                    return (
                      <tr key={item._id}>
                        <td><strong>{item.applicant?.name}</strong></td>
                        <td>{item.applicant?.role.toUpperCase()}</td>
                        <td><strong>{new Date(item.date).toLocaleDateString()}</strong></td>
                        <td>{item.reason}</td>
                        <td>
                          <span className="role-badge" style={{ background: statusBg, color: statusColor }}>
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td><strong>{item.approvedByName || 'N/A'}</strong></td>
                        <td>
                          <span className="role-badge" style={{ background: 'var(--bg3)', color: 'var(--text)' }}>
                            {(item.approvedByRole || 'N/A').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text2)', fontSize: '12px' }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
