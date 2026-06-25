'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, firebaseReady } from '@/lib/firebase';
import { copy } from '@/lib/i18n';
import type {
  Lang,
  Message,
  Patient,
  PatientStatus,
  Presence,
  Profile,
  UserKey,
  WorkspaceKey,
} from '@/types';

type PatientExtra = Patient & {
  phone?: string;
  doctor?: string;
  agent?: string;
  docsLink?: string;
  sheetsLink?: string;
  panoramaLink?: string;
  ctLink?: string;
  notes?: string;
  planLabel?: string;
};

type MessageExtra = Message & {
  docsLink?: string;
  sheetsLink?: string;
  panoramaLink?: string;
  ctLink?: string;
};

const users: Profile[] = [
  { key: 'valeriia', name: 'Valeriia', role: 'Owner' },
  { key: 'behnia', name: 'Behnia', role: 'Planner' },
  { key: 'ilayda', name: 'İlayda', role: 'Planner' },
  { key: 'manager', name: 'Manager', role: 'Manager' },
];

const roleLabel: Record<UserKey, string> = {
  valeriia: 'Owner',
  behnia: 'Treatment Planner',
  ilayda: 'Treatment Planner',
  manager: 'Quality Control',
};

const workspaces: WorkspaceKey[] = ['valeriia', 'behnia', 'ilayda'];

const workspaceLabel: Record<WorkspaceKey, string> = {
  valeriia: 'Valeriia',
  behnia: 'Behnia',
  ilayda: 'İlayda',
};

const statusLabels: Record<PatientStatus, string> = {
  review: '🟡 Review',
  correction: '🟠 Correction',
  approved: '🟢 Approved',
  sent: '🔵 Sent',
  archived: '📦 Archived',
};

const presenceLabels: Record<Presence, string> = {
  here: '🟢 Я здесь',
  break: '☕ Перерыв',
  lunch: '🍽️ Обед',
  busy: '📞 Занят',
  finished: '🌙 Закончил работу',
};

const localKey = 'dentflow-v2-local-fallback';

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

const fmt = (n: number) =>
  new Date(n).toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });

function loadLocal() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(localKey) || 'null');
  } catch {
    return null;
  }
}

function saveLocal(data: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(localKey, JSON.stringify(data));
  }
}

