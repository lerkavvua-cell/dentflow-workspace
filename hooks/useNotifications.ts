'use client';

import { useEffect, useRef, useState } from 'react';
import { users } from '@/lib/dentflow';
import type { Message, SoundKey, UserKey } from '@/types';

export type Notice = {
  id: string;
  animal: string;
  author: string;
  urgent: boolean;
};

const soundPatterns: Record<SoundKey, number[]> = {
  soft: [620],
  bell: [820, 620],
  pop: [420, 760],
  chime: [660, 880, 990],
  bright: [920, 1040]
};

function beep(sound: SoundKey) {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioContextClass();
  soundPatterns[sound].forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    gain.gain.value = 0.028;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const start = ctx.currentTime + index * 0.11;
    osc.start(start);
    osc.stop(start + 0.09);
  });
}

export function useNotifications(messages: Message[], currentUser: UserKey | null, soundOn: boolean, soundKey: SoundKey) {
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
    const isTagged = /@\S+|urgent|сроч|экстр|acil/i.test(incoming.text);
    if (!isTagged) return;

    const author = users.find(item => item.key === incoming.author)?.name || incoming.author;
    setNotice({ id: incoming.id, animal: 'dog', author, urgent: true });
    if (soundOn) beep(soundKey);
    const timer = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [currentUser, messages, soundKey, soundOn]);

  return notice;
}
