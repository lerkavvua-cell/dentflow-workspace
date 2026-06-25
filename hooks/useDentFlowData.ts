'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, ensureFirebaseAuth, firebaseReady, storage } from '@/lib/firebase';
import { normalizePatientId, users } from '@/lib/dentflow';
import type { ComposerDraft, FileMeta, LastSeenMap, Message, OnlineMap, Patient, PatientStatus, Presence, SystemNotice, TaskItem, UserKey, WorkspaceKey } from '@/types';

const localKey = 'dentflow-v3-local-fallback';
const archiveKey = 'dentflow-v3-local-archive';
const now = () => Date.now();
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

type LocalData = {
  messages: Message[];
  patients: Patient[];
  tasks: TaskItem[];
  presence: Record<UserKey, Presence>;
  online: OnlineMap;
  lastSeen: LastSeenMap;
  emergency: string;
  notices: SystemNotice[];
};

const defaultPresence: Record<UserKey, Presence> = {
  valeriia: 'here',
  behnia: 'here',
  ilayda: 'here',
  manager: 'here'
};

const defaultOnline: OnlineMap = {
  valeriia: false,
  behnia: false,
  ilayda: false,
  manager: false
};

const defaultLastSeen: LastSeenMap = {
  valeriia: 0,
  behnia: 0,
  ilayda: 0,
  manager: 0
};

function loadLocal(): LocalData | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(localKey) || 'null');
  } catch {
    return null;
  }
}

function saveLocal(data: LocalData) {
  if (typeof window !== 'undefined') localStorage.setItem(localKey, JSON.stringify(data));
}

function saveArchive(data: Pick<LocalData, 'messages' | 'patients' | 'tasks'>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(archiveKey, JSON.stringify({ ...data, savedAt: now() }));
}

const cleanData = <T,>(data: T): T => {
  if (Array.isArray(data)) return data.map(item => cleanData(item)).filter(item => item !== undefined) as T;
  if (!data || typeof data !== 'object') return data;
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, cleanData(value)])
  ) as T;
};

function seedData(): LocalData {
  const createdAt = now() - 1200000;
  const patients: Patient[] = [
    {
      id: 'valeriia-demo-patient',
      workspace: 'valeriia',
      name: 'Amit Rozeman',
      status: 'review',
      doctor: 'Altug',
      agent: 'Sima',
      cardLink: '',
      canvaLink: '',
      notes: 'Waiting for doctor response',
      createdAt,
      updatedAt: createdAt
    }
  ];

  return {
    patients,
    tasks: [],
    messages: [
      {
        id: 'demo-message',
        workspace: 'valeriia',
        author: 'valeriia',
        text: 'New patient. Please check the plan.',
        patient: 'Amit Rozeman',
        createdAt
      }
    ],
    presence: defaultPresence,
    online: defaultOnline,
    lastSeen: defaultLastSeen,
    emergency: '',
    notices: []
  };
}

function toMillis(value: unknown) {
  if (typeof value === 'number') return value;
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return now();
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const map = new Map(current.map(item => [item.id, item]));
  incoming.forEach(item => {
    map.set(item.id, { ...(map.get(item.id) || {}), ...item });
  });
  return Array.from(map.values());
}

function byCreatedAt(a: { createdAt: number }, b: { createdAt: number }) {
  return a.createdAt - b.createdAt;
}

function byUpdatedAtDesc(a: { updatedAt: number }, b: { updatedAt: number }) {
  return b.updatedAt - a.updatedAt;
}

