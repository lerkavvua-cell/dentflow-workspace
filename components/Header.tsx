'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { copy, languageNames, presenceKeys, themeNames } from '@/lib/dentflow';
import type { Lang, Presence, SystemNotice, ThemeKey } from '@/types';

export default function Header({
  lang,
  theme,
  cloudMode,
  query,
  currentPresence,
  setQuery,
  setLang,
  setTheme,
  setPresence,
  notices,
  onDismissNotice,
  exit
}: {
  lang: Lang;
  theme: ThemeKey;
  cloudMode: boolean;
  query: string;
  currentPresence: Presence;
  setQuery: (query: string) => void;
  setLang: (lang: Lang) => void;
  setTheme: (theme: ThemeKey) => void;
  setPresence: (presence: Presence) => void;
  notices: SystemNotice[];
  onDismissNotice: (id: string) => void;
  exit: () => void;
}) {
  const t = copy[lang];
  const [noticesOpen, setNoticesOpen] = useState(false);
  const noticesPanel = noticesOpen ? (
    <div className="notice-popover" role="dialog" aria-label="Emergency chat">
      <strong>Important</strong>
      {notices.length === 0 && <p className="muted">No updates</p>}
      {notices.map(notice => (
        <article className={notice.type} key={notice.id}>
          <p>{notice.text}</p>
          <button type="button" onClick={() => onDismissNotice(notice.id)}>
            {t.close}
          </button>
        </article>
      ))}
    </div>
  ) : null;

  return (
    <>
      <header className="topbar">
        <div>
          <h2>{t.today}</h2>
          <p>{cloudMode ? t.cloudOn : t.localMode}</p>
        </div>
        <label className="search-box">
          <span />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder={t.search} />
        </label>
        <div className="top-controls">
          <select value={currentPresence} onChange={event => setPresence(event.target.value as Presence)}>
            {presenceKeys.map(item => (
              <option key={item} value={item}>
                {t[item]}
              </option>
            ))}
          </select>
          <select value={lang} onChange={event => setLang(event.target.value as Lang)}>
            {Object.entries(languageNames).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
          <select value={theme} onChange={event => setTheme(event.target.value as ThemeKey)}>
            {Object.entries(themeNames).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
          <div className="notice-menu">
            <button
              type="button"
              className={`notice-button ${notices.length ? 'has-unread' : ''}`}
              onClick={() => setNoticesOpen(value => !value)}
            >
              Emergency chat
              {notices.length > 0 && <span>{notices.length}</span>}
            </button>
          </div>
          <button onClick={exit}>{t.exit}</button>
        </div>
      </header>
      {typeof document !== 'undefined' && noticesPanel ? createPortal(noticesPanel, document.body) : null}
    </>
  );
}
