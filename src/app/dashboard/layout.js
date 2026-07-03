'use client';

import { useEffect, useState } from 'react';
import { useApp } from '../layout';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const ROLE_ICONS = {
  owner: '👑', hr: '🤝', sales: '📈', bdm: '🔍', pm: '📋', dev: '💻'
};

const ROLE_COLORS = {
  owner: '#f97316', hr: '#06b6d4', sales: '#22c55e', bdm: '#a855f7', pm: '#eab308', dev: '#0ea5e9'
};

export default function DashboardLayout({ children }) {
  const { user, token, API, loading, logout } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [notices, setNotices] = useState([]);
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (token && user) {
      fetchNotices();
      const interval = setInterval(fetchNotices, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [token, user]);

  async function fetchNotices() {
    try {
      const res = await fetch(API + '/api/notices', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      if (data.success) {
        setNotices(data.notices);
      }
    } catch (e) {
      console.error('Error fetching notices:', e);
    }
  }

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;
  if (!user) return null;

  const role = user.role;

  // Nav items based on role
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: '*' },
    { path: '/dashboard/projects', label: 'Projects', icon: '📁', roles: '*' },
    { path: '/dashboard/timesheet', label: 'Timesheet', icon: '⏱️', roles: ['dev', 'pm', 'owner', 'hr'] },
    { path: '/dashboard/users', label: 'Team', icon: '👥', roles: ['owner', 'hr', 'pm'] },
    { path: '/dashboard/reports', label: 'Reports', icon: '📈', roles: '*' },
    { path: '/dashboard/leaves', label: 'Leaves', icon: '🌴', roles: '*' },
    { path: '/dashboard/notices', label: 'Notices', icon: '🔔', roles: '*' },
    { path: '/dashboard/suggestions', label: 'Suggestions', icon: '💡', roles: '*' },
  ].filter(item => item.roles === '*' || item.roles.includes(role));

  const initials = user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const activeNotices = notices.filter(n => !dismissedNoticeIds.includes(n._id));

  function dismissNotice(id) {
    setDismissedNoticeIds([...dismissedNoticeIds, id]);
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ color: 'var(--primary)', letterSpacing: '0.5px' }}>✦ Baselient IT</div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link key={item.path} href={item.path}
              className={pathname === item.path ? 'active' : ''}>
              <span>{item.icon} {item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="name">{user.name}</div>
          <div className="email">{user.email}</div>
          <div style={{ marginTop: '6px' }}>
            <span className="role-badge" style={{
              background: ROLE_COLORS[role] + '22',
              color: ROLE_COLORS[role]
            }}>
              {ROLE_ICONS[role]} {role.toUpperCase()}
            </span>
          </div>
          <button onClick={() => { logout(); router.push('/'); }}
            style={{ marginTop: '10px', fontSize: '12px', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main-content">
        {activeNotices.length > 0 && (
          <div className="notice-banners-container">
            {activeNotices.map(notice => (
              <div key={notice._id} className={`notice-banner notice-banner-${notice.type}`}>
                <div className="notice-banner-content">
                  <div className="notice-banner-title">
                    {notice.type === 'warning' ? '⚠️' : notice.type === 'urgent' ? '🚨' : notice.type === 'greeting' ? '🎉' : '🔔'} {notice.title}
                  </div>
                  <div>{notice.message}</div>
                  <div className="notice-banner-meta">
                    Sent by {notice.sentByName} ({notice.sentByRole.toUpperCase()}) • {new Date(notice.createdAt).toLocaleString()}
                  </div>
                </div>
                <button className="notice-banner-close" onClick={() => dismissNotice(notice._id)}>×</button>
              </div>
            ))}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}