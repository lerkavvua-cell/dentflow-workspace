'use client';

import { DragEvent, useEffect, useRef, useState } from 'react';
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
  onMovePatient,
  onForwardMessage,
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
  onMovePatient: (id: string, workspace: WorkspaceKey) => Promise<void>;
  onForwardMessage: (id: string, workspace: WorkspaceKey) => Promise<void>;
  onAddTask: (workspace: WorkspaceKey, patientName: string, text: string, materialLink?: string) => Promise<void>;
  onCompleteTask: (id: string) => Promise<void>;
  onSelectPatient: (id: string) => void;
}) {
  const t = copy[lang];
  const bodyRef = useRef<HTMLDivElement>(null);
  const [taskPatient, setTaskPatient] = useState('');
  const [taskLink, setTaskLink] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [replyTo, setReplyTo] = useState<Message['replyTo']>();
  const canAddTasks = currentUser === 'valeriia';

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function submitTask() {
    await onAddTask(workspace, taskPatient, taskLink, taskLink);
    setTaskPatient('');
    setTaskLink('');
  }

  async function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragOver(false);
    const type = event.dataTransfer.getData('application/dentflow-type');
    const id = event.dataTransfer.getData('application/dentflow-id');
    if (type === 'patient' && id) await onMovePatient(id, workspace);
    if (type === 'message' && id) await onForwardMessage(id, workspace);
  }

  return (
    <section
      className={`chat-column ${dragOver ? 'drag-over' : ''}`}
      onDragOver={event => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={event => {
        if (event.currentTarget === event.target) setDragOver(false);
      }}
      onDrop={handleDrop}
    >
      <header className="chat-head">
        <div>
          <h3>{workspaceNames[workspace]}</h3>
          <span>
            <i className={`presence-dot ${online ? 'online' : 'offline'} ${presence}`} />
            {online ? t.online : t.offline} - {t[presence]}
          </span>
        </div>
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
          <button
            className={`patient-chip ${patient.status}`}
            key={patient.id}
            draggable
            onDragStart={event => {
              event.dataTransfer.setData('application/dentflow-type', 'patient');
              event.dataTransfer.setData('application/dentflow-id', patient.id);
            }}
            onClick={() => onSelectPatient(patient.id)}
          >
            {patient.name} - {t[patient.status]}
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
            onReply={target => {
              setReplyTo({
                messageId: target.id,
                author: target.author,
                text: target.text,
                patient: target.patient
              });
            }}
            onSelectPatient={patientName => onSelectPatient(normalizePatientId(workspace, patientName))}
            onDragStart={event => {
              event.dataTransfer.setData('application/dentflow-type', 'message');
              event.dataTransfer.setData('application/dentflow-id', message.id);
            }}
          />
        ))}
      </div>

      <ChatComposer
        lang={lang}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(undefined)}
        onSend={async draft => {
          await onSend(workspace, draft);
          setReplyTo(undefined);
          if (draft.patient?.trim()) onSelectPatient(normalizePatientId(workspace, draft.patient));
        }}
      />
    </section>
  );
}
