'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../../layout';

export default function ReportsPage() {
  const { user, token, API } = useApp();
  const role = user?.role;
  const isOwnerOrHR = role === 'owner' || role === 'hr';
  const [view, setView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [myHours, setMyHours] = useState(null);
  const [projectHours, setProjectHours] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');

  // Month/Year filter state
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [myFilterMonth, setMyFilterMonth] = useState(now.getMonth() + 1);
  const [myFilterYear, setMyFilterYear] = useState(now.getFullYear());

  const months = [
    { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
    { v: 4, l: 'April' }, { v: 5, l: 'May' }, { v: 6, l: 'June' },
    { v: 7, l: 'July' }, { v: 8, l: 'August' }, { v: 9, l: 'September' },
    { v: 10, l: 'October' }, { v: 11, l: 'November' }, { v: 12, l: 'December' }
  ];
  const years = [];
  for (let y = now.getFullYear(); y >= 2023; y--) years.push(y);

  // AI Analysis state
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().split('T')[0]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (token) {
      if (isOwnerOrHR) fetchOverview();
      fetchMyHours();
      fetchProjectHours();
    }
  }, [token]);

  useEffect(() => {
    if (token && isOwnerOrHR) fetchOverview();
  }, [filterMonth, filterYear]);

  useEffect(() => {
    if (token) fetchMyHours();
  }, [myFilterMonth, myFilterYear]);

  async function fetchOverview() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMonth !== 'all') params.set('month', filterMonth);
      params.set('year', filterYear);
      const res = await fetch(`${API}/api/reports/all?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (d.success) setData(d);
    } catch(e) {}
    setLoading(false);
  }

  async function fetchMyHours() {
    try {
      const params = new URLSearchParams({ month: myFilterMonth, year: myFilterYear });
      const res = await fetch(`${API}/api/reports/my-hours?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (d.success) setMyHours(d);
    } catch(e) {}
  }

  async function fetchProjectHours() {
    try {
      let url = `${API}/api/reports/project-hours`;
      if (selectedProject) url += `?projectId=${selectedProject}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (d.success) setProjectHours(d.report);
    } catch(e) {}
  }

  useEffect(() => { if (token) fetchProjectHours(); }, [selectedProject]);

  // AI Analysis function
  async function runAnalysis() {
    if (!analysisDate || analyzing) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await fetch(`${API}/api/reports/analyze-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: analysisDate })
      });
      const d = await res.json();
      if (d.success) setAnalysisResult(d);
    } catch(e) {
      console.error('Analysis error:', e);
    }
    setAnalyzing(false);
  }

  if (loading && isOwnerOrHR) return <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner"></div></div>;

  return (
    <div>
      <div className="navbar">
        <h2> Reports</h2>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${view === 'overview' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('overview')}>Overview</button>
          <button className={`btn btn-sm ${view === 'hours' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('hours')}>Hours</button>
          {role === 'owner' && (
            <button className={`btn btn-sm ${view === 'analysis' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('analysis')}>AI Analysis</button>
          )}
          {(role === 'dev' || role === 'pm' || role === 'sm' || role === 'bdm' || role === 'hr') && (
            <button className={`btn btn-sm ${view === 'my' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('my')}>My Hours</button>
          )}
        </div>
      </div>

      {/* Overview section — owner + HR */}
      {view === 'overview' && isOwnerOrHR && (
        <>
          {/* Month/Year filter */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', padding: '12px 16px', background: 'var(--bg2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 500 }}>Filter period:</span>
            <select
              className="input"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              style={{ maxWidth: '140px', marginBottom: 0, padding: '6px 10px', fontSize: '13px' }}
            >
              <option value="all">All Months</option>
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
            {loading && <div className="spinner" style={{ width: '16px', height: '16px' }}></div>}
          </div>

          {data && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total Projects</div>
                  <div className="stat-value" style={{ color: 'var(--primary)' }}>{data.stats.totalProjects}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Active</div>
                  <div className="stat-value" style={{ color: 'var(--green)' }}>{data.stats.activeProjects}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Developers</div>
                  <div className="stat-value" style={{ color: 'var(--cyan)' }}>{data.stats.totalDevs}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Hours</div>
                  <div className="stat-value" style={{ color: 'var(--orange)' }}>{Math.round(data.stats.totalHours)}</div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">All Projects</div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Sales</th>
                        <th>BDM</th>
                        <th>PM</th>
                        <th>Hours</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.projects.map(p => (
                        <tr key={p._id}>
                          <td><strong>{p.title}</strong></td>
                          <td>{p.salesManager?.name}</td>
                          <td>{p.bdm?.name || '-'}</td>
                          <td>{p.pm?.name || '-'}</td>
                          <td>{p.allocatedHours || 0}h</td>
                          <td><span className="role-badge" style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--primary)' }}>{p.status}</span></td>
                          <td style={{ color: 'var(--text2)', fontSize: '12px' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {data.recentTimesheets?.length > 0 && (
                <div className="card">
                  <div className="card-title">
                    {filterMonth !== 'all' ? `${months.find(m => m.v === Number(filterMonth))?.l} ${filterYear}` : filterYear} — Timesheets
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Developer</th>
                          <th>Project</th>
                          <th>Hours</th>
                          <th>AI Score</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentTimesheets.slice(0, 20).map(t => (
                          <tr key={t._id}>
                            <td>{new Date(t.date).toLocaleDateString()}</td>
                            <td>{t.developer?.name}</td>
                            <td>{t.project?.title}</td>
                            <td>{t.totalHours}h</td>
                            <td>
                              <span style={{ color: t.aiScore >= 60 ? 'var(--green)' : 'var(--yellow)' }}>
                                {t.aiScore}%
                              </span>
                            </td>
                            <td><span className={`status-${t.status}`}>{t.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* AI Analysis — owner only */}
      {view === 'analysis' && role === 'owner' && (
        <div>
          <div className="card">
            <div className="card-title">AI Developer Status Analysis</div>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px', lineHeight: '1.6' }}>
              AI compares developer daily status against project notes from SM, BDM, and PM.
              Click analyze to see which developers are aligned with project requirements and which need attention.
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Select Date</label>
                <input className="input" type="date" value={analysisDate} onChange={e => setAnalysisDate(e.target.value)}
                  style={{ maxWidth: '200px', marginBottom: 0 }} />
              </div>
              <button className="btn btn-primary" onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? <><span className="spinner" style={{ width: '14px', height: '14px' }}></span> Analyzing...</> : 'Run AI Analysis'}
              </button>
            </div>
          </div>

          {analysisResult && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Developers Tracked</div>
                  <div className="stat-value" style={{ color: 'var(--primary)' }}>{analysisResult.summary.totalDevs}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Good</div>
                  <div className="stat-value" style={{ color: 'var(--green)' }}>{analysisResult.summary.healthyCount}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Fair</div>
                  <div className="stat-value" style={{ color: 'var(--yellow)' }}>{analysisResult.summary.fairCount}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Needs Attention</div>
                  <div className="stat-value" style={{ color: 'var(--red)' }}>{analysisResult.summary.needsAttention}</div>
                </div>
              </div>

              {analysisResult.details.length === 0 ? (
                <div className="card">
                  <div className="empty-state">
                    <div className="icon">&#128200;</div>
                    <h3>No timesheets for this date</h3>
                    <p>No developers submitted hours on {analysisResult.date}.</p>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="card-title">
                    Detailed Report - {analysisResult.date}
                    <span style={{ fontSize: '11px', color: 'var(--text2)', marginLeft: '12px' }}>
                      Generated: {new Date(analysisResult.summary.reportGenerated).toLocaleString()}
                    </span>
                  </div>

                  {analysisResult.details.map((item, i) => (
                    <div key={i} className="card" style={{ marginBottom: '12px', padding: '16px', border: item.health === 'Needs Attention' ? '1px solid rgba(239,68,68,0.3)' : item.health === 'Fair' ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(34,197,94,0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{item.developer}</h4>
                          <p style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
                            Project: {item.project} | {item.totalHours}h ({item.onlineHours}h online / {item.offlineHours}h offline)
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="role-badge" style={{
                            fontSize: '12px', padding: '4px 12px',
                            background: item.health === 'Good' ? 'rgba(34,197,94,0.2)' : item.health === 'Fair' ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)',
                            color: item.health === 'Good' ? 'var(--green)' : item.health === 'Fair' ? 'var(--yellow)' : 'var(--red)'
                          }}>
                            {item.health}
                          </span>
                          <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: 600, color: item.aiScore >= 60 ? 'var(--green)' : 'var(--yellow)' }}>
                            AI Score: {item.aiScore}%
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '10px', fontSize: '13px', lineHeight: '1.6' }}>
                        <div style={{ color: item.hasConcerns ? 'var(--orange)' : 'var(--text)' }}>
                          <strong>AI Feedback:</strong> {item.aiFeedback}
                        </div>
                      </div>

                      <div style={{ marginTop: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text2)' }}>
                        <div>
                          <strong>Developer's Status:</strong> "{item.description || 'No description'}"
                        </div>
                      </div>

                      {item.notesContext && (
                        <details style={{ marginTop: '8px' }}>
                          <summary style={{ fontSize: '12px', color: 'var(--primary)', cursor: 'pointer' }}>
                            View project notes from SM/BDM/PM
                          </summary>
                          <pre style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text2)', whiteSpace: 'pre-wrap', background: 'var(--bg3)', padding: '10px', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                            {item.notesContext}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {analyzing && !analysisResult && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" style={{ width: '32px', height: '32px' }}></div>
              <p style={{ marginTop: '12px', color: 'var(--text2)', fontSize: '13px' }}>Analyzing developer status against project notes...</p>
            </div>
          )}
        </div>
      )}

      {/* Hours by project */}
      {view === 'hours' && (
        <div className="card">
          <div className="card-title">Hours by Project &amp; Developer</div>
          <div style={{ marginBottom: '16px' }}>
            <select className="input" value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{ maxWidth: '300px' }}>
              <option value="">All Projects</option>
              {[...new Set(projectHours.map(r => r.project?._id))].map(id => {
                const p = projectHours.find(r => r.project?._id === id)?.project;
                return p ? <option key={id} value={id}>{p.title}</option> : null;
              })}
            </select>
          </div>
          {projectHours.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📊</div>
              <h3>No data yet</h3>
              <p>Timesheets appear here once developers submit hours.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Developer</th>
                    <th>Online</th>
                    <th>Offline</th>
                    <th>Total</th>
                    <th>Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {projectHours.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.project?.title}</strong></td>
                      <td>{r.developer?.name}</td>
                      <td>{Math.round(r.totalOnline)}h</td>
                      <td>{Math.round(r.totalOffline)}h</td>
                      <td><strong>{Math.round(r.totalHours)}h</strong></td>
                      <td>{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* My Hours — all non-owner roles */}
      {view === 'my' && (
        <>
          {/* My Hours month/year filter */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', padding: '12px 16px', background: 'var(--bg2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 500 }}>Viewing hours for:</span>
            <select
              className="input"
              value={myFilterMonth}
              onChange={e => setMyFilterMonth(Number(e.target.value))}
              style={{ maxWidth: '140px', marginBottom: 0, padding: '6px 10px', fontSize: '13px' }}
            >
              {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select
              className="input"
              value={myFilterYear}
              onChange={e => setMyFilterYear(Number(e.target.value))}
              style={{ maxWidth: '100px', marginBottom: 0, padding: '6px 10px', fontSize: '13px' }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {myHours ? (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">{months.find(m => m.v === myFilterMonth)?.l} {myFilterYear}</div>
                  <div className="stat-value" style={{ color: 'var(--primary)' }}>{Math.round(myHours.summary.total)}h</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Online</div>
                  <div className="stat-value" style={{ color: 'var(--green)' }}>{Math.round(myHours.summary.online)}h</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Offline</div>
                  <div className="stat-value" style={{ color: 'var(--yellow)' }}>{Math.round(myHours.summary.offline)}h</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Days Logged</div>
                  <div className="stat-value" style={{ color: 'var(--cyan)' }}>{myHours.summary.days}</div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Hours by Project</div>
                {myHours.byProject?.length > 0 ? (
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
                        {myHours.byProject.map((p, i) => (
                          <tr key={i}>
                            <td><strong>{p.project?.title}</strong></td>
                            <td>{Math.round(p.online)}h</td>
                            <td>{Math.round(p.offline)}h</td>
                            <td><strong>{Math.round(p.hours)}h</strong></td>
                            <td>{p.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text2)' }}>No hours logged for this period</div>
                )}
              </div>

              <div className="card">
                <div className="card-title">Daily Log</div>
                {myHours.timesheets?.length > 0 ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Project</th>
                          <th>Online</th>
                          <th>Offline</th>
                          <th>Total</th>
                          <th>AI Score</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myHours.timesheets.map(t => (
                          <tr key={t._id}>
                            <td>{new Date(t.date).toLocaleDateString()}</td>
                            <td>{t.project?.title}</td>
                            <td>{t.onlineHours}h</td>
                            <td>{t.offlineHours}h</td>
                            <td><strong>{t.totalHours}h</strong></td>
                            <td>
                              <span style={{ color: t.aiScore >= 60 ? 'var(--green)' : 'var(--yellow)' }}>
                                {t.aiScore}% {t.aiVerified ? '✅' : '⚠️'}
                              </span>
                            </td>
                            <td><span className={`status-${t.status}`}>{t.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text2)' }}>No timesheets for this period</div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner"></div></div>
          )}
        </>
      )}

      {/* Overview for non owner/HR */}
      {view === 'overview' && !isOwnerOrHR && (
        <div className="card">
          <div className="card-title">Overview</div>
          <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.7' }}>
            Full company overview is available to the Company Owner and HR only.<br />
            You can view your personal hours in the "My Hours" tab.
          </p>
        </div>
      )}
    </div>
  );
}