'use client';

import type { Notice } from '@/hooks/useNotifications';

export default function NotificationCenter({ notice, label }: { notice: Notice | null; label: string }) {
  if (!notice) return null;

  return (
    <div className="notification">
      <div className={`assistant ${notice.animal}`} aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <span>{notice.author}</span>
      </div>
    </div>
  );
}