export function useDentFlowData(user: UserKey | null, onError: (message: string) => void) {
  const cloudMode = firebaseReady && Boolean(db);
  const [messages, setMessages] = useState<Message[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [presence, setPresence] = useState<Record<UserKey, Presence>>(defaultPresence);
  const [online, setOnline] = useState<OnlineMap>(defaultOnline);
  const [lastSeen, setLastSeen] = useState<LastSeenMap>(defaultLastSeen);
  const [emergency, setEmergency] = useState('');
  const [notices, setNotices] = useState<SystemNotice[]>([]);

  useEffect(() => {
    if (!user) return;

    const cached = loadLocal();
    if (cached) {
      setMessages(cached.messages || []);
      setPatients(cached.patients || []);
      setTasks(cached.tasks || []);
      setPresence(cached.presence || defaultPresence);
      setOnline(cached.online || defaultOnline);
      setLastSeen(cached.lastSeen || defaultLastSeen);
      setEmergency(cached.emergency || '');
      setNotices(cached.notices || []);
    }

    if (cloudMode && db) {
      let closed = false;
      let cleanup: (() => void) | undefined;
      ensureFirebaseAuth().then(() => {
        if (closed || !db) return;

        const unsubMessages = onSnapshot(
          query(collection(db, 'messages'), orderBy('createdAt', 'asc')),
          snap => {
            if (snap.empty) return;
            const cloudMessages = snap.docs.map(item => {
                const data = item.data() as Message;
                return { ...data, id: item.id, createdAt: toMillis(data.createdAt) };
              });
            setMessages(prev => mergeById(prev, cloudMessages).sort(byCreatedAt));
          },
          err => onError(`messages: ${err.message}`)
        );

        const unsubPatients = onSnapshot(
          query(collection(db, 'patients'), orderBy('updatedAt', 'desc')),
          snap => {
            if (snap.empty) return;
            const cloudPatients = snap.docs.map(item => {
                const data = item.data() as Patient;
                return {
                  ...data,
                  id: item.id,
                  createdAt: toMillis(data.createdAt),
                  updatedAt: toMillis(data.updatedAt)
                };
              });
            setPatients(prev => mergeById(prev, cloudPatients).sort(byUpdatedAtDesc));
          },
          err => onError(`patients: ${err.message}`)
        );

        const unsubPresence = onSnapshot(
          collection(db, 'presence'),
          snap => {
            const next = { ...defaultPresence };
            const nextOnline = { ...defaultOnline };
            const nextLastSeen = { ...defaultLastSeen };
            const freshAfter = now() - 45000;
            snap.docs.forEach(item => {
              const key = item.id as UserKey;
              if (!users.some(profile => profile.key === key)) return;
              const data = item.data();
              const lastSeenAt = toMillis(data.lastSeen);
              next[key] = (data.status as Presence) || 'here';
              nextLastSeen[key] = lastSeenAt;
              nextOnline[key] = Boolean(data.online) && lastSeenAt > freshAfter;
            });
            setPresence(next);
            setOnline(nextOnline);
            setLastSeen(nextLastSeen);
          },
          err => onError(`presence: ${err.message}`)
        );

        const unsubTasks = onSnapshot(
          query(collection(db, 'tasks'), orderBy('createdAt', 'asc')),
          snap => {
            if (snap.empty) return;
            const cloudTasks = snap.docs.map(item => {
                const data = item.data() as TaskItem;
                return {
                  ...data,
                  id: item.id,
                  createdAt: toMillis(data.createdAt),
                  completedAt: data.completedAt ? toMillis(data.completedAt) : undefined
                };
              });
            setTasks(prev => mergeById(prev, cloudTasks).sort(byCreatedAt));
          },
          err => onError(`tasks: ${err.message}`)
        );

        const unsubEmergency = onSnapshot(
          doc(db, 'system', 'emergency'),
          snap => setEmergency((snap.data()?.text as string) || ''),
          err => onError(`system/emergency: ${err.message}`)
        );

        const unsubNotices = onSnapshot(
          query(collection(db, 'systemNotices'), orderBy('createdAt', 'desc')),
          snap => {
            if (snap.empty) return;
            setNotices(
              snap.docs.map(item => {
                const data = item.data() as SystemNotice;
                return { ...data, id: item.id, createdAt: toMillis(data.createdAt) };
              })
            );
          },
          err => onError(`systemNotices: ${err.message}`)
        );

        cleanup = () => {
          unsubMessages();
          unsubPatients();
          unsubPresence();
          unsubTasks();
          unsubEmergency();
          unsubNotices();
        };
      });

      return () => {
        closed = true;
        cleanup?.();
      };
    }

    const data = cached || seedData();
    setMessages(data.messages);
    setPatients(data.patients);
    setTasks(data.tasks || []);
    setPresence(data.presence);
    setOnline({ ...(data.online || defaultOnline), [user]: true });
    setLastSeen({ ...(data.lastSeen || defaultLastSeen), [user]: now() });
    setEmergency(data.emergency || '');
    setNotices(data.notices || []);

    const timer = window.setInterval(() => {
      const next = loadLocal();
      if (!next) return;
      setMessages(next.messages);
      setPatients(next.patients);
      setTasks(next.tasks || []);
      setPresence(next.presence);
      setOnline({ ...(next.online || defaultOnline), [user]: true });
      setLastSeen({ ...(next.lastSeen || defaultLastSeen), [user]: now() });
      setEmergency(next.emergency || '');
      setNotices(next.notices || []);
    }, 800);

    return () => window.clearInterval(timer);
  }, [cloudMode, onError, user]);

  useEffect(() => {
    if (!user) return;
    saveLocal({ messages, patients, tasks, presence, online, lastSeen, emergency, notices });
  }, [emergency, lastSeen, messages, notices, online, patients, presence, tasks, user]);

  useEffect(() => {
    if (!user) return;
    saveArchive({ messages, patients, tasks });
  }, [messages, patients, tasks, user]);

  useEffect(() => {
    if (!user) return;

    const markOnline = async (isOnline: boolean) => {
      const seenAt = now();
      setOnline(prev => ({ ...prev, [user]: isOnline }));
      setLastSeen(prev => ({ ...prev, [user]: seenAt }));

      if (!cloudMode || !db) return;
      try {
        await ensureFirebaseAuth();
        await setDoc(
          doc(db, 'presence', user),
          cleanData({
            status: presence[user] || 'here',
            online: isOnline,
            lastSeen: seenAt,
            name: users.find(item => item.key === user)?.name || user
          }),
          { merge: true }
        );
      } catch {
        // Presence should never block chat or patient work.
      }
    };

    void markOnline(true);
    const timer = window.setInterval(() => void markOnline(true), 15000);
    const leave = () => void markOnline(false);
    window.addEventListener('pagehide', leave);
    window.addEventListener('beforeunload', leave);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('beforeunload', leave);
      void markOnline(false);
    };
  }, [cloudMode, presence[user || 'valeriia'], user]);

  const completePatientTasks = useCallback(
    async (patient: Pick<Patient, 'name' | 'workspace'>) => {
      const patientName = patient.name.trim().toLowerCase();
      if (!patientName) return;
      const completedAt = now();

      setTasks(prev =>
        prev.map(task =>
          task.workspace === patient.workspace && task.patientName.trim().toLowerCase() === patientName
            ? { ...task, done: true, completedAt }
            : task
        )
      );

      if (cloudMode && db) {
        try {
          await ensureFirebaseAuth();
          const taskQuery = query(
            collection(db, 'tasks'),
            where('workspace', '==', patient.workspace),
            where('patientNameKey', '==', patientName)
          );
          const taskSnap = await getDocs(taskQuery);
          await Promise.all(taskSnap.docs.map(item => updateDoc(doc(db, 'tasks', item.id), cleanData({ done: true, completedAt }))));
        } catch (err) {
          onError(`tasks: ${(err as Error).message}`);
        }
      }
    },
    [cloudMode, onError]
  );

  const setMyPresence = useCallback(
    async (status: Presence) => {
      if (!user) return;
      setPresence(prev => ({ ...prev, [user]: status }));

      if (cloudMode && db) {
        try {
          await ensureFirebaseAuth();
          await setDoc(
            doc(db, 'presence', user),
            cleanData({ status, online: true, lastSeen: now(), name: users.find(item => item.key === user)?.name || user, updatedAt: now() }),
            { merge: true }
          );
        } catch (err) {
          onError(`presence: ${(err as Error).message}`);
        }
      }
    },
    [cloudMode, onError, user]
  );

  const setMeOffline = useCallback(async () => {
    if (!user) return;
    const seenAt = now();
    setOnline(prev => ({ ...prev, [user]: false }));
    setLastSeen(prev => ({ ...prev, [user]: seenAt }));

    if (cloudMode && db) {
      try {
        await ensureFirebaseAuth();
        await setDoc(doc(db, 'presence', user), cleanData({ online: false, lastSeen: seenAt, updatedAt: seenAt }), { merge: true });
      } catch {
        // Exit should stay fast even if the network is slow.
      }
    }
  }, [cloudMode, user]);

  const upsertPatient = useCallback(
    async (workspace: WorkspaceKey, draft: ComposerDraft) => {
      const name = draft.patient?.trim();
      if (!name) return;

      const id = normalizePatientId(workspace, name);
      const createdAt = now();
      const patch = {
        workspace,
        name,
        status: 'review' as PatientStatus,
        cardLink: draft.cardLink?.trim() || '',
        canvaLink: draft.canvaLink?.trim() || '',
        updatedAt: createdAt
      };

      setPatients(prev => {
        const current = prev.find(item => item.id === id);
        if (current) return prev.map(item => (item.id === id ? { ...item, ...patch } : item));
        return [{ id, ...patch, doctor: '', agent: '', notes: '', createdAt }, ...prev];
      });

      if (cloudMode && db) {
        try {
          await ensureFirebaseAuth();
          const refDoc = doc(db, 'patients', id);
          await setDoc(
            refDoc,
            cleanData({
              ...patch,
              createdAt
            }),
            { merge: true }
          );
        } catch (err) {
          onError(`patient create: ${(err as Error).message}`);
        }
      }
    },
    [cloudMode, onError]
  );

  const addSystemNotice = useCallback(
    async (type: SystemNotice['type'], text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const noticeData = { type, text: trimmed, createdAt: now() };
      if (cloudMode && db) {
        try {
          await ensureFirebaseAuth();
          const saved = await addDoc(collection(db, 'systemNotices'), cleanData(noticeData));
          setNotices(prev => (prev.some(item => item.id === saved.id) ? prev : [{ id: saved.id, ...noticeData }, ...prev].slice(0, 30)));
          return;
        } catch (err) {
          onError(`systemNotices: ${(err as Error).message}`);
        }
      }
      setNotices(prev => [{ id: uid(), ...noticeData }, ...prev].slice(0, 30));
    },
    [cloudMode, onError]
  );

  const sendMessage = useCallback(
    async (workspace: WorkspaceKey, draft: ComposerDraft) => {
      const hasPayload =
        Boolean(draft.text.trim()) ||
        Boolean(draft.patient?.trim()) ||
        Boolean(draft.cardLink?.trim()) ||
        Boolean(draft.canvaLink?.trim()) ||
        Boolean(draft.file);
      if (!user || !hasPayload) return;

      let file: FileMeta | undefined;
      if (draft.file) {
        file = {
          fileName: draft.file.name,
          fileType: draft.file.type,
          fileSize: draft.file.size
        };
      }

      const messageId = uid();
      const patientName = draft.patient?.trim() || '';
      const hasMaterial = Boolean(draft.canvaLink?.trim()) || Boolean(draft.cardLink?.trim());
      const messageData: Omit<Message, 'id'> = {
        workspace,
        author: user,
        text: draft.text.trim() || (hasMaterial && patientName ? `${patientName} · Material link` : hasMaterial ? 'Material link' : draft.file ? 'File attached' : 'Patient update'),
        patient: patientName,
        cardLink: draft.cardLink?.trim() || '',
        canvaLink: draft.canvaLink?.trim() || '',
        file,
        createdAt: now(),
        syncState: cloudMode ? 'pending' : 'local'
      };
      const cleanMessageData = cleanData(messageData);
      setMessages(prev => [...prev, { id: messageId, ...cleanMessageData }]);
      void upsertPatient(workspace, draft);

      if (cloudMode && db) {
        void (async () => {
          try {
          await ensureFirebaseAuth();
            let uploadedFile = file;
            if (draft.file && storage) {
              const storageRef = ref(storage, `attachments/${workspace}/${Date.now()}-${draft.file.name}`);
              const uploaded = await uploadBytes(storageRef, draft.file);
              uploadedFile = { ...file, fileUrl: await getDownloadURL(uploaded.ref) } as FileMeta;
            }
            await setDoc(
              doc(db, 'messages', messageId),
              cleanData({
                ...messageData,
                file: uploadedFile,
                syncState: 'saved'
              }),
              { merge: true }
            );
            setMessages(prev =>
              prev.map(message =>
                message.id === messageId ? { ...message, file: uploadedFile, syncState: 'saved' } : message
              )
            );
          } catch (err) {
            onError(`send: ${(err as Error).message}`);
            setMessages(prev => prev.map(message => (message.id === messageId ? { ...message, syncState: 'local' } : message)));
          }
        })();
      }
    },
    [cloudMode, onError, upsertPatient, user]
  );

  const deleteMessage = useCallback(
    async (id: string) => {
      if (!user) return;
      const patch = cleanData({
        text: 'Сообщение удалено',
        patient: '',
        cardLink: '',
        canvaLink: '',
        file: null,
        deleted: true,
        deletedAt: now(),
        deletedBy: user
      });

      setMessages(prev => prev.map(message => (message.id === id ? { ...message, ...patch } : message)));

      if (cloudMode && db) {
        try {
          await ensureFirebaseAuth();
          await updateDoc(doc(db, 'messages', id), patch);
        } catch (err) {
          onError(`delete message: ${(err as Error).message}`);
        }
      }
    },
    [cloudMode, onError, user]
  );

  const savePatient = useCallback(
    async (id: string, patch: Partial<Patient>) => {
      const next = { ...patch, updatedAt: now() };
      setPatients(prev => prev.map(item => (item.id === id ? { ...item, ...next } : item)));

      if (cloudMode && db) {
        try {
          await ensureFirebaseAuth();
          await updateDoc(doc(db, 'patients', id), cleanData(next));
        } catch (err) {
          onError(`patient: ${(err as Error).message}`);
        }
      }

      const patient = patients.find(item => item.id === id);
      const status = patch.status;
      if (patient && (status === 'approved' || status === 'sent' || status === 'archived')) {
        await completePatientTasks({ ...patient, ...patch });
        if (status === 'approved') {
          await addSystemNotice('info', `Doctor approved ${patient.name}. Ready to send.`);
        }
      }
    },
    [addSystemNotice, cloudMode, completePatientTasks, onError, patients]
  );

  const addTask = useCallback(
    async (workspace: WorkspaceKey, patientName: string, text: string, materialLink?: string) => {
      if (!user || !patientName.trim() || (!text.trim() && !materialLink?.trim())) return;
      const patientNameKey = patientName.trim().toLowerCase();
      const taskData = {
        workspace,
        assignedTo: workspace,
        patientName: patientName.trim(),
        patientNameKey,
        text: text.trim() || materialLink?.trim() || 'Material',
        materialLink: materialLink?.trim() || '',
        done: false,
        createdAt: now()
      };

      if (cloudMode && db) {
        try {
          await ensureFirebaseAuth();
          const saved = await addDoc(collection(db, 'tasks'), cleanData(taskData));
          setTasks(prev => (prev.some(item => item.id === saved.id) ? prev : [...prev, { id: saved.id, ...taskData }]));
          return;
        } catch (err) {
          onError(`tasks: ${(err as Error).message}`);
        }
      }

      setTasks(prev => [...prev, { id: uid(), ...taskData }]);
    },
    [cloudMode, onError, user]
  );

  const completeTask = useCallback(
    async (id: string) => {
      const completedAt = now();
      setTasks(prev => prev.map(task => (task.id === id ? { ...task, done: true, completedAt } : task)));

      if (cloudMode && db) {
        try {
          await ensureFirebaseAuth();
          await updateDoc(doc(db, 'tasks', id), cleanData({ done: true, completedAt }));
        } catch (err) {
          onError(`tasks: ${(err as Error).message}`);
        }
      }
    },
    [cloudMode, onError]
  );

  const setSystemEmergency = useCallback(
    async (text: string) => {
      setEmergency(text);
      await addSystemNotice('warning', text);
      if (cloudMode && db) {
        try {
          await ensureFirebaseAuth();
          await setDoc(doc(db, 'system', 'emergency'), cleanData({ text, updatedAt: now() }), { merge: true });
        } catch (err) {
          onError(`system/emergency: ${(err as Error).message}`);
        }
      }
    },
    [addSystemNotice, cloudMode, onError]
  );

  return useMemo(
    () => ({
      cloudMode,
      messages,
      patients,
      tasks,
      presence,
      online,
      lastSeen,
      emergency,
      notices,
      sendMessage,
      deleteMessage,
      savePatient,
      addTask,
      completeTask,
      setMyPresence,
      setMeOffline,
      setSystemEmergency,
      addSystemNotice
    }),
    [addSystemNotice, addTask, cloudMode, completeTask, deleteMessage, emergency, lastSeen, messages, notices, online, patients, presence, savePatient, sendMessage, setMeOffline, setMyPresence, setSystemEmergency, tasks]
  );
}
