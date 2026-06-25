'use client';

import { copy, formatTime, users, whatsappTargets } from '@/lib/dentflow';
import type { Lang, Message, UserKey } from '@/types';

function whatsappUrl(message: Message) {
  const target = whatsappTargets[message.workspace];
  if (!target) return '';
  const body = [
    message.patient ? `Patient: ${message.patient}` : '',
    message.text,
    message.cardLink ? `Patient Card: ${message.cardLink}` : '',
    message.canvaLink ? `Canva: ${message.canvaLink}` : '',
    message.file?.fileUrl ? `File: ${message.file.fileUrl}` : message.file?.fileName ? `File: ${message.file.fileName}` : ''
  ]
    .filter(Boolean)
    .join('\n');
  return `https://wa.me/${target.phone}?text=${encodeURIComponent(body)}`;
}

export default function ChatMessage({ message, currentUser, lang }: { message: Message; currentUser: UserKey; lang: Lang }) {
  const t = copy[lang];
  const author = users.find(item => item.key === message.author)?.name || message.author;
  const waUrl = whatsappUrl(message);

  return (
    <article className={`message-row ${message.author === currentUser ? 'mine' : ''}`}>
      <div className="message-bubble">
        <div className="message-meta">
          <span>{author}</span>
          <span>{formatTime(message.createdAt)}</span>
          {message.patient && <span>{message.patient}</span>}
        </div>
        <p>{message.text}</p>
        {(message.cardLink || message.canvaLink || message.file || waUrl) && (
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
            {waUrl && (
              <a className="whatsapp-link" href={waUrl} target="_blank" rel="noreferrer">
                {t.sendToWhatsapp}
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
