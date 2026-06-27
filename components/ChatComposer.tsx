'use client';

import { useRef, useState } from 'react';
import { copy, users } from '@/lib/dentflow';
import type { ComposerDraft, Lang, Message } from '@/types';

const emojiSet = ['😊', '👍', '🙏', '❤️', '✅', '👀', '🦷'];

export default function ChatComposer({
  lang,
  replyTo,
  onCancelReply,
  onSend
}: {
  lang: Lang;
  replyTo?: Message['replyTo'];
  onCancelReply?: () => void;
  onSend: (draft: ComposerDraft) => Promise<void>;
}) {
  const t = copy[lang];
  const [draft, setDraft] = useState<ComposerDraft>({ text: '', patient: '', cardLink: '', canvaLink: '', file: null });
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const replyAuthor = replyTo ? users.find(item => item.key === replyTo.author)?.name || replyTo.author : '';

  function addEmoji(emoji: string) {
    setDraft(prev => ({ ...prev, text: `${prev.text}${prev.text.endsWith(' ') || !prev.text ? '' : ' '}${emoji} ` }));
  }

  async function submit() {
    const hasPayload =
      Boolean(draft.text.trim()) ||
      Boolean(draft.patient?.trim()) ||
      Boolean(draft.cardLink?.trim()) ||
      Boolean(draft.canvaLink?.trim()) ||
      Boolean(draft.file);
    if (!hasPayload || sending) return;
    setSending(true);
    try {
      await onSend({ ...draft, replyTo });
      setDraft({ text: '', patient: '', cardLink: '', canvaLink: '', file: null });
      onCancelReply?.();
      if (inputRef.current) inputRef.current.value = '';
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="composer">
      {replyTo && (
        <div className="reply-draft">
          <div>
            <strong>{replyAuthor}</strong>
            <span>{replyTo.patient ? `${replyTo.patient} - ` : ''}{replyTo.text}</span>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply">x</button>
        </div>
      )}
      <div className="emoji-row" aria-label="Emoji">
        {emojiSet.map(emoji => (
          <button type="button" key={emoji} onClick={() => addEmoji(emoji)}>
            {emoji}
          </button>
        ))}
      </div>
      <textarea
        value={draft.text}
        onChange={event => setDraft(prev => ({ ...prev, text: event.target.value }))}
        placeholder={replyTo ? 'Ответ на сообщение' : t.message}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <div className="composer-grid">
        <input value={draft.patient || ''} onChange={event => setDraft(prev => ({ ...prev, patient: event.target.value }))} placeholder={t.patientName} />
        <input value={draft.cardLink || ''} onChange={event => setDraft(prev => ({ ...prev, cardLink: event.target.value }))} placeholder={t.patientCard} />
        <input value={draft.canvaLink || ''} onChange={event => setDraft(prev => ({ ...prev, canvaLink: event.target.value }))} placeholder={t.canvaLink} />
        <div className="file-control">
          <button type="button" className="file-button" onClick={() => inputRef.current?.click()}>
            {draft.file ? draft.file.name : t.attachFile}
          </button>
          {draft.file && (
            <button
              type="button"
              className="remove-file"
              aria-label="Remove file"
              onClick={() => {
                setDraft(prev => ({ ...prev, file: null }));
                if (inputRef.current) inputRef.current.value = '';
              }}
            >
              x
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          className="hidden-file"
          type="file"
          onChange={event => setDraft(prev => ({ ...prev, file: event.target.files?.[0] || null }))}
        />
        <button type="button" className="send-button" onClick={submit} disabled={sending}>
          {t.send}
        </button>
      </div>
    </div>
  );
}
