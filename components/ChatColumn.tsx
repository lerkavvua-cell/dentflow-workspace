'use client';

import { useEffect, useRef, useState } from 'react';
import { copy, normalizePatientId, workspaceNames } from '@/lib/dentflow';
import type { ComposerDraft, Lang, Message, Patient, Presence, TaskItem, UserKey, WorkspaceKey } from '@/types';
import ChatComposer from './ChatComposer';
import ChatMessage from './ChatMessage';

export default function ChatColumn({
  lang,
  workspace,
  currentUser,
  messages,
  patients,
  tasks,
  presence,
  online,
  onSend,
  onDeleteMessage,
  onAddTask,
  onCompleteTask,
  onSelectPatient
}: {
  lang: Lang;
  workspace: WorkspaceKey;
  currentUser: UserKey;
  messages: Message[];
  patients: Patient[];
  tasks: TaskItem[];
  presence: Presence;
  online: boolean;
  onSend: (workspace: WorkspaceKey, draft: ComposerDraft) => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
  onAddTask: (workspace: WorkspaceKey, patientName: string, text: string, materialLink?: string) => Promise<void>;
  onCompleteTask: (id: string) => Promise<void>;
  onSelectPatient: (id: string) => void;
}) {
  const t = copy[lang];
  const bodyRef = useRef<HTMLDivElement>(null);
  const [taskPatient, setTaskPatient] = useState('');
  const [taskLink, setTaskLink] = useState('');
  const canAddTasks = currentUser === 'valeriia';

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function submitTask() {
    await onAddTask(workspace, taskPatient, taskLink, taskLink);
    setTaskPatient('');
    setTaskLink('');
  }

  return (
    <section className="chat-column">
      <header className="chat-head">
        <div>
          <h3>{workspaceNames[workspace]}</h3>
          <span>
            <i className={`presence-dot ${online ? 'online' : 'offline'} ${presence}`} />
            {online ? t.online : t.offline} · {t[presence]}
          </span>
        </div>
        <small>{messages.length} {t.messages}</small>
      </header>

      <section className="task-board">
        <div className="task-title">
          <strong>{t.tasks}</strong>
          <span>{tasks.length}</span>
        </div>
        {canAddTasks && (
          <div className="task-form">
            <input value={taskPatient} onChange={event => setTaskPatient(event.target.value)} placeholder={t.patientTaskName} />
            <input value={taskLink} onChange={event => setTaskLink(event.target.value)} placeholder="Material link" />
            <button type="button" onClick={submitTask}>{t.addTask}</button>
          </div>
        )}
        <div className="task-list">
          {tasks.map(task => (
            <div className="task-item" key={task.id}>
              <div>
                <strong>{task.patientName}</strong>
              </div>
              {task.materialLink && <a href={task.materialLink} target="_blank" rel="noreferrer">Link</a>}
              <button type="button" onClick={() => onCompleteTask(task.id)}>{t.done}</button>
            </div>
          ))}
        </div>
      </section>

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
          <ChatMessage
            key={message.id}
            message={message}
            currentUser={currentUser}
            lang={lang}
            onDelete={onDeleteMessage}
            onSelectPatient={patientName => onSelectPatient(normalizePatientId(workspace, patientName))}
          />
        ))}
      </div>

      <ChatComposer
        lang={lang}
        onSend={async draft => {
          await onSend(workspace, draft);
          if (draft.patient?.trim()) onSelectPatient(normalizePatientId(workspace, draft.patient));
        }}
      />
    </section>
  );
}
