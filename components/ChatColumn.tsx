'use client';

import { useEffect, useRef } from 'react';
import { copy, workspaceNames } from '@/lib/dentflow';
import type { ComposerDraft, Lang, Message, Patient, Presence, UserKey, WorkspaceKey } from '@/types';
import ChatComposer from './ChatComposer';
import ChatMessage from './ChatMessage';

export default function ChatColumn({
  lang,
  workspace,
  currentUser,
  messages,
  patients,
  presence,
  onSend,
  onSelectPatient
}: {
  lang: Lang;
  workspace: WorkspaceKey;
  currentUser: UserKey;
  messages: Message[];
  patients: Patient[];
  presence: Presence;
  onSend: (workspace: WorkspaceKey, draft: ComposerDraft) => Promise<void>;
  onSelectPatient: (id: string) => void;
}) {
  const t = copy[lang];
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  return (
    <section className="chat-column">
      <header className="chat-head">
        <div>
          <h3>{workspaceNames[workspace]}</h3>
          <span>
            <i className={`presence-dot ${presence}`} />
            {t[presence]}
          </span>
        </div>
        <small>{messages.length} {t.messages}</small>
      </header>

      <div className="patient-strip">
        {patients.slice(0, 6).map(patient => (
          <button className={`patient-chip ${patient.status}`} key={patient.id} onClick={() => onSelectPatient(patient.id)}>
            {patient.name} · {t[patient.status]}
          </button>
        ))}
      </div>

      <div className="message-list" ref={bodyRef}>
        {messages.length === 0 && <p className="muted empty-chat">{t.noMessages}</p>}
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} currentUser={currentUser} lang={lang} />
        ))}
      </div>

      <ChatComposer lang={lang} onSend={draft => onSend(workspace, draft)} />
    </section>
  );
}
