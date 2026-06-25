'use client';

import { copy, formatTime, users } from '@/lib/dentflow';
import type { Lang, Message, UserKey } from '@/types';

export default function ChatMessage({ message, currentUser, lang }: { message: Message; currentUser: UserKey; lang: Lang }) {
  const t = copy[lang];
  const author = users.find(item => item.key === message.author)?.name || message.author;

  return (
    <article className={`message-row ${message.author === currentUser ? 'mine' : ''}`}>
      <div className="message-bubble">
        <div className="message-meta">
          <span>{author}</span>
          <span>{formatTime(message.createdAt)}</span>
          {message.patient && <span>{message.patient}</span>}
        </div>
        <p>{message.text}</p>
        {(message.cardLink || message.canvaLink || message.file) && (
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
