'use client';

import { useState } from 'react';
import { copy, languageNames, presenceKeys, soundNames, themeNames } from '@/lib/dentflow';
import type { Lang, Presence, SoundKey, ThemeKey, UserKey } from '@/types';

export default function SettingsPanel({
  lang,
  theme,
  soundOn,
  soundKey,
  presence,
  currentUser,
  setLang,
  setTheme,
  setSoundOn,
  setSoundKey,
  setPresence,
  sendEmergency,
  sendNotice
}: {
  lang: Lang;
  theme: ThemeKey;
  soundOn: boolean;
  soundKey: SoundKey;
  presence: Presence;
  currentUser: UserKey;
  setLang: (lang: Lang) => void;
  setTheme: (theme: ThemeKey) => void;
  setSoundOn: (value: boolean) => void;
  setSoundKey: (sound: SoundKey) => void;
  setPresence: (presence: Presence) => void;
  sendEmergency: (message: string) => Promise<void>;
  sendNotice: (type: 'warning' | 'info', message: string) => Promise<void>;
}) {
  const t = copy[lang];
  const [emergency, setEmergency] = useState('');

  return (
    <section className="panel settings-panel">
      <div className="panel-title">
        <h3>{t.settings}</h3>
      </div>
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
      <label>
        <span>{t.currentStatus}</span>
        <select value={presence} onChange={event => setPresence(event.target.value as Presence)}>
          {presenceKeys.map(item => (
            <option key={item} value={item}>
              {t[item]}
            </option>
          ))}
        </select>
      </label>
      <label className="toggle-row">
        <span>{t.sound}</span>
        <button className={soundOn ? 'enabled' : ''} onClick={() => setSoundOn(!soundOn)}>
          {soundOn ? t.on : t.off}
        </button>
      </label>
      <label>
        <span>Message sound</span>
        <select value={soundKey} onChange={event => setSoundKey(event.target.value as SoundKey)}>
          {Object.entries(soundNames).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {currentUser === 'valeriia' && (
        <div className="emergency-settings">
          <strong>{t.emergency}</strong>
          <textarea value={emergency} onChange={event => setEmergency(event.target.value)} placeholder={t.emergencyPlaceholder} />
          <div className="notice-actions">
            <button
              type="button"
              onClick={async () => {
                await sendEmergency(emergency);
                setEmergency('');
              }}
            >
              Warning
            </button>
            <button
              type="button"
              onClick={async () => {
                await sendNotice('info', emergency);
                setEmergency('');
              }}
            >
              Info
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
