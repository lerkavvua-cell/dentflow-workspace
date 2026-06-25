'use client';

import { useEffect, useState } from 'react';
import { copy, languageNames, themeNames, users } from '@/lib/dentflow';
import type { Lang, ThemeKey, UserKey } from '@/types';

const scenes = ['sun', 'balloons', 'dog', 'cat', 'tree', 'rain', 'cozy'] as const;

export default function WelcomeScreen({
  lang,
  theme,
  setLang,
  setTheme,
  setUser
}: {
  lang: Lang;
  theme: ThemeKey;
  setLang: (lang: Lang) => void;
  setTheme: (theme: ThemeKey) => void;
  setUser: (user: UserKey) => void;
}) {
  const [scene, setScene] = useState<(typeof scenes)[number]>('sun');
  const t = copy[lang];

  useEffect(() => {
    setScene(scenes[Math.floor(Math.random() * scenes.length)]);
  }, []);

  return (
    <main className="welcome-screen" data-theme={theme}>
      <section className="welcome-panel">
        <div className={`welcome-scene ${scene}`}>
          <span className="sun-shape" />
          <span className="cloud-shape one" />
          <span className="cloud-shape two" />
          <span className="balloon-shape one" />
          <span className="balloon-shape two" />
          <span className="pet-shape" />
          <span className="tree-shape" />
          <span className="rain-shape" />
          <span className="cozy-shape" />
        </div>
        <h1>{t.welcome}</h1>
        <p>{t.welcomeText}</p>

        <div className="welcome-controls">
          <label>
            <span>{t.language}</span>
            <select value={lang} onChange={event => setLang(event.target.value as Lang)}>
              {Object.entries(languageNames).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.theme}</span>
            <select value={theme} onChange={event => setTheme(event.target.value as ThemeKey)}>
              {Object.entries(themeNames).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h2>{t.chooseUser}</h2>
        <div className="user-grid">
          {users.map(user => (
            <button key={user.key} onClick={() => setUser(user.key)}>
              <span className={user.key === 'valeriia' ? 'plant-avatar' : ''} aria-hidden="true">
                {user.key === 'valeriia' ? '' : user.name[0]}
              </span>
              {user.name}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
