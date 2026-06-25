'use client';

import { DFLang, DFTheme, UserKey, teamMembers, tr } from '@/lib/dentflow';

type WelcomeScreenProps = {
  lang: DFLang;
  theme: DFTheme;
  onLangChange: (lang: DFLang) => void;
  onThemeChange: (theme: DFTheme) => void;
  onLogin: (user: UserKey) => void;
};

const scenes = ['sun', 'balloons', 'dog', 'tree', 'clouds'] as const;

export default function WelcomeScreen({
  lang,
  theme,
  onLangChange,
  onThemeChange,
  onLogin,
}: WelcomeScreenProps) {
  const scene = scenes[Math.floor(Math.random() * scenes.length)];

  return (
    <div className="login" data-theme={theme}>
      <div className="welcome">
        <div className="scene">
          {scene === 'sun' && (
            <>
              <div className="sun" />
              <div className="cloud" />
              <div className="cloud c2" />
            </>
          )}

          {scene === 'balloons' && (
            <>
              <div className="balloon b1">🎈</div>
              <div className="balloon b2">🎈</div>
              <div className="balloon b3">🎈</div>
            </>
          )}

          {scene === 'dog' && <div className="welcome-pet">🐶</div>}

          {scene === 'tree' && <div className="welcome-tree">🌳</div>}

          {scene === 'clouds' && (
            <>
              <div className="cloud" />
              <div className="cloud c2" />
              <div className="welcome-pet">🐱</div>
            </>
          )}
        </div>

        <h1>{tr(lang, 'welcome')} ☀️</h1>
        <p>{tr(lang, 'welcomeSubtitle')}</p>

        <div className="welcome-controls">
          <label>
            {tr(lang, 'chooseLanguage')}
            <select
              className="pill"
              value={lang}
              onChange={e => onLangChange(e.target.value as DFLang)}
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="tr">Türkçe</option>
              <option value="he">עברית</option>
            </select>
          </label>

          <label>
            {tr(lang, 'chooseTheme')}
            <select
              className="pill"
              value={theme}
              onChange={e => onThemeChange(e.target.value as DFTheme)}
            >
              <option value="paper">Paper</option>
              <option value="ocean">Ocean</option>
              <option value="forest">Forest</option>
              <option value="sakura">Sakura</option>
              <option value="night">Night</option>
            </select>
          </label>
        </div>

        <div className="login-actions">
          {teamMembers.map(member => (
            <button key={member.key} onClick={() => onLogin(member.key)}>
              {member.key === 'valeriia' ? '🌱 ' : ''}
              {member.name}
              <span>{member.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
