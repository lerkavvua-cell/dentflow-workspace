'use client';

import { copy, roleLabels, users, viewKeys } from '@/lib/dentflow';
import type { Lang, LastSeenMap, OnlineMap, Presence, UserKey, ViewKey } from '@/types';

export default function Sidebar({
  lang,
  activeView,
  setView,
  currentUser,
  presence,
  online,
  lastSeen
}: {
  lang: Lang;
  activeView: ViewKey;
  setView: (view: ViewKey) => void;
  currentUser: UserKey;
  presence: Record<UserKey, Presence>;
  online: OnlineMap;
  lastSeen: LastSeenMap;
}) {
  const t = copy[lang];
  const profile = users.find(item => item.key === currentUser)!;
  const availableViews = viewKeys.filter(view => currentUser === 'valeriia' || (view !== 'reports' && view !== 'plans'));

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">D</div>
        <div>
          <h1>{t.appTitle}</h1>
          <span>{t.appSubtitle}</span>
        </div>
      </div>

      <div className="profile-card">
        <div className="avatar">{profile.name.slice(0, 1)}</div>
        <div>
          <strong>{profile.name}</strong>
          <span>{roleLabels[lang][profile.key]}</span>
        </div>
      </div>

      <nav className="side-nav" aria-label="DentFlow sections">
        {availableViews.map(view => (
          <button key={view} className={activeView === view ? 'active' : ''} onClick={() => setView(view)}>
            <span className={`nav-icon ${view}`} />
            {t[view]}
          </button>
        ))}
      </nav>

      <section className="team-card">
        <h2>{t.team}</h2>
        {users.map(member => (
          <div className="team-row" key={member.key}>
            <span className={`presence-dot ${online[member.key] ? 'online' : 'offline'} ${presence[member.key]}`} />
            <div>
              <strong>{member.name}</strong>
              <small>
                {online[member.key] ? t.online : t.offline} · {t[presence[member.key]]}
                {!online[member.key] && lastSeen[member.key] ? ` · ${t.lastSeen} ${new Date(lastSeen[member.key]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </small>
            </div>
          </div>
        ))}
      </section>
    </aside>
  );
}
