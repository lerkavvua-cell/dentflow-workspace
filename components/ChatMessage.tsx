'use client';

import type { DragEventHandler } from 'react';
import { copy, formatTime, users } from '@/lib/dentflow';
import type { Lang, Message, UserKey } from '@/types';

function renderText(text: string) {
  const parts = text.split(/(@[^\s@]+)/g);
  return parts.map((part, index) =>
    part.startsWith('@') ? (
      <mark key={`${part}-${index}`} className="mention">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function shortText(text: string) {
  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
}

export default function ChatMessage({
  message,
  currentUser,
  lang,
  onDelete,
  onReply,
  onSelectPatient,
  onDragStart
}: {
  message: Message;
  currentUser: UserKey;
  lang: Lang;
  onDelete: (id: string) => Promise<void>;
  onReply?: (message: Message) => void;
  onSelectPatient?: (patientName: string) => void;
  onDragStart?: DragEventHandler<HTMLElement>;
}) {
  const t = copy[lang];
  const author = users.find(item => item.key === message.author)?.name || message.author;
  const replyAuthor = message.replyTo ? users.find(item => item.key === message.replyTo?.author)?.name || message.replyTo.author : '';
  const hasMention = /@[^\s@]+/.test(message.text);
  const canDelete = !message.deleted && (message.author === currentUser || currentUser === 'valeriia');
  const patientPrefix = message.patient ? `${message.patient} - ` : '';

  return (
    <article
      className={`message-row ${message.author === currentUser ? 'mine' : ''} ${hasMention ? 'mentioned' : ''} ${message.deleted ? 'deleted' : ''}`}
      draggable={!message.deleted}
      onDragStart={onDragStart}
      onClick={() => {
        if (message.patient && !message.deleted) onSelectPatient?.(message.patient);
      }}
    >
      <div className="message-bubble">
        <div className="message-meta">
          <span>{author}</span>
          <span>{formatTime(message.createdAt)}</span>
          {message.patient && (
            <button
              type="button"
              className="patient-open"
              onClick={event => {
                event.stopPropagation();
                onSelectPatient?.(message.patient || '');
              }}
            >
              {message.patient}
            </button>
          )}
          {message.syncState === 'local' && <span className="sync-state">локально</span>}
          {message.syncState === 'pending' && <span className="sync-state">сохраняется</span>}
          {!message.deleted && (
            <button
              type="button"
              className="reply-button"
              onClick={event => {
                event.stopPropagation();
                onReply?.(message);
              }}
            >
              Ответить
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
                onDelete(message.id);
              }}
            >
              Удалить
            </button>
          )}
        </div>
        {message.replyTo && !message.deleted && (
          <div className="reply-quote">
            <strong>{replyAuthor}</strong>
            <span>{message.replyTo.patient ? `${message.replyTo.patient} - ` : ''}{shortText(message.replyTo.text)}</span>
          </div>
        )}
        <p>{message.deleted ? 'Сообщение удалено' : renderText(message.text)}</p>
        {!message.deleted && (message.cardLink || message.canvaLink || message.file) && (
          <div className="message-links">
            {message.cardLink && (
              <a
                href={message.cardLink}
                target="_blank"
                rel="noreferrer"
                onClick={event => {
                  event.stopPropagation();
                  if (message.patient) onSelectPatient?.(message.patient);
                }}
              >
                {patientPrefix}{t.patientCard}
              </a>
            )}
            {message.canvaLink && (
              <a href={message.canvaLink} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}>
                {patientPrefix}Canva
              </a>
            )}
            {message.file &&
              (message.file.fileUrl ? (
                <a href={message.file.fileUrl} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}>
                  {t.file}: {message.file.fileName}
                </a>
              ) : (
                <span>{t.file}: {message.file.fileName}</span>
              ))}
          </div>
        )}
      </div>
    </article>
  );
}
