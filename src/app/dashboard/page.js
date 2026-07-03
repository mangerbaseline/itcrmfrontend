'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../layout';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, token, API } = useApp();
  const router = useRouter();
  const role = user && user.role;
  const isOwner = role === 'owner';
  const [stats, setStats] = useState({});
  const [myStats, setMyStats] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [myProjectsCount, setMyProjectsCount] = useState(0);
  const [devStatusView, setDevStatusView] = useState(false);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedDev, setSelectedDev] = useState(null);
  const [allTimesheets, setAllTimesheets] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingDevs, setLoadingDevs] = useState(false);

  // Month/Year filter for my hours
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1); // 1-12
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  const months = [
    { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
    { v: 4, l: 'April' }, { v: 5, l: 'May' }, { v: 6, l: 'June' },
    { v: 7, l: 'July' }, { v: 8, l: 'August' }, { v: 9, l: 'September' },
    { v: 10, l: 'October' }, { v: 11, l: 'November' }, { v: 12, l: 'December' }
  ];
  const years = [];
  for (let y = now.getFullYear(); y >= 2023; y--) years.push(y);

  useEffect(function () {
    if (token) { fetchProjects(); fetchOwnerStats(); }
  }, [token]);

  useEffect(function () {
    if (token) fetchMyHours();
  }, [token, filterMonth, filterYear]);

  async function fetchProjects() {
    try {
      var pRes = await fetch(API + '/api/projects', { headers: { Authorization: 'Bearer ' + token } });
      var pData = await pRes.json();
      if (pData.success) {
        setRecentProjects(pData.projects.slice(0, 5));
        setMyProjectsCount(pData.projects.length);
        setPendingApprovals(pData.projects.filter(function (p) { return p.status === 'pending'; }).length);
      }
    } catch (e) { }
  }

  async function fetchMyHours() {
    try {
      var url = API + '/api/reports/my-hours?month=' + filterMonth + '&year=' + filterYear;
      var hRes = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      var hData = await hRes.json();
      if (hData.success) setMyStats(hData);
    } catch (e) { }
  }

  async function fetchOwnerStats() {
    if (!isOwner) return;
    try {
      var oRes = await fetch(API + '/api/reports/all', { headers: { Authorization: 'Bearer ' + token } });
      var oData = await oRes.json();
      if (oData.success) setStats(oData.stats);
      var uRes = await fetch(API + '/api/users?role=dev', { headers: { Authorization: 'Bearer ' + token } });
      var uData = await uRes.json();
      if (uData.success) setAllUsers(uData.users);
    } catch (e) { }
  }

  async function fetchTimesheets() {
    if (!startDate || !endDate) return;
    setLoadingDevs(true);
    setSelectedDev(null);
    setAnalysisResult(null);
    try {
      var res = await fetch(API + '/api/timesheets?startDate=' + startDate + '&endDate=' + endDate, {
        headers: { Authorization: 'Bearer ' + token }
      });
      var d = await res.json();
      if (d.success) setAllTimesheets(d.timesheets);
    } catch (e) { }
    setLoadingDevs(false);
  }

  function toggleDevStatus() {
    var newVal = !devStatusView;
    setDevStatusView(newVal);
    if (newVal) fetchTimesheets();
  }

  function getDevTimesheets(devId) {
    return allTimesheets.filter(function (t) {
      return t.developer && t.developer._id === devId;
    });
  }

  async function analyzeDevTimesheets(devId) {
    setAnalyzing(true);
    setSelectedDev(devId);
    try {
      var res = await fetch(API + '/api/reports/analyze-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ date: endDate, devFilter: devId, ignoreDates: true })
      });
      var d = await res.json();
      if (d.success) {
        setAnalysisResult(d);
      }
    } catch (e) { }
    setAnalyzing(false);
  }

  var roleGreeting = {
    owner: 'Full access to all projects and reports',
    hr: 'Manage team members and assignments',
    sales: 'Create and manage projects from leads',
    bdm: 'Review and approve assigned projects',
    pm: 'Manage developers and approve timesheets',
    dev: 'Track your hours and view assigned projects'
  };

  var totalHoursThisMonth = (myStats && myStats.summary && myStats.summary.total) || 0;
  var onlineHours = (myStats && myStats.summary && myStats.summary.online) || 0;
  var offlineHours = (myStats && myStats.summary && myStats.summary.offline) || 0;

  return (
    <div>
      <div className="navbar">
        <h2>Dashboard</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text2)' }}>
            {roleGreeting[role] || ''}
          </span>
          {isOwner ? (
            <button className={'btn btn-sm ' + (devStatusView ? 'btn-primary' : 'btn-secondary')}
              onClick={toggleDevStatus}>
              {devStatusView ? 'Close' : 'Developer Status'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Month/Year Filter Row */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 500 }}>Viewing hours for:</span>
        <select
          className="input"
          value={filterMonth}
          onChange={e => setFilterMonth(Number(e.target.value))}
          style={{ maxWidth: '140px', marginBottom: 0, padding: '6px 10px', fontSize: '13px' }}
        >
          {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <select
          className="input"
          value={filterYear}
          onChange={e => setFilterYear(Number(e.target.value))}
          style={{ maxWidth: '100px', marginBottom: 0, padding: '6px 10px', fontSize: '13px' }}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">My Projects</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{myProjectsCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{months.find(m => m.v === filterMonth)?.l} {filterYear} Hours</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{Math.round(totalHoursThisMonth)}h</div>
        </div>
        {role !== 'dev' ? (
          <div className="stat-card">
            <div className="stat-label">Pending Approvals</div>
            <div className="stat-value" style={{ color: pendingApprovals > 0 ? 'var(--yellow)' : 'var(--text2)' }}>{pendingApprovals}</div>
          </div>
        ) : (
          <div className="stat-card">
            <div className="stat-label">Online / Offline</div>
            <div className="stat-value" style={{ fontSize: '18px', color: 'var(--cyan)' }}>{Math.round(onlineHours)}h / {Math.round(offlineHours)}h</div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-label">Days Logged</div>
          <div className="stat-value" style={{ color: 'var(--orange)' }}>{(myStats && myStats.summary && myStats.summary.days) || 0}</div>
        </div>
      </div>

      {myStats && myStats.byProject && myStats.byProject.length > 0 ? (
        <div className="card">
          <div className="card-title">
            My Hours by Project — {months.find(m => m.v === filterMonth)?.l} {filterYear}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Online</th>
                  <th>Offline</th>
                  <th>Total</th>
                  <th>Days</th>
                </tr>
              </thead>
              <tbody>
                {myStats.byProject.map(function (p, i) {
                  return (
                    <tr key={i} onClick={function () { router.push('/dashboard/projects?id=' + p.project._id); }} style={{ cursor: 'pointer' }}>
                      <td><strong>{p.project ? p.project.title : 'Unknown'}</strong></td>
                      <td>{Math.round(p.online)}h</td>
                      <td>{Math.round(p.offline)}h</td>
                      <td><strong>{Math.round(p.hours)}h</strong></td>
                      <td>{p.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : myStats ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">📊</div>
            <h3>No hours logged</h3>
            <p>No hours were logged in {months.find(m => m.v === filterMonth)?.l} {filterYear}.</p>
          </div>
        </div>
      ) : null}

      {isOwner && devStatusView ? (
        <div className="card">
          <div className="card-title">Developer Status &amp; AI Analysis</div>
          <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px', lineHeight: '1.6' }}>
            Select a date range and click a developer name to view all their status entries. Click "Analyze" to get AI feedback comparing their work against project notes.
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>From</label>
              <input className="input" type="date" value={startDate} onChange={function (e) { setStartDate(e.target.value); }}
                style={{ maxWidth: '160px', marginBottom: 0 }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>To</label>
              <input className="input" type="date" value={endDate} onChange={function (e) { setEndDate(e.target.value); }}
                style={{ maxWidth: '160px', marginBottom: 0 }} />
            </div>
            <button className="btn btn-primary" onClick={fetchTimesheets} disabled={loadingDevs}>
              {loadingDevs ? 'Loading...' : 'Load Status'}
            </button>
          </div>

          {loadingDevs ? (
            <div style={{ textAlign: 'center', padding: '30px' }}><div className="spinner"></div></div>
          ) : allTimesheets.length === 0 && allUsers.length > 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text2)', fontSize: '13px' }}>
              No developer status found for selected date range.
            </div>
          ) : allUsers.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              {allUsers.map(function (u) {
                var ts = getDevTimesheets(u._id);
                var tsCount = ts.length;
                var totalH = ts.reduce(function (s, t) { return s + (t.totalHours || 0); }, 0);
                var isSelected = selectedDev === u._id;
                return (
                  <div key={u._id}
                    onClick={function () { setSelectedDev(isSelected ? null : u._id); }}
                    style={{
                      padding: '14px', borderRadius: '10px', cursor: 'pointer',
                      background: isSelected ? 'rgba(14, 165, 233, 0.15)' : 'var(--bg2)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                      transition: 'all 0.15s'
                    }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '4px' }}>
                      {tsCount > 0 ? tsCount + ' entries - ' + Math.round(totalH) + 'h' : 'No entries'}
                    </div>
                    {tsCount > 0 ? (
                      <button className="btn btn-primary btn-sm" style={{ marginTop: '8px', fontSize: '10px', padding: '3px 8px' }}
                        onClick={function (e) { e.stopPropagation(); analyzeDevTimesheets(u._id); }}>
                        {analyzing && selectedDev === u._id ? '...' : 'Analyze'}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {selectedDev && allTimesheets.length > 0 ? (
            <div>
              {allUsers.filter(function (u) { return u._id === selectedDev; }).map(function (dev) {
                var ts = getDevTimesheets(dev._id);
                return (
                  <div key={dev._id}>
                    <div className="table-wrap" style={{ marginBottom: '16px' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Project</th>
                            <th>Description</th>
                            <th>Online</th>
                            <th>Offline</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ts.map(function (t) {
                            return (
                              <tr key={t._id}>
                                <td>{new Date(t.date).toLocaleDateString()}</td>
                                <td><strong>{t.project ? t.project.title : 'Unknown'}</strong></td>
                                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</td>
                                <td>{t.onlineHours}h</td>
                                <td>{t.offlineHours}h</td>
                                <td><strong>{t.totalHours}h</strong></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {analysisResult && analysisResult.details ? (
                      analysisResult.details.length > 0 ? (
                        <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '16px' }}>
                          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>AI Analysis Report for {dev.name}</h5>
                          {analysisResult.details.map(function (item, i) {
                            var healthColor = item.health === 'Good' ? 'var(--green)' : item.health === 'Fair' ? 'var(--yellow)' : 'var(--red)';
                            var healthBg = item.health === 'Good' ? 'rgba(16,185,129,0.2)' : item.health === 'Fair' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)';
                            return (
                              <div key={i} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: i < analysisResult.details.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                  <span className="role-badge" style={{ fontSize: '12px', padding: '4px 10px', background: healthBg, color: healthColor }}>
                                    {item.health}
                                  </span>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: item.aiScore >= 60 ? 'var(--green)' : 'var(--yellow)' }}>
                                    Score: {item.aiScore}%
                                  </span>
                                  <span style={{ fontSize: '12px', color: 'var(--text2)' }}>
                                    {item.project ? 'Project: ' + item.project : ''} | {item.totalHours}h
                                  </span>
                                </div>
                                <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text)' }}>{item.aiFeedback}</div>
                                {item.hasConcerns ? (
                                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--red)' }}>
                                    Warning: Project notes mention concerns
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '16px', fontSize: '13px', color: 'var(--text2)', textAlign: 'center' }}>
                          No timesheet entries found for {dev.name} to analyze.
                        </div>
                      )
                    ) : analyzing && selectedDev === dev._id ? (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div className="spinner" style={{ width: '24px', height: '24px', margin: '0 auto 8px' }}></div>
                        <span style={{ color: 'var(--text2)', fontSize: '13px' }}>Analyzing...</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="card">
        <div className="card-title">My Recent Projects</div>
        {recentProjects.length === 0 ? (
          <div className="empty-state">
            <div className="icon">&#128194;</div>
            <h3>No projects</h3>
            <p>Projects will appear here once created.</p>
          </div>
        ) : (
          recentProjects.map(function (p) {
            return (
              <div key={p._id} className="project-item" onClick={function () { router.push('/dashboard/projects?id=' + p._id); }}>
                <div className="proj-info">
                  <h4>{p.title}</h4>
                  <p>Source: {p.source} - {p.allocatedHours || 0}h - SM: {p.salesManager ? p.salesManager.name : 'N/A'}</p>
                </div>
                <div className="proj-meta">
                  <div style={{ color: p.status === 'completed' ? 'var(--green)' : p.status === 'pending' ? 'var(--yellow)' : 'var(--cyan)' }}>
                    {p.status}
                  </div>
                  <div style={{ marginTop: '4px' }}>{new Date(p.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            );
          })
        )}
        {myProjectsCount > 5 ? (
          <button className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}
            onClick={function () { router.push('/dashboard/projects'); }}>
            View All {myProjectsCount} Projects &rarr;
          </button>
        ) : null}
      </div>
    </div>
  );
}