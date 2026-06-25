'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { copy, statusKeys, users } from '@/lib/dentflow';
import { useDentFlowData } from '@/hooks/useDentFlowData';
import { useNotifications } from '@/hooks/useNotifications';
import type { Lang, Patient, ThemeKey, UserKey, ViewKey } from '@/types';
import ChatWorkspace from './ChatWorkspace';
import Dashboard from './Dashboard';
import Header from './Header';
import NotificationCenter from './NotificationCenter';
import PatientPanel from './PatientPanel';
import ReportsPanel from './ReportsPanel';
import SettingsPanel from './SettingsPanel';
import Sidebar from './Sidebar';
import WelcomeScreen from './WelcomeScreen';

export default function AppShell() {
  const [user, setUser] = useState<UserKey | null>(null);
  const [lang, setLang] = useState<Lang>('ru');
  const [theme, setTheme] = useState<ThemeKey>('paper');
  const [view, setView] = useState<ViewKey>('chats');
  const [query, setQuery] = useState('');
  const [activePatientId, setActivePatientId] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const [toast, setToast] = useState('');
  const t = copy[lang];

  const showError = useCallback(
    (message: string) => {
      setToast(`${t.systemError}: ${message}`);
      window.setTimeout(() => setToast(''), 6000);
    },
    [t.systemError]
  );

  const data = useDentFlowData(user, showError);
  const notice = useNotifications(data.messages, user, soundOn);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  }, [lang, theme]);

  useEffect(() => {
    if (user && user !== 'valeriia' && view === 'reports') setView('chats');
  }, [user, view]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return { patients: data.patients, messages: data.messages };

    return {
      patients: data.patients.filter(patient =>
        [patient.name, patient.status, patient.doctor, patient.agent, patient.cardLink, patient.canvaLink, patient.notes, patient.workspace]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      ),
      messages: data.messages.filter(message =>
        [message.text, message.patient, message.cardLink, message.canvaLink, message.file?.fileName, message.author, message.workspace]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      )
    };
  }, [data.messages, data.patients, query]);

  const selectedPatient = filtered.patients.find(patient => patient.id === activePatientId) || filtered.patients[0];

  if (!user) {
    return <WelcomeScreen lang={lang} theme={theme} setLang={setLang} setTheme={setTheme} setUser={setUser} />;
  }

  return (
    <div className="app-shell">
      <Sidebar lang={lang} activeView={view} setView={setView} currentUser={user} presence={data.presence} />
      <main className="workspace">
        <Header
          lang={lang}
          theme={theme}
          cloudMode={data.cloudMode}
          query={query}
          currentPresence={data.presence[user]}
          setQuery={setQuery}
          setLang={setLang}
          setTheme={setTheme}
          setPresence={data.setMyPresence}
          exit={() => setUser(null)}
        />
        <section className="content-grid">
          <div className="main-panel">
            {view === 'today' && <Dashboard lang={lang} patients={filtered.patients} onSelectPatient={setActivePatientId} />}
            {view === 'chats' && (
              <ChatWorkspace
                lang={lang}
                currentUser={user}
                messages={filtered.messages}
                patients={filtered.patients}
                tasks={data.tasks}
                presence={data.presence}
                onSend={data.sendMessage}
                onAddTask={data.addTask}
                onCompleteTask={data.completeTask}
                onSelectPatient={setActivePatientId}
              />
            )}
            {view === 'patients' && <PatientsView lang={lang} patients={filtered.patients} onSelectPatient={setActivePatientId} />}
            {view === 'plans' && <PlansView lang={lang} patients={filtered.patients} onSelectPatient={setActivePatientId} />}
            {view === 'reports' && user === 'valeriia' && <ReportsPanel lang={lang} patients={filtered.patients} messages={filtered.messages} />}
            {view === 'settings' && (
              <SettingsPanel
                lang={lang}
                theme={theme}
                soundOn={soundOn}
                presence={data.presence[user]}
                currentUser={user}
                setLang={setLang}
                setTheme={setTheme}
                setSoundOn={setSoundOn}
                setPresence={data.setMyPresence}
                sendEmergency={data.setSystemEmergency}
                sendNotice={data.addSystemNotice}
              />
            )}
          </div>
          <PatientPanel lang={lang} patient={selectedPatient} onSave={data.savePatient} />
        </section>
      </main>

      {data.emergency && <SoftAlert title={t.emergencyTitle} text={data.emergency} close={() => data.setSystemEmergency('')} />}
      <NoticeFeed notices={data.notices} />
      {toast && <div className="toast">{toast}</div>}
      <NotificationCenter notice={notice} label={t.newMessage} />
      <div className="presence-dock" aria-label="Team presence">
        {users.map(profile => (
          <span key={profile.key}>
            <i className={`presence-dot ${data.presence[profile.key]}`} />
            {profile.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function SoftAlert({ title, text, close }: { title: string; text: string; close: () => void }) {
  return (
    <aside className="soft-alert">
      <strong>{title}</strong>
      <p>{text}</p>
      <button type="button" onClick={close}>OK</button>
    </aside>
  );
}

function NoticeFeed({ notices }: { notices: { id: string; type: 'warning' | 'info'; text: string; createdAt: number }[] }) {
  if (notices.length === 0) return null;
  return (
    <aside className="notice-feed">
      <strong>Important</strong>
      <div>
        {notices.slice(0, 8).map(notice => (
          <p className={notice.type} key={notice.id}>{notice.text}</p>
        ))}
      </div>
    </aside>
  );
}

function PatientsView({
  lang,
  patients,
  onSelectPatient
}: {
  lang: Lang;
  patients: Patient[];
  onSelectPatient: (id: string) => void;
}) {
  const t = copy[lang];
  return (
    <section className="panel">
      <div className="panel-title">
        <h3>{t.patients}</h3>
      </div>
      <div className="patient-list">
        {patients.length === 0 && <p className="muted">{t.noPatients}</p>}
        {patients.map(patient => (
          <button key={patient.id} onClick={() => onSelectPatient(patient.id)}>
            <strong>{patient.name}</strong>
            <span>{t[patient.status]} · {patient.doctor || t.doctor} · {patient.agent || t.agent}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PlansView({
  lang,
  patients,
  onSelectPatient
}: {
  lang: Lang;
  patients: Patient[];
  onSelectPatient: (id: string) => void;
}) {
  const t = copy[lang];
  return (
    <section className="plans-grid">
      {statusKeys.map(status => (
        <div className="panel plan-column" key={status}>
          <div className="panel-title">
            <h3>{t[status]}</h3>
          </div>
          <div className="patient-list compact">
            {patients.filter(patient => patient.status === status).map(patient => (
              <button key={patient.id} onClick={() => onSelectPatient(patient.id)}>
                <strong>{patient.name}</strong>
                <span>{patient.workspace}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
