'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../../layout';

export default function SuggestionsPage() {
  const { user, token, API } = useApp();
  const [message, setMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isHrOrOwner = user && (user.role === 'hr' || user.role === 'owner');

  useEffect(() => {
    if (token && isHrOrOwner) {
      fetchSuggestions();
    }
  }, [token, user]);

  async function fetchSuggestions() {
    setFetching(true);
    try {
      const res = await fetch(API + '/api/suggestions', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (e) {
      console.error(e);
    }
    setFetching(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch(API + '/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Your suggestion was submitted successfully! Thank you for helping us improve.');
        setMessage('');
        if (isHrOrOwner) {
          fetchSuggestions(); // update list if HR/Owner submits
        }
      } else {
        setError(data.message || 'Failed to submit suggestion');
      }
    } catch (err) {
      setError('Connection error');
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="navbar">
        <h2>💡 Suggestion Box</h2>
        <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
          Share your ideas and feedback anonymously
        </div>
      </div>

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

      <div style={{ display: 'grid', gridTemplateColumns: isHrOrOwner ? '1fr 1.2fr' : '1fr', gap: '20px' }}>
        
        {/* Suggestion Form */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📝 Submit a Suggestion</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '14px', lineHeight: '1.4' }}>
            Have ideas to improve processes, work environment, or tools at <strong>Baselient IT Development</strong>? 
            Submit them below. Your submission is <strong>completely anonymous</strong> in the UI — no name or email will be displayed.
          </p>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <textarea
                className="input"
                style={{ minHeight: '150px', resize: 'vertical' }}
                placeholder="What is your suggestion? Please provide detail..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Submitting...' : '🔒 Submit Suggestion Anonymously'}
            </button>
          </form>
        </div>

        {/* Suggestion List (HR/Owner Only) */}
        {isHrOrOwner && (
          <div className="card">
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📥 Submitted Suggestions ({suggestions.length})</span>
              <button 
                onClick={fetchSuggestions} 
                className="btn btn-secondary btn-sm" 
                disabled={fetching}
              >
                {fetching ? 'Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
            
            {fetching && suggestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="spinner"></div>
                <p style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '8px' }}>Fetching suggestions...</p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 10px' }}>
                <div className="icon">🤫</div>
                <h3>No suggestions yet</h3>
                <p>Suggestions submitted by team members will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                {suggestions.map(suggestion => (
                  <div key={suggestion._id} style={{
                    padding: '14px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--bg2)'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🕵️‍♂️</span>
                      <strong style={{ fontSize: '12px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Anonymous Suggestion
                      </strong>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                      {suggestion.message}
                    </p>
                    <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text2)', textAlign: 'right' }}>
                      Received: {new Date(suggestion.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