export default function Page() {
  const [user, setUser] = useState<UserKey | null>(null);
  const [lang, setLang] = useState<Lang>('ru');
  const [theme, setTheme] = useState('paper');

  const [presence, setPresence] = useState<Record<UserKey, Presence>>({
    valeriia: 'here',
    behnia: 'here',
    ilayda: 'here',
    manager: 'here',
  });

  const [messages, setMessages] = useState<MessageExtra[]>([]);
  const [patients, setPatients] = useState<PatientExtra[]>([]);
  const [q, setQ] = useState('');
  const [emergency, setEmergency] = useState('');
  const [toast, setToast] = useState('');
  const [activePatientId, setActivePatientId] = useState('');

  const t = copy[lang];
  const cloudMode = firebaseReady && Boolean(db);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!user) return;

    if (cloudMode && db) {
      const unsubMessages = onSnapshot(
        query(collection(db, 'messages'), orderBy('createdAt', 'asc')),
        snap => setMessages(snap.docs.map(d => ({ ...(d.data() as MessageExtra), id: d.id }))),
        err => showToast(`Messages error: ${err.message}`)
      );

      const unsubPatients = onSnapshot(
        query(collection(db, 'patients'), orderBy('updatedAt', 'desc')),
        snap => setPatients(snap.docs.map(d => ({ ...(d.data() as PatientExtra), id: d.id }))),
        err => showToast(`Patients error: ${err.message}`)
      );

      const unsubPresence = onSnapshot(
        collection(db, 'presence'),
        snap => {
          const next: Record<UserKey, Presence> = {
            valeriia: 'finished',
            behnia: 'finished',
            ilayda: 'finished',
            manager: 'finished',
          };

          snap.docs.forEach(d => {
            next[d.id as UserKey] = d.data().status as Presence;
          });

          setPresence(next);
        },
        err => showToast(`Presence error: ${err.message}`)
      );

      const unsubEmergency = onSnapshot(
        doc(db, 'system', 'emergency'),
        snap => setEmergency((snap.data()?.text as string) || ''),
        err => showToast(`Emergency error: ${err.message}`)
      );

      return () => {
        unsubMessages();
        unsubPatients();
        unsubPresence();
        unsubEmergency();
      };
    }

    const data = loadLocal() || seedData();

    setMessages(data.messages);
    setPatients(data.patients);
    setPresence(data.presence);
    setEmergency(data.emergency || '');

    const timer = setInterval(() => {
      const d = loadLocal();
      if (d) {
        setMessages(d.messages);
        setPatients(d.patients);
        setPresence(d.presence);
        setEmergency(d.emergency || '');
      }
    }, 800);

    return () => clearInterval(timer);
  }, [user, cloudMode]);

  useEffect(() => {
    if (!cloudMode && user) {
      saveLocal({ messages, patients, presence, emergency });
    }
  }, [messages, patients, presence, emergency, user, cloudMode]);

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(''), 5000);
  }

  async function setMyPresence(status: Presence) {
    if (!user) return;

    setPresence(prev => ({ ...prev, [user]: status }));

    if (cloudMode && db) {
      try {
        await setDoc(
          doc(db, 'presence', user),
          {
            status,
            updatedAt: now(),
            name: users.find(u => u.key === user)?.name,
          },
          { merge: true }
        );
      } catch (err: any) {
        showToast(`Presence error: ${err.message}`);
      }
    }
  }

  async function sendMessage(
    workspace: WorkspaceKey,
    data: {
      text: string;
      patient?: string;
      cardLink?: string;
      canvaLink?: string;
      docsLink?: string;
      sheetsLink?: string;
      panoramaLink?: string;
      ctLink?: string;
    }
  ) {
    if (!user || !data.text.trim()) return;

    const messageData: Omit<MessageExtra, 'id'> = {
      workspace,
      author: user,
      text: data.text.trim(),
      patient: data.patient?.trim() || '',
      cardLink: data.cardLink?.trim() || '',
      canvaLink: data.canvaLink?.trim() || '',
      docsLink: data.docsLink?.trim() || '',
      sheetsLink: data.sheetsLink?.trim() || '',
      panoramaLink: data.panoramaLink?.trim() || '',
      ctLink: data.ctLink?.trim() || '',
      createdAt: now(),
    };

    if (cloudMode && db) {
      try {
        await addDoc(collection(db, 'messages'), messageData);

        if (data.patient?.trim()) {
          const patientData: Omit<PatientExtra, 'id'> = {
            workspace,
            name: data.patient.trim(),
            status: 'review',
            cardLink: data.cardLink?.trim() || '',
            canvaLink: data.canvaLink?.trim() || '',
            docsLink: data.docsLink?.trim() || '',
            sheetsLink: data.sheetsLink?.trim() || '',
            panoramaLink: data.panoramaLink?.trim() || '',
            ctLink: data.ctLink?.trim() || '',
            doctor: '',
            agent: '',
            notes: '',
            planLabel: '',
            createdAt: now(),
            updatedAt: now(),
          };

          await addDoc(collection(db, 'patients'), patientData);
        }
      } catch (err: any) {
        showToast(`Send error: ${err.message}`);
      }
    } else {
      const localMessage: MessageExtra = { id: uid(), ...messageData };
      setMessages(m => [...m, localMessage]);

      if (data.patient?.trim()) {
        const p: PatientExtra = {
          id: uid(),
          workspace,
          name: data.patient.trim(),
          status: 'review',
          cardLink: data.cardLink?.trim() || '',
          canvaLink: data.canvaLink?.trim() || '',
          docsLink: data.docsLink?.trim() || '',
          sheetsLink: data.sheetsLink?.trim() || '',
          panoramaLink: data.panoramaLink?.trim() || '',
          ctLink: data.ctLink?.trim() || '',
          doctor: '',
          agent: '',
          notes: '',
          planLabel: '',
          createdAt: now(),
          updatedAt: now(),
        };

        setPatients(pats => [p, ...pats]);
      }
    }

    if (data.text.includes('@')) {
      showToast('🔔 Mention notification');
    }
  }

  async function changePatient(id: string, status: PatientStatus) {
    if (cloudMode && db) {
      try {
        await updateDoc(doc(db, 'patients', id), {
          status,
          updatedAt: now(),
        });
      } catch (err: any) {
        showToast(`Patient error: ${err.message}`);
      }
    }

    setPatients(p =>
      p.map(x => (x.id === id ? { ...x, status, updatedAt: now() } : x))
    );
  }

  async function savePatient(id: string, patch: Partial<PatientExtra>) {
    const next = { ...patch, updatedAt: now() };

    if (cloudMode && db) {
      try {
        await updateDoc(doc(db, 'patients', id), next);
      } catch (err: any) {
        showToast(`Save error: ${err.message}`);
      }
    }

    setPatients(p => p.map(x => (x.id === id ? { ...x, ...next } : x)));
  }

  async function sendEmergency(text: string) {
    setEmergency(text);

    if (cloudMode && db) {
      try {
        await setDoc(doc(db, 'system', 'emergency'), {
          text,
          updatedAt: now(),
        });
      } catch (err: any) {
        showToast(`Emergency error: ${err.message}`);
      }
    }
  }

  async function clearEmergency() {
    setEmergency('');

    if (cloudMode && db) {
      try {
        await setDoc(doc(db, 'system', 'emergency'), {
          text: '',
          updatedAt: now(),
        });
      } catch (err: any) {
        showToast(`Emergency error: ${err.message}`);
      }
    }
  }

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();

    if (!s) return { messages, patients };

    return {
      messages: messages.filter(m =>
        [
          m.text,
          m.patient,
          m.cardLink,
          m.canvaLink,
          m.docsLink,
          m.sheetsLink,
          m.panoramaLink,
          m.ctLink,
          m.author,
          m.workspace,
        ]
          .join(' ')
          .toLowerCase()
          .includes(s)
      ),
      patients: patients.filter(p =>
        [
          p.name,
          p.phone,
          p.doctor,
          p.agent,
          p.status,
          p.workspace,
          p.cardLink,
          p.canvaLink,
          p.docsLink,
          p.sheetsLink,
          p.panoramaLink,
          p.ctLink,
          p.notes,
          p.planLabel,
        ]
          .join(' ')
          .toLowerCase()
          .includes(s)
      ),
    };
  }, [q, messages, patients]);

  if (!user) {
    return (
      <Login
        lang={lang}
        setLang={setLang}
        setUser={setUser}
        theme={theme}
        setTheme={setTheme}
      />
    );
  }

  const profile = users.find(u => u.key === user)!;
  const selectedPatient =
    patients.find(p => p.id === activePatientId) || filtered.patients[0];

  const today = new Date().toISOString().slice(0, 10);
  const createdToday = patients.filter(
    p => new Date(p.createdAt).toISOString().slice(0, 10) === today
  ).length;
  const waiting = patients.filter(
    p => p.status === 'review' || p.status === 'correction'
  ).length;
  const approved = patients.filter(p => p.status === 'approved').length;
  const sent = patients.filter(p => p.status === 'sent').length;

  return (
    <div className="df-app">
      <aside className="df-sidebar">
        <div className="df-logo">
          <div className="df-logo-icon">🦷</div>
          <div>
            <h2>DentFlow</h2>
            <span>Team Workspace</span>
          </div>
        </div>

        <div className="df-user-card">
          <div className="df-avatar">{profile.name[0]}</div>
          <div>
            <strong>{profile.name}</strong>
            <small>{roleLabel[user]}</small>
          </div>
        </div>

        <nav className="df-menu">
          <button className="active">🏠 Dashboard</button>
          <button>👤 Patients</button>
          <button>💬 Team Chats</button>
          <button>📋 Treatment Plans</button>
          <button>📎 Links & Scans</button>
          <button>📊 Reports</button>
          <button>⚙ Settings</button>
        </nav>

        <div className="df-team-box">
          <h3>👥 Team Online</h3>

          {users.map(member => (
            <div className="df-team-member" key={member.key}>
              <span className={`df-presence ${presence[member.key]}`} />
              <div>
                <strong>{member.name}</strong>
                <small>{roleLabel[member.key]}</small>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="df-workspace">
        <header className="df-header">
          <div>
            <h1>DentFlow HQ</h1>
            <p>{cloudMode ? 'Cloud sync is active' : 'Local demo mode'}</p>
          </div>

          <div className="df-search">
            <span>🔎</span>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search patient, doctor, agent, Canva, Docs, scans, messages..."
            />
          </div>

          <div className="df-controls">
            <select
              value={presence[user]}
              onChange={e => setMyPresence(e.target.value as Presence)}
            >
              <option value="here">🟢 Я здесь</option>
              <option value="break">☕ Перерыв</option>
              <option value="lunch">🍽️ Обед</option>
              <option value="busy">📞 Занят</option>
              <option value="finished">🌙 Закончил работу</option>
            </select>

            <select
              value={lang}
              onChange={e => setLang(e.target.value as Lang)}
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="tr">Türkçe</option>
              <option value="fa">עברית</option>
            </select>

            <select value={theme} onChange={e => setTheme(e.target.value)}>
              <option value="paper">Paper</option>
              <option value="forest">Forest</option>
              <option value="ocean">Ocean</option>
              <option value="sakura">Sakura</option>
              <option value="night">Night</option>
            </select>

            <button onClick={() => setUser(null)}>Exit</button>
          </div>
        </header>

        <section className="df-stats">
          <div>
            <span>Today</span>
            <strong>{createdToday}</strong>
            <small>new patients</small>
          </div>

          <div>
            <span>Waiting</span>
            <strong>{waiting}</strong>
            <small>doctor / correction</small>
          </div>

          <div>
            <span>Approved</span>
            <strong>{approved}</strong>
            <small>plans ready</small>
          </div>

          <div>
            <span>Sent</span>
            <strong>{sent}</strong>
            <small>sent to agent</small>
          </div>
        </section>

        <section className="df-main">
          <div className="df-chats">
            {workspaces.map(ws => (
              <ChatColumn
                key={ws}
                workspace={ws}
                currentUser={user}
                messages={filtered.messages.filter(m => m.workspace === ws)}
                patients={filtered.patients.filter(p => p.workspace === ws)}
                presence={presence[ws]}
                onSend={sendMessage}
                onStatus={changePatient}
                onSelectPatient={setActivePatientId}
              />
            ))}
          </div>

          <aside className="df-right-panel">
            <PatientPanel
              patient={selectedPatient}
              onSave={savePatient}
              onEmergency={sendEmergency}
              user={user}
              messages={messages}
              patients={patients}
            />
          </aside>
        </section>
      </section>

      {emergency && (
        <div className="alert">
          <div className="alertbox">
            <h2>🚨 Important</h2>
            <p>{emergency}</p>
            <button onClick={clearEmergency}>I have read it</button>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">
          <span className="emoji">🔔</span>
          {toast}
        </div>
      )}
    </div>
  );
}

function Login({
  lang,
  setLang,
  setUser,
  theme,
  setTheme,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  setUser: (u: UserKey) => void;
  theme: string;
  setTheme: (s: string) => void;
}) {
  const t = copy[lang];
  const [scene, setScene] = useState(0);

  useEffect(() => {
    setScene(Math.floor(Math.random() * 3));
  }, []);

  return (
    <div className="login" data-theme={theme}>
      <div className="welcome">
        <div className="scene">
          {scene === 0 && (
            <>
              <div className="sun" />
              <div className="cloud" />
              <div className="cloud c2" />
            </>
          )}

          {scene === 1 && (
            <>
              <div className="balloon b1">🎈</div>
              <div className="balloon b2">🎈</div>
            </>
          )}

          {scene === 2 && (
            <div style={{ fontSize: 82, paddingTop: 20 }}>🐶</div>
          )}
        </div>

        <h1>{t.welcome} ☀️</h1>
        <p>{t.subtitle}</p>

        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            marginTop: 14,
          }}
        >
          <select
            className="pill"
            value={lang}
            onChange={e => setLang(e.target.value as Lang)}
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
            <option value="tr">Türkçe</option>
            <option value="fa">עברית</option>
          </select>

          <select
            className="pill"
            value={theme}
            onChange={e => setTheme(e.target.value)}
          >
            <option value="paper">Paper</option>
            <option value="forest">Forest</option>
            <option value="ocean">Ocean</option>
            <option value="sakura">Sakura</option>
            <option value="night">Night</option>
          </select>
        </div>

        <div className="login-actions">
          <button onClick={() => setUser('valeriia')}>🌱 Valeriia</button>
          <button onClick={() => setUser('manager')}>Quality Control</button>
          <button onClick={() => setUser('behnia')}>Behnia</button>
          <button onClick={() => setUser('ilayda')}>İlayda</button>
        </div>
      </div>
    </div>
  );
}

