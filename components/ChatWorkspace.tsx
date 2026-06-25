'use client';

import { workspaces } from '@/lib/dentflow';
import type { ComposerDraft, Lang, Message, Patient, Presence, UserKey, WorkspaceKey } from '@/types';
import ChatColumn from './ChatColumn';

export default function ChatWorkspace({
  lang,
  currentUser,
  messages,
  patients,
  presence,
  onSend,
  onSelectPatient
}: {
  lang: Lang;
  currentUser: UserKey;
  messages: Message[];
  patients: Patient[];
  presence: Record<UserKey, Presence>;
  onSend: (workspace: WorkspaceKey, draft: ComposerDraft) => Promise<void>;
  onSelectPatient: (id: string) => void;
}) {
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
          presence={presence[workspace]}
          onSend={onSend}
          onSelectPatient={onSelectPatient}
        />
      ))}
    </section>
  );
}
