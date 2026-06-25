'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, firebaseReady, storage } from '@/lib/firebase';
import { normalizePatientId, users } from '@/lib/dentflow';
import type { ComposerDraft, FileMeta, Message, Patient, PatientStatus, Presence, UserKey, WorkspaceKey } from '@/types';

const localKey = 'dentflow-v3-local-fallback';
const now = () => Date.now();
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

type LocalData = {
  messages: Message[];
  patients: Patient[];
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

      const unsubEmergency = onSnapshot(
        doc(db, 'system', 'emergency'),
        snap => setEmergency((snap.data()?.text as string) || ''),
        err => onError(`system/emergency: ${err.message}`)
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

    const timer = window.setInterval(() => {
      const next = loadLocal();
      if (!next) return;
      setMessages(next.messages);
      setPatients(next.patients);
      setPresence(next.presence);
      setEmergency(next.emergency || '');
    }, 800);

    return () => window.clearInterval(timer);
  }, [cloudMode, onError, user]);

  useEffect(() => {
    if (!user || cloudMode) return;
    saveLocal({ messages, patients, presence, emergency });
  }, [cloudMode, emergency, messages, patients, presence, user]);

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
      if (!user || !draft.text.trim()) return;

      let file: FileMeta | undefined;
      if (draft.file) {
        file = {
          fileName: draft.file.name,
          fileType: draft.file.type,
          fileSize: draft.file.size
        };

        if (cloudMode && storage) {
          const storageRef = ref(storage, `attachments/${workspace}/${Date.now()}-${draft.file.name}`);
          const uploaded = await uploadBytes(storageRef, draft.file);
          file.fileUrl = await getDownloadURL(uploaded.ref);
        }
      }

      const messageData: Omit<Message, 'id'> = {
        workspace,
        author: user,
        text: draft.text.trim(),
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
      presence,
      emergency,
      sendMessage,
      savePatient,
      setMyPresence,
      setSystemEmergency
    }),
    [cloudMode, emergency, messages, patients, presence, savePatient, sendMessage, setMyPresence, setSystemEmergency]
  );
}
