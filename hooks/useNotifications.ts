'use client';

import { useEffect, useRef, useState } from 'react';
import type { Message, UserKey } from '@/types';
import { users } from '@/lib/dentflow';

export type Notice = {
  id: string;
  animal: string;
  author: string;
  urgent: boolean;
};

function beep() {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioContextClass();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 740;
  gain.gain.value = 0.035;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

export function useNotifications(messages: Message[], currentUser: UserKey | null, soundOn: boolean) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const seen = useRef(false);
  const lastIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser) return;
    const ids = new Set(messages.map(item => item.id));

    if (!seen.current) {
      seen.current = true;
      lastIds.current = ids;
      return;
    }

    const incoming = messages.find(item => !lastIds.current.has(item.id) && item.author !== currentUser);
    lastIds.current = ids;

    if (!incoming) return;
    const author = users.find(item => item.key === incoming.author)?.name || incoming.author;
    const urgent = /@\S+|urgent|сроч|экстр|acil/i.test(incoming.text);
    setNotice({ id: incoming.id, animal: 'dog', author, urgent });
    if (soundOn) beep();
    const timer = window.setTimeout(() => setNotice(null), 5200);
    return () => window.clearTimeout(timer);
  }, [currentUser, messages, soundOn]);

  return notice;
}