function ChatColumn({
  workspace,
  currentUser,
  messages,
  patients,
  presence,
  onSend,
  onStatus,
  onSelectPatient,
}: {
  workspace: WorkspaceKey;
  currentUser: UserKey;
  messages: MessageExtra[];
  patients: PatientExtra[];
  presence: Presence;
  onSend: (w: WorkspaceKey, d: any) => void;
  onStatus: (id: string, s: PatientStatus) => void;
  onSelectPatient: (id: string) => void;
}) {
  const [text, setText] = useState('');
  const [patient, setPatient] = useState('');
  const [card, setCard] = useState('');
  const [canva, setCanva] = useState('');
  const [docs, setDocs] = useState('');
  const [sheets, setSheets] = useState('');
  const [panorama, setPanorama] = useState('');
  const [ct, setCt] = useState('');

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages.length]);

  function submit() {
    onSend(workspace, {
      text,
      patient,
      cardLink: card,
      canvaLink: canva,
      docsLink: docs,
      sheetsLink: sheets,
      panoramaLink: panorama,
      ctLink: ct,
    });

    setText('');
    setPatient('');
    setCard('');
    setCanva('');
    setDocs('');
    setSheets('');
    setPanorama('');
    setCt('');
  }

  const statusClass =
    presence === 'break' || presence === 'lunch'
      ? 'break'
      : presence === 'busy'
        ? 'busy'
        : presence === 'finished'
          ? 'off'
          : '';

  return (
    <section className="df-chat-card">
      <div className="df-chat-head">
        <div>
          <h2>{workspaceLabel[workspace]}</h2>
          <span>
            <i className={`statusdot ${statusClass}`} />
            {presenceLabels[presence]}
          </span>
        </div>

        <small>{messages.length} messages</small>
      </div>

      <div className="df-patient-row">
        {patients.slice(0, 6).map(p => (
          <button
            key={p.id}
            className={`patientchip ${
              p.status === 'approved'
                ? 'approved'
                : p.status === 'sent'
                  ? 'sent'
                  : 'review'
            }`}
            onClick={() => onSelectPatient(p.id)}
          >
            {p.name} • {statusLabels[p.status]}
          </button>
        ))}
      </div>

      <div className="messages" ref={bodyRef}>
        {messages.map(m => (
          <div
            key={m.id}
            className={`msg ${m.author === currentUser ? 'mine' : ''}`}
          >
            <div className="bubble">
              <div className="meta">
                {m.author} • {fmt(m.createdAt)}{' '}
                {m.patient ? `• ${m.patient}` : ''}
              </div>

              <div className="text">{m.text}</div>

              {(m.cardLink ||
                m.canvaLink ||
                m.docsLink ||
                m.sheetsLink ||
                m.panoramaLink ||
                m.ctLink) && (
                <div className="links">
                  {m.cardLink && (
                    <a className="linkbtn" href={m.cardLink} target="_blank">
                      📄 Card
                    </a>
                  )}
                  {m.canvaLink && (
                    <a className="linkbtn" href={m.canvaLink} target="_blank">
                      🎨 Canva
                    </a>
                  )}
                  {m.docsLink && (
                    <a className="linkbtn" href={m.docsLink} target="_blank">
                      📝 Docs
                    </a>
                  )}
                  {m.sheetsLink && (
                    <a className="linkbtn" href={m.sheetsLink} target="_blank">
                      📊 Sheets
                    </a>
                  )}
                  {m.panoramaLink && (
                    <a className="linkbtn" href={m.panoramaLink} target="_blank">
                      🦷 Panorama
                    </a>
                  )}
                  {m.ctLink && (
                    <a className="linkbtn" href={m.ctLink} target="_blank">
                      🧠 CT
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="df-composer">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Message... Use @Valeriia / @Behnia / @İlayda"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />

        <div className="df-link-grid">
          <input value={patient} onChange={e => setPatient(e.target.value)} placeholder="Patient" />
          <input value={card} onChange={e => setCard(e.target.value)} placeholder="Patient card" />
          <input value={canva} onChange={e => setCanva(e.target.value)} placeholder="Canva" />
          <input value={docs} onChange={e => setDocs(e.target.value)} placeholder="Google Docs" />
          <input value={sheets} onChange={e => setSheets(e.target.value)} placeholder="Google Sheets" />
          <input value={panorama} onChange={e => setPanorama(e.target.value)} placeholder="Panorama" />
          <input value={ct} onChange={e => setCt(e.target.value)} placeholder="CT / Tomography" />
          <button onClick={submit}>Send</button>
        </div>
      </div>
    </section>
  );
}

function PatientPanel({
  patient,
  onSave,
  onEmergency,
  user,
  messages,
  patients,
}: {
  patient?: PatientExtra;
  onSave: (id: string, p: Partial<PatientExtra>) => void;
  onEmergency: (s: string) => void;
  user: UserKey;
  messages: MessageExtra[];
  patients: PatientExtra[];
}) {
  const [em, setEm] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  function download(name: string, text: string, type = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function report() {
    const rows = [
      [
        'Patient',
        'Doctor',
        'Agent',
        'Status',
        'Canva',
        'Docs',
        'Sheets',
        'Panorama',
        'CT',
        'Notes',
      ],
      ...patients.map(p => [
        p.name,
        p.doctor || '',
        p.agent || '',
        p.status,
        p.canvaLink || '',
        p.docsLink || '',
        p.sheetsLink || '',
        p.panoramaLink || '',
        p.ctLink || '',
        p.notes || '',
      ]),
    ];

    download(
      `DentFlow_Report_${today}.csv`,
      rows.map(r => r.join(',')).join('\n'),
      'text/csv'
    );
  }

  function backup() {
    download(
      `DentFlow_Backup_${today}.json`,
      JSON.stringify(
        {
          patients,
          messages,
          exportedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'application/json'
    );
  }

  return (
    <>
      <div className="card">
        <h3>Patient Card</h3>

        {!patient && <p className="muted">Select or create a patient from chat.</p>}

        {patient && (
          <div className="df-patient-form">
            <input
              value={patient.name || ''}
              onChange={e => onSave(patient.id, { name: e.target.value })}
              placeholder="Patient name"
            />

            <input
              value={patient.doctor || ''}
              onChange={e => onSave(patient.id, { doctor: e.target.value })}
              placeholder="Doctor"
            />

            <input
              value={patient.agent || ''}
              onChange={e => onSave(patient.id, { agent: e.target.value })}
              placeholder="Agent"
            />

            <input
              value={patient.planLabel || ''}
              onChange={e => onSave(patient.id, { planLabel: e.target.value })}
              placeholder="Plan label / short note"
            />

            <input
              value={patient.cardLink || ''}
              onChange={e => onSave(patient.id, { cardLink: e.target.value })}
              placeholder="Patient card"
            />

            <input
              value={patient.canvaLink || ''}
              onChange={e => onSave(patient.id, { canvaLink: e.target.value })}
              placeholder="Canva"
            />

            <input
              value={patient.docsLink || ''}
              onChange={e => onSave(patient.id, { docsLink: e.target.value })}
              placeholder="Google Docs"
            />

            <input
              value={patient.sheetsLink || ''}
              onChange={e => onSave(patient.id, { sheetsLink: e.target.value })}
              placeholder="Google Sheets"
            />

            <input
              value={patient.panoramaLink || ''}
              onChange={e => onSave(patient.id, { panoramaLink: e.target.value })}
              placeholder="Panorama"
            />

            <input
              value={patient.ctLink || ''}
              onChange={e => onSave(patient.id, { ctLink: e.target.value })}
              placeholder="CT / Tomography"
            />

            <textarea
              value={patient.notes || ''}
              onChange={e => onSave(patient.id, { notes: e.target.value })}
              placeholder="Notes"
            />

            <select
              value={patient.status}
              onChange={e =>
                onSave(patient.id, { status: e.target.value as PatientStatus })
              }
            >
              <option value="review">Review / Waiting</option>
              <option value="correction">Correction</option>
              <option value="approved">Approved</option>
              <option value="sent">Sent to agent</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Plan Workflow</h3>
        <p className="muted">
          Manager checks the case, planner prepares the plan, then status changes to Approved or Sent.
        </p>
      </div>

      {user === 'valeriia' && (
        <>
          <div className="card">
            <h3>Reports</h3>
            <button onClick={report}>📊 CSV Report</button>
            <button onClick={backup}>💾 JSON Backup</button>
          </div>

          <div className="card">
            <h3>Emergency</h3>
            <input
              value={em}
              onChange={e => setEm(e.target.value)}
              placeholder="Important message for all"
            />
            <button
              onClick={() => {
                onEmergency(em);
                setEm('');
              }}
            >
              Send Emergency
            </button>
          </div>
        </>
      )}
    </>
  );
}

function seedData() {
  const patients: PatientExtra[] = [
    {
      id: uid(),
      workspace: 'valeriia',
      name: 'Amit Rozeman',
      status: 'review',
      doctor: 'Altug',
      agent: 'Sima',
      cardLink: '',
      canvaLink: '',
      docsLink: '',
      sheetsLink: '',
      panoramaLink: '',
      ctLink: '',
      notes: 'Waiting for doctor response',
      createdAt: now() - 4500000,
      updatedAt: now() - 4500000,
    },
  ];

  const messages: MessageExtra[] = [
    {
      id: uid(),
      workspace: 'valeriia',
      author: 'valeriia',
      text: 'New patient. Please check the plan.',
      patient: 'Amit Rozeman',
      createdAt: now() - 4300000,
    },
  ];

  return {
    patients,
    messages,
    presence: {
      valeriia: 'here',
      behnia: 'here',
      ilayda: 'break',
      manager: 'here',
    },
    emergency: '',
  };
}
