import { useEffect, useMemo, useRef, useState } from 'react';

type ChatMessage = {
  id: number;
  username: string;
  text: string;
  tone: 'normal' | 'bullish' | 'bearish' | 'system';
};

const USERNAMES = [
  'LuckyTiger',
  'SharpWhale',
  'QuickFox',
  'CoolCat',
  'WiseOwl',
  'BoldWolf',
  'SneakyBull',
  'CalmBear',
  'FastHands',
  'DataNerd',
];

const MESSAGES: Record<ChatMessage['tone'], string[]> = {
  normal: [
    'Watching this hand closely.',
    'Anyone seeing edge here?',
    'Staying flat for now.',
    'Volume looks steady.',
    'Checking probabilities…',
    'Might flip sides soon.',
    'Good liquidity right now.',
    'Nice price discovery.',
  ],
  bullish: [
    "Player odds look tasty.",
    'I like the player price here.',
    'Loading up on player.',
    'This feels mispriced toward dealer.',
  ],
  bearish: [
    'Dealer feels strong here.',
    'Player looks overpriced.',
    'Taking the other side.',
    'Hedging with dealer.',
  ],
  system: [
    '📊 Market synchronized.',
    '⚡ True odds updated.',
    '🔄 Price chart refreshed.',
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMessage(): ChatMessage {
  const tones: ChatMessage['tone'][] = ['normal', 'bullish', 'bearish', 'normal', 'normal'];
  const tone = Math.random() < 0.15 ? 'system' : pick(tones);
  const username = tone === 'system' ? 'SYSTEM' : pick(USERNAMES);
  const text = pick(MESSAGES[tone]);
  return {
    id: Date.now(),
    username,
    text,
    tone,
  };
}

export function LiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Seed with a few starter messages
    return [
      { id: Date.now() - 4000, username: 'SYSTEM', text: '📡 Live chat connected', tone: 'system' },
      { id: Date.now() - 3000, username: 'LuckyTiger', text: "Let's see this hand play out.", tone: 'normal' },
      { id: Date.now() - 2000, username: 'SharpWhale', text: 'Watching true odds for entry.', tone: 'normal' },
    ];
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const schedule = () => {
      const delay = 1200 + Math.random() * 2200; // ~1.2s to 3.4s
      timerRef.current = setTimeout(() => {
        setMessages((prev) => {
          const next = [generateMessage(), ...prev];
          return next.slice(0, 40); // cap history
        });
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const toneStyles = useMemo(
    () => ({
      normal: 'text-slate-200',
      bullish: 'text-emerald-300',
      bearish: 'text-amber-300',
      system: 'text-blue-300',
    }),
    []
  );

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4">
      <div className="text-xs text-slate-300 uppercase tracking-wide mb-3">Live Chat</div>
      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {messages.map((msg) => (
          <div key={msg.id} className="text-xs flex gap-2 items-start">
            <span className="text-slate-500 min-w-[76px] truncate">{msg.username}</span>
            <span className={`flex-1 ${toneStyles[msg.tone]}`}>{msg.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
