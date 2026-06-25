'use client';

import { copy, languageNames, presenceKeys, themeNames } from '@/lib/dentflow';
import type { Lang, Presence, ThemeKey, UserKey } from '@/types';

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
  exit: () => void;
}) {
  const t = copy[lang];

  return (
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
        <button onClick={exit}>{t.exit}</button>
      </div>
    </header>
  );
}
