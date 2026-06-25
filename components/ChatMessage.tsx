'use client';

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

export default function ChatMessage({
  message,
  currentUser,
  lang,
  onDelete
}: {
  message: Message;
  currentUser: UserKey;
  lang: Lang;
  onDelete: (id: string) => Promise<void>;
}) {
  const t = copy[lang];
  const author = users.find(item => item.key === message.author)?.name || message.author;
  const hasMention = /@[^\s@]+/.test(message.text);
  const canDelete = !message.deleted && (message.author === currentUser || currentUser === 'valeriia');

  return (
    <article className={`message-row ${message.author === currentUser ? 'mine' : ''} ${hasMention ? 'mentioned' : ''} ${message.deleted ? 'deleted' : ''}`}>
      <div className="message-bubble">
        <div className="message-meta">
          <span>{author}</span>
          <span>{formatTime(message.createdAt)}</span>
          {message.patient && <span>{message.patient}</span>}
          {canDelete && (
            <button type="button" onClick={() => onDelete(message.id)}>
              Удалить
            </button>
          )}
        </div>
        <p>{message.deleted ? 'Сообщение удалено' : renderText(message.text)}</p>
        {!message.deleted && (message.cardLink || message.canvaLink || message.file) && (
          <div className="message-links">
            {message.cardLink && (
              <a href={message.cardLink} target="_blank" rel="noreferrer">
                {t.patientCard}
              </a>
            )}
            {message.canvaLink && (
              <a href={message.canvaLink} target="_blank" rel="noreferrer">
                Canva
              </a>
            )}
            {message.file &&
              (message.file.fileUrl ? (
                <a href={message.file.fileUrl} target="_blank" rel="noreferrer">
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
