'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, firebaseReady, storage } from '@/lib/firebase';
import { normalizePatientId, users } from '@/lib/dentflow';
import type { ComposerDraft, FileMeta, Message, Patient, PatientStatus, Presence, TaskItem, UserKey, WorkspaceKey } from '@/types';

const localKey = 'dentflow-v3-local-fallback';
const archiveKey = 'dentflow-v3-local-archive';
const now = () => Date.now();
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

type LocalData = {
  messages: Message[];
  patients: Patient[];
  tasks: TaskItem[];
  presence: Record<UserKey, Presence>;
  emergency: string;
};

const defaultPresence: Record<UserKey, Presence> = {
  valeriia: 'here',
  behnia: 'here',
  ilayda: 'here',
  manager: 'here'
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
    emergency: ''
  };
}

function toMillis(value: unknown) {
  if (typeof value === 'number') return value;
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return now();
}

export function useDentFlowData(user: UserKey | null, onError: (message: string) => void) {
  const cloudMode = firebaseReady && Boolean(db);
  const [messages, setMessages] = useState<Message[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [presence, setPresence] = useState<Record<UserKey, Presence>>(defaultPresence);
  const [emergency, setEmergency] = useState('');

  useEffect(() => {
    if (!user) return;

    if (cloudMode && db) {
      const unsubMessages = onSnapshot(
        query(collection(db, 'messages'), orderBy('createdAt', 'asc')),
        snap => {
          setMessages(
            snap.docs.map(item => {
              const data = item.data() as Message;
              return { ...data, id: item.id, createdAt: toMillis(data.createdAt) };
            })
          );
        },
        err => onError(`messages: ${err.message}`)
      );

      const unsubPatients = onSnapshot(
        query(collection(db, 'patients'), orderBy('updatedAt', 'desc')),
        snap => {
          setPatients(
            snap.docs.map(item => {
              const data = item.data() as Patient;
              return {
                ...data,
                id: item.id,
                createdAt: toMillis(data.createdAt),
                updatedAt: toMillis(data.updatedAt)
              };
            })
          );
        },
        err => onError(`patients: ${err.message}`)
      );

      const unsubPresence = onSnapshot(
        collection(db, 'presence'),
        snap => {
          const next = { ...defaultPresence };
          snap.docs.forEach(item => {
            const key = item.id as UserKey;
            if (users.some(profile => profile.key === key)) next[key] = item.data().status as Presence;
          });
          setPresence(next);
        },
        err => onError(`presence: ${err.message}`)
      );

      const unsubTasks = onSnapshot(
        query(collection(db, 'tasks'), orderBy('createdAt', 'asc')),
        snap => {
          setTasks(
            snap.docs.map(item => {
              const data = item.data() as TaskItem;
              return {
                ...data,
                id: item.id,
                createdAt: toMillis(data.createdAt),
                completedAt: data.completedAt ? toMillis(data.completedAt) : undefined
              };
            })
          );
        },
        err => onError(`tasks: ${err.message}`)
      );

      const unsubEmergency = onSnapshot(
        doc(db, 'system', 'emergency'),
        snap => setEmergency((snap.data()?.text as string) || ''),
        err => onError(`system/emergency: ${err.message}`)
      );

      return () => {
        unsubMessages();
        unsubPatients();
        unsubPresence();
        unsubTasks();
        unsubEmergency();
      };
    }

    const data = loadLocal() || seedData();
    setMessages(data.messages);
    setPatients(data.patients);
    setTasks(data.tasks || []);
    setPresence(data.presence);
    setEmergency(data.emergency || '');

    const timer = window.setInterval(() => {
      const next = loadLocal();
      if (!next) return;
      setMessages(next.messages);
      setPatients(next.patients);
      setTasks(next.tasks || []);
      setPresence(next.presence);
      setEmergency(next.emergency || '');
    }, 800);

    return () => window.clearInterval(timer);
  }, [cloudMode, onError, user]);

  useEffect(() => {
    if (!user || cloudMode) return;
    saveLocal({ messages, patients, tasks, presence, emergency });
  }, [cloudMode, emergency, messages, patients, presence, tasks, user]);

  useEffect(() => {
    if (!user) return;
    saveArchive({ messages, patients, tasks });
  }, [messages, patients, tasks, user]);

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
          const taskQuery = query(
            collection(db, 'tasks'),
            where('workspace', '==', patient.workspace),
            where('patientNameKey', '==', patientName)
          );
          const taskSnap = await getDocs(taskQuery);
          await Promise.all(taskSnap.docs.map(item => updateDoc(doc(db, 'tasks', item.id), { done: true, completedAt })));
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
          await setDoc(
            doc(db, 'presence', user),
            { status, name: users.find(item => item.key === user)?.name || user, updatedAt: now() },
            { merge: true }
          );
        } catch (err) {
          onError(`presence: ${(err as Error).message}`);
        }
      }
    },
    [cloudMode, onError, user]
  );

  const upsertPatient = useCallback(
    async (workspace: WorkspaceKey, draft: ComposerDraft) => {
      const name = draft.patient?.trim();
      if (!name) return;

      const id = normalizePatientId(workspace, name);
      const patch = {
        workspace,
        name,
        status: 'review' as PatientStatus,
        cardLink: draft.cardLink?.trim() || '',
        canvaLink: draft.canvaLink?.trim() || '',
        updatedAt: now()
      };

      if (cloudMode && db) {
        const refDoc = doc(db, 'patients', id);
        const existing = await getDoc(refDoc);
        await setDoc(
          refDoc,
          {
            ...patch,
            doctor: existing.data()?.doctor || '',
            agent: existing.data()?.agent || '',
            notes: existing.data()?.notes || '',
            createdAt: existing.exists() ? existing.data()?.createdAt || now() : now()
          },
          { merge: true }
        );
        return;
      }

      setPatients(prev => {
        const current = prev.find(item => item.id === id);
        if (current) return prev.map(item => (item.id === id ? { ...item, ...patch } : item));
        return [{ id, ...patch, doctor: '', agent: '', notes: '', createdAt: now() }, ...prev];
      });
    },
    [cloudMode]
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

        if (cloudMode && storage) {
          try {
            const storageRef = ref(storage, `attachments/${workspace}/${Date.now()}-${draft.file.name}`);
            const uploaded = await uploadBytes(storageRef, draft.file);
            file.fileUrl = await getDownloadURL(uploaded.ref);
          } catch (err) {
            onError(`file: ${(err as Error).message}`);
          }
        }
      }

      const messageData: Omit<Message, 'id'> = {
        workspace,
        author: user,
        text: draft.text.trim() || (draft.canvaLink?.trim() || draft.cardLink?.trim() ? 'Material link' : draft.file ? 'File attached' : 'Patient update'),
        patient: draft.patient?.trim() || '',
        cardLink: draft.cardLink?.trim() || '',
        canvaLink: draft.canvaLink?.trim() || '',
        file,
        createdAt: now()
      };

      try {
        if (cloudMode && db) {
          await addDoc(collection(db, 'messages'), messageData);
          await upsertPatient(workspace, draft);
          return;
        }

        setMessages(prev => [...prev, { id: uid(), ...messageData }]);
        await upsertPatient(workspace, draft);
      } catch (err) {
        onError(`send: ${(err as Error).message}`);
      }
    },
    [cloudMode, onError, upsertPatient, user]
  );

  const savePatient = useCallback(
    async (id: string, patch: Partial<Patient>) => {
      const next = { ...patch, updatedAt: now() };
      setPatients(prev => prev.map(item => (item.id === id ? { ...item, ...next } : item)));

      if (cloudMode && db) {
        try {
          await updateDoc(doc(db, 'patients', id), next);
        } catch (err) {
          onError(`patient: ${(err as Error).message}`);
        }
      }

      const patient = patients.find(item => item.id === id);
      const status = patch.status;
      if (patient && (status === 'approved' || status === 'sent' || status === 'archived')) {
        await completePatientTasks({ ...patient, ...patch });
      }
    },
    [cloudMode, completePatientTasks, onError, patients]
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
          await addDoc(collection(db, 'tasks'), taskData);
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
          await updateDoc(doc(db, 'tasks', id), { done: true, completedAt });
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
      if (cloudMode && db) {
        try {
          await setDoc(doc(db, 'system', 'emergency'), { text, updatedAt: now() }, { merge: true });
        } catch (err) {
          onError(`system/emergency: ${(err as Error).message}`);
        }
      }
    },
    [cloudMode, onError]
  );

  return useMemo(
    () => ({
      cloudMode,
      messages,
      patients,
      tasks,
      presence,
      emergency,
      sendMessage,
      savePatient,
      addTask,
      completeTask,
      setMyPresence,
      setSystemEmergency
    }),
    [addTask, cloudMode, completeTask, emergency, messages, patients, presence, savePatient, sendMessage, setMyPresence, setSystemEmergency, tasks]
  );
}
