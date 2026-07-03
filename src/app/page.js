'use client';

import { useState } from 'react';
import { useApp } from './layout';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, API } = useApp();
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        login(data.token, data.user);
        router.push('/dashboard');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Connection error. Ensure backend is running on port 5001.');
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Baselient IT Development</h1>
        <p>Sign in to manage projects, timesheets, resources, and suggestions.</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email address" value={email}
            onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} minLength={5} required />
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}