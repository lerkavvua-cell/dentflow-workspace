'use client';

import { workspaces } from '@/lib/dentflow';
import type { ComposerDraft, Lang, Message, OnlineMap, Patient, Presence, TaskItem, UserKey, WorkspaceKey } from '@/types';
import ChatColumn from './ChatColumn';

export default function ChatWorkspace({
  lang,
  currentUser,
  messages,
  patients,
  tasks,
  presence,
  online,
  onSend,
  onDeleteMessage,
  onMovePatient,
  onAddTask,
  onCompleteTask,
  onSelectPatient
}: {
  lang: Lang;
  currentUser: UserKey;
  messages: Message[];
  patients: Patient[];
  tasks: TaskItem[];
  presence: Record<UserKey, Presence>;
  online: OnlineMap;
  onSend: (workspace: WorkspaceKey, draft: ComposerDraft) => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
  onMovePatient: (id: string, workspace: WorkspaceKey) => Promise<void>;
  onAddTask: (workspace: WorkspaceKey, patientName: string, text: string, materialLink?: string) => Promise<void>;
  onCompleteTask: (id: string) => Promise<void>;
  onSelectPatient: (id: string) => void;
}) {
  async function forwardMessage(messageId: string, workspace: WorkspaceKey) {
    const message = messages.find(item => item.id === messageId);
    if (!message || message.workspace === workspace || message.deleted) return;
    await onSend(workspace, {
      text: message.text,
      patient: message.patient || '',
      cardLink: message.cardLink || '',
      canvaLink: message.canvaLink || '',
      file: null
    });
  }

  return (
    <section className="chat-workspace">
      {workspaces.map(workspace => (
        <ChatColumn
          key={workspace}
          lang={lang}
          workspace={workspace}
          currentUser={currentUser}
          messages={messages.filter(message => message.workspace === workspace)}
          patients={patients.filter(patient => patient.workspace === workspace)}
          tasks={tasks.filter(task => task.workspace === workspace && !task.done)}
          presence={presence[workspace]}
          online={online[workspace]}
          onSend={onSend}
          onDeleteMessage={onDeleteMessage}
          onMovePatient={onMovePatient}
          onForwardMessage={forwardMessage}
          onAddTask={onAddTask}
          onCompleteTask={onCompleteTask}
          onSelectPatient={onSelectPatient}
        />
      ))}
    </section>
  );
}
