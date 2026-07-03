'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../../layout';
import { useRouter, useSearchParams } from 'next/navigation';

const STATUS_COLORS = {
  pending: 'var(--yellow)',
  'bdm-approved': 'var(--cyan)',
  'pm-approved': 'var(--orange)',
  'sales-approved': 'var(--green)',
  completed: 'var(--text2)',
  cancelled: 'var(--red)'
};

export default function ProjectsPage() {
  const { user, token, API } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  const role = user?.role;
  const isDev = role === 'dev';
  const canCreate = role === 'owner' || role === 'sales';
  const canApproveBDM = role === 'owner' || role === 'bdm';
  const canApprovePM = role === 'owner' || role === 'pm';
  const canApproveSales = role === 'owner' || role === 'sales';
  const canAddHours = role === 'owner' || role === 'sales';
  const canSeeDevStatus = !isDev;

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', source: 'upwork', sourceDetail: '', budget: '', deadline: '', bdm: '', pm: '', developers: [], allocatedHours: '' });
  const [users, setUsers] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [extraHours, setExtraHours] = useState('');
  const [tsOnline, setTsOnline] = useState('');
  const [tsOffline, setTsOffline] = useState('');
  const [tsDesc, setTsDesc] = useState('');
  const [todaySubmitted, setTodaySubmitted] = useState(false);

  // Dev status & analysis
  const [showDevStatus, setShowDevStatus] = useState(false);
  const [projectTs, setProjectTs] = useState([]);
  const [loadingTs, setLoadingTs] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(null); // tsId being analyzed

  const HOURS = [0,0.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10,10.5,11,11.5,12];

  function toastMsg(msg, type) {
    setToast({ msg, type: type || 'success' });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    if (token) { fetchProjects(); fetchUsers(); }
  }, [token]);

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const p = projects.find(x => x._id === projectId);
      if (p) loadDetail(p._id);
    }
  }, [projectId, projects]);

  async function fetchUsers() {
    try {
      const r = await fetch(API + '/api/users', { headers: { Authorization: 'Bearer ' + token } });
      const d = await r.json();
      if (d.success) setUsers(d.users);
    } catch (e) {}
  }

  async function fetchProjects() {
    try {
      const r = await fetch(API + '/api/projects', { headers: { Authorization: 'Bearer ' + token } });
      const d = await r.json();
      if (d.success) setProjects(d.projects);
    } catch (e) {}
    setLoading(false);
  }

  async function loadDetail(id) {
    try {
      const r = await fetch(API + '/api/projects/' + id, { headers: { Authorization: 'Bearer ' + token } });
      const d = await r.json();
      if (d.success) {
        setSelectedProject(d.project);
        setShowDevStatus(false);
        setProjectTs([]);
        setAnalysisResult(null);
        setAnalyzing(null);
        if (isDev) checkTodaySubmission(id);
      }
    } catch (e) {}
  }

  async function checkTodaySubmission(pid) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const r = await fetch(API + '/api/timesheets?projectId=' + pid + '&startDate=' + today + '&endDate=' + today, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const d = await r.json();
      setTodaySubmitted(d.success && d.timesheets.length > 0);
    } catch (e) {}
  }

  // Fetch timesheets for the selected project
  async function fetchProjectTimesheets() {
    if (!selectedProject) return;
    setLoadingTs(true);
    setShowDevStatus(true);
    try {
      const r = await fetch(API + '/api/timesheets?projectId=' + selectedProject._id, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const d = await r.json();
      if (d.success) {
        setProjectTs(d.timesheets);
        
        // Populate existing analysis results from database
        const existingResults = {};
        d.timesheets.forEach(t => {
          if (t.analysisStatus === 'analyzed' && t.analysisResult) {
            existingResults[t._id] = {
              health: t.analysisResult.health,
              aiScore: t.analysisResult.aiScore,
              aiFeedback: t.analysisResult.aiFeedback,
              notesContext: t.analysisResult.notesContext,
              hasConcerns: t.analysisResult.hasConcerns,
              developer: t.developer?.name || 'Unknown',
              developerId: t.developer?._id,
              project: t.project?.title || selectedProject.title,
              date: t.date,
              onlineHours: t.onlineHours,
              offlineHours: t.offlineHours,
              totalHours: t.totalHours,
              description: t.description,
              status: t.status
            };
          }
        });
        setAnalysisResult(existingResults);
      }
    } catch (e) {}
    setLoadingTs(false);
  }

  // Analyze a specific timesheet entry
  async function analyzeTimesheet(tsId, devName) {
    setAnalyzing(tsId);
    try {
      const r = await fetch(API + '/api/reports/analyze-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          timesheetId: tsId,
          projectFilter: selectedProject._id,
          devFilter: projectTs.find(t => t._id === tsId)?.developer?._id
        })
      });
      const d = await r.json();
      if (d.success) {
        setAnalysisResult(prev => ({ ...prev, [tsId]: d.details?.[0] || null }));
      }
    } catch (e) {}
    setAnalyzing(null);
  }

  async function createProject(e) {
    e.preventDefault();
    if (!form.title) return toastMsg('Title required', 'error');
    try {
      var body = {
        title: form.title,
        description: form.description,
        source: form.source,
        sourceDetail: form.sourceDetail,
        budget: form.budget,
        deadline: form.deadline,
        bdm: form.bdm || null,
        pm: form.pm || null,
        developers: form.developers || [],
        allocatedHours: Number(form.allocatedHours) || 0
      };
      const r = await fetch(API + '/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (d.success) {
        toastMsg('Project created!');
        setShowForm(false);
        setForm({ title: '', description: '', source: 'upwork', sourceDetail: '', budget: '', deadline: '', bdm: '', pm: '', developers: [], allocatedHours: '' });
        fetchProjects();
      } else toastMsg(d.message, 'error');
    } catch (e) { toastMsg('Error', 'error'); }
  }

  async function approveProject(type) {
    if (!selectedProject) return;
    const eps = { bdm: '/bdm-approve', pm: '/pm-approve', sales: '/sales-approve' };
    try {
      const r = await fetch(API + '/api/projects/' + selectedProject._id + eps[type], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ note: noteText })
      });
      const d = await r.json();
      if (d.success) {
        toastMsg('Approved by ' + type.toUpperCase());
        setNoteText('');
        loadDetail(selectedProject._id);
        fetchProjects();
      } else toastMsg(d.message, 'error');
    } catch (e) { toastMsg('Error', 'error'); }
  }

  async function addNote() {
    if (!noteText.trim() || !selectedProject) return;
    try {
      const r = await fetch(API + '/api/projects/' + selectedProject._id + '/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ text: noteText, stage: 'general' })
      });
      const d = await r.json();
      if (d.success) { toastMsg('Note added'); setNoteText(''); loadDetail(selectedProject._id); }
    } catch (e) {}
  }

  async function addExtraHours() {
    if (!extraHours || extraHours <= 0) return toastMsg('Valid hours required', 'error');
    try {
      const r = await fetch(API + '/api/projects/' + selectedProject._id + '/add-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ hours: Number(extraHours) })
      });
      const d = await r.json();
      if (d.success) { toastMsg(extraHours + ' extra hours added'); setExtraHours(''); loadDetail(selectedProject._id); }
    } catch (e) {}
  }

  async function submitTS(e) {
    e.preventDefault();
    if (!selectedProject) return;
    const online = Number(tsOnline) || 0;
    const offline = Number(tsOffline) || 0;
    if (online === 0 && offline === 0) return toastMsg('Select hours', 'error');
    if (!tsDesc.trim()) return toastMsg('Describe your work', 'error');
    try {
      const r = await fetch(API + '/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          projectId: selectedProject._id,
          date: new Date().toISOString().split('T')[0],
          onlineHours: online, offlineHours: offline, description: tsDesc
        })
      });
      const d = await r.json();
      if (d.success) {
        toastMsg('Hours submitted! ' + (d.timesheet?.aiFeedback || ''));
        setTsOnline(''); setTsOffline(''); setTsDesc('');
        loadDetail(selectedProject._id);
      } else toastMsg(d.message, 'error');
    } catch (e) { toastMsg('Error', 'error'); }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner" /></div>;

  const canAddNote = !isDev;
  const sp = selectedProject;
  const status = sp?.status;

  return (
    <div>
      <div className="navbar">
        <h2> Projects</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{projects.length} projects</span>
          {canCreate && !showForm && <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ New Project</button>}
        </div>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-title">Create New Project</div>
          <form onSubmit={createProject}>
            <div className="grid-2">
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Title *</label>
                <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Project title" required />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Source</label>
                <select className="input" value={form.source} onChange={e => setForm({...form, source: e.target.value})}>
                  <option value="upwork">Upwork</option><option value="fiverr">Fiverr</option><option value="freelancer">Freelancer</option><option value="referral">Referral</option><option value="direct">Direct</option><option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Source Detail</label>
                <input className="input" value={form.sourceDetail} onChange={e => setForm({...form, sourceDetail: e.target.value})} placeholder="e.g. Upwork link" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Budget</label>
                <input className="input" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} placeholder="e.g. $5000" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Deadline</label>
                <input className="input" type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Allocated Hours</label>
                <input className="input" type="number" value={form.allocatedHours} onChange={e => setForm({...form, allocatedHours: e.target.value})} placeholder="Total hours" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Assign BDM</label>
                <select className="input" value={form.bdm} onChange={e => setForm({...form, bdm: e.target.value})}>
                  <option value="">Select BDM</option>
                  {users.filter(u => u.role === 'bdm').map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Assign PM</label>
                <select className="input" value={form.pm} onChange={e => setForm({...form, pm: e.target.value})}>
                  <option value="">Select PM</option>
                  {users.filter(u => u.role === 'pm').map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Project description" />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Assign Developers (hold Ctrl for multiple)</label>
              <select className="input" multiple value={form.developers} onChange={e => setForm({...form, developers: Array.from(e.target.selectedOptions, o => o.value)})} style={{ minHeight: '80px' }}>
                {users.filter(u => u.role === 'dev').map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>
            <div className="btn-group">
              <button type="submit" className="btn btn-primary">Create Project</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {sp ? (
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedProject(null)} style={{ marginBottom: '12px' }}>&larr; Back</button>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{sp.title}</h3>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {!isDev && <span className="role-badge" style={{ background: STATUS_COLORS[status] + '22', color: STATUS_COLORS[status] }}>{status}</span>}
                  <span style={{ fontSize: '11px', color: 'var(--text2)' }}>Source: {sp.source}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text2)' }}>Allocated: {sp.allocatedHours || 0}h</span>
                  {sp.extraHoursAdded > 0 && <span style={{ fontSize: '11px', color: 'var(--orange)' }}>+{sp.extraHoursAdded}h extra</span>}
                  {!isDev && <span style={{ fontSize: '11px', color: sp.remainingHours > 0 ? 'var(--green)' : sp.usedHours > 0 ? 'var(--red)' : 'var(--text2)' }}>
                    Used: {sp.usedHours || 0}h / Remaining: {sp.remainingHours || sp.totalApprovedHours || sp.allocatedHours || 0}h
                  </span>}
                </div>
              </div>
              {!isDev && (
                <div style={{ width: '100%' }}>
                  {(canApproveBDM || canApprovePM || canApproveSales) && (
                    <input className="input" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Approval note..." style={{ marginBottom: '8px' }} />
                  )}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {canApproveBDM && status === 'pending' && <button className="btn btn-success btn-sm" onClick={() => approveProject('bdm')}>Approve as BDM</button>}
                    {canApprovePM && status === 'bdm-approved' && <button className="btn btn-success btn-sm" onClick={() => approveProject('pm')}>Approve as PM</button>}
                    {canApproveSales && status === 'pm-approved' && <button className="btn btn-success btn-sm" onClick={() => approveProject('sales')}>Final (Sales)</button>}
                    {role === 'owner' && status === 'pending' && <button className="btn btn-success btn-sm" onClick={() => approveProject('bdm')}>Owner: BDM</button>}
                    {role === 'owner' && status === 'bdm-approved' && <button className="btn btn-success btn-sm" onClick={() => approveProject('pm')}>Owner: PM</button>}
                    {role === 'owner' && status === 'pm-approved' && <button className="btn btn-success btn-sm" onClick={() => approveProject('sales')}>Owner: Final</button>}
                    {canSeeDevStatus && (
                      <button className="btn btn-secondary btn-sm" onClick={fetchProjectTimesheets}>
                        {showDevStatus ? 'Refresh Dev Status' : 'Developer Status'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid-3" style={{ marginTop: '16px' }}>
              <div><div style={{ fontSize: '10px', color: 'var(--text2)', textTransform: 'uppercase' }}>Sales</div><div>{sp.salesManager?.name || 'N/A'}</div></div>
              <div><div style={{ fontSize: '10px', color: 'var(--text2)', textTransform: 'uppercase' }}>BDM</div><div>{sp.bdm?.name || 'N/A'}</div></div>
              <div><div style={{ fontSize: '10px', color: 'var(--text2)', textTransform: 'uppercase' }}>PM</div><div>{sp.pm?.name || 'N/A'}</div></div>
            </div>
          </div>

          {/* Developer Status Section for non-dev roles */}
          {!isDev && showDevStatus && (
            <div className="card">
              <div className="card-title">Developer Status Entries</div>
              {loadingTs ? (
                <div style={{ textAlign: 'center', padding: '30px' }}><div className="spinner"></div></div>
              ) : projectTs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text2)', fontSize: '13px' }}>
                  No developer status entries for this project yet.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Developer</th>
                        <th>Description</th>
                        <th>Online</th>
                        <th>Offline</th>
                        <th>Total</th>
                        <th>AI Score</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectTs.map(t => {
                        const analysis = analysisResult?.[t._id];
                        const isAnalyzing = analyzing === t._id;
                        return (
                          <tr key={t._id}>
                            <td>{new Date(t.date).toLocaleDateString()}</td>
                            <td><strong>{t.developer?.name}</strong></td>
                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</td>
                            <td>{t.onlineHours}h</td>
                            <td>{t.offlineHours}h</td>
                            <td><strong>{t.totalHours}h</strong></td>
                            <td>
                              {analysis ? (
                                <span style={{ color: analysis.aiScore >= 60 ? 'var(--green)' : 'var(--yellow)', fontSize: '12px', fontWeight: 600 }}>
                                  {analysis.aiScore}% - {analysis.health}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text2)', fontSize: '11px' }}>{t.aiScore}%</span>
                              )}
                            </td>
                            <td>
                              <button className="btn btn-primary btn-sm" onClick={() => analyzeTimesheet(t._id, t.developer?.name)}
                                disabled={isAnalyzing}
                                style={{ fontSize: '10px', padding: '3px 8px' }}>
                                {isAnalyzing ? '...' : 'Analyze'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Show all analysis results */}
              {Object.keys(analysisResult || {}).length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>AI Analysis Reports</h5>
                  {Object.entries(analysisResult).map(([tsId, result]) => {
                    if (!result) return null;
                    const t = projectTs.find(x => x._id === tsId);
                    const healthColor = result.health === 'Good' ? 'var(--green)' : result.health === 'Fair' ? 'var(--yellow)' : 'var(--red)';
                    const healthBg = result.health === 'Good' ? 'rgba(34,197,94,0.2)' : result.health === 'Fair' ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)';
                    return (
                      <div key={tsId} style={{ marginBottom: '12px', background: 'var(--bg3)', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span className="role-badge" style={{ fontSize: '11px', padding: '3px 8px', background: healthBg, color: healthColor }}>
                            {result.health}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>{t?.developer?.name} - {t?.project?.title || sp.title}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text2)' }}>{t ? new Date(t.date).toLocaleDateString() : ''}</span>
                        </div>
                        <div style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--text)' }}>{result.aiFeedback}</div>
                        {result.hasConcerns && <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--red)' }}>Warning: Notes mention concerns</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {isDev && todaySubmitted ? (
            <div className="card" style={{ border: '1px solid rgba(34,197,94,0.3)' }}>
              <div className="card-title" style={{ color: 'var(--green)' }}>Submit Hours</div>
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--green)', fontSize: '13px' }}>
                &#9989; You already submitted your hours for this project today.
              </div>
            </div>
          ) : null}
          {isDev && !todaySubmitted ? (
            <div className="card" style={{ border: '1px solid rgba(34,197,94,0.3)' }}>
              <div className="card-title" style={{ color: 'var(--green)' }}>Submit Hours</div>
              <form onSubmit={submitTS}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--green)', display: 'block', marginBottom: '4px' }}>Online</label>
                    <select className="input" value={tsOnline} onChange={e => setTsOnline(e.target.value)} style={{ width: '100px', marginBottom: 0 }}>
                      <option value="">-</option>
                      {HOURS.map(h => <option key={h} value={h}>{h}h</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--yellow)', display: 'block', marginBottom: '4px' }}>Offline</label>
                    <select className="input" value={tsOffline} onChange={e => setTsOffline(e.target.value)} style={{ width: '100px', marginBottom: 0 }}>
                      <option value="">-</option>
                      {HOURS.map(h => <option key={h} value={h}>{h}h</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Description *</label>
                    <input className="input" value={tsDesc} onChange={e => setTsDesc(e.target.value)} placeholder="What did you work on?" style={{ marginBottom: 0 }} required />
                  </div>
                  <button className="btn btn-success">Submit</button>
                </div>
              </form>
            </div>
          ) : null}

          {canAddHours && (
            <div className="card">
              <div className="card-title">Add Extra Hours</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="input" type="number" value={extraHours} onChange={e => setExtraHours(e.target.value)} placeholder="Hours" style={{ maxWidth: '200px', marginBottom: 0 }} />
                <button className="btn btn-primary btn-sm" onClick={addExtraHours}>Add</button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-title">Notes & Approvals</div>
            {canAddNote && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input className="input" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add note..." style={{ marginBottom: 0 }} />
                <button className="btn btn-primary btn-sm" onClick={addNote}>Add</button>
              </div>
            )}
            {sp.notes?.length > 0 ? [...sp.notes].reverse().map((n, i) => (
              <div key={i} className="note-item">
                <div className="note-meta">
                  <span className="role-badge" style={{ fontSize: '9px', background: 'rgba(14, 165, 233, 0.15)', color: 'var(--primary)', marginRight: '6px' }}>
                    {(n.addedByRole || n.addedBy?.role || '').toUpperCase()}
                  </span>
                  {n.addedByName || n.addedBy?.name || 'Unknown'} - {new Date(n.createdAt).toLocaleString()}
                  {n.stage !== 'general' && <span style={{ marginLeft: '6px', color: 'var(--cyan)', fontSize: '10px' }}>#{n.stage}</span>}
                </div>
                <div className="note-text">{n.text}</div>
              </div>
            )) : <div style={{ fontSize: '12px', color: 'var(--text2)' }}>No notes</div>}
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="icon">&#128194;</div>
          <h3>No projects</h3>
          <p>Projects appear here once created.</p>
        </div>
      ) : projects.map(p => (
        <div key={p._id} className="project-item" onClick={() => loadDetail(p._id)}>
          <div className="proj-info">
            <h4>{p.title}</h4>
            <p>Source: {p.source} - {p.allocatedHours || 0}h{p.salesManager ? ' - ' + p.salesManager.name : ''}</p>
          </div>
          <div className="proj-meta">
            <span className="role-badge" style={{ background: STATUS_COLORS[p.status] + '22', color: STATUS_COLORS[p.status] }}>{p.status}</span>
            <div style={{ marginTop: '4px' }}>{new Date(p.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      ))}

      {toast && <div className={'toast ' + toast.type}>{toast.msg}</div>}
    </div>
  );
}