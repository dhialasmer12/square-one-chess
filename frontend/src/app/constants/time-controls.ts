/** Must match server `src/constants/time-controls.ts` LOBBY_TIME_PRESETS. */
export const LOBBY_TIME_PRESETS = [
  '1+0',
  '2+1',
  '3+0',
  '3+2',
  '5+0',
  '5+3',
  '10+0',
  '10+5',
  '15+10',
  '30+0',
] as const;

export type LobbyTimePreset = (typeof LOBBY_TIME_PRESETS)[number];

export type TimeControlCategory = 'Bullet' | 'Blitz' | 'Rapid' | 'Classical';

export interface LobbyTimeOption {
  id: LobbyTimePreset;
  headline: string;
  detail: string;
  category: TimeControlCategory;
}

/** Display rows for the lobby clock grid (order = server allowlist). */
export const LOBBY_TIME_OPTIONS: LobbyTimeOption[] = [
  { id: '1+0', headline: '1 min', detail: '0 sec inc', category: 'Bullet' },
  { id: '2+1', headline: '2 min', detail: '1 sec inc', category: 'Bullet' },
  { id: '3+0', headline: '3 min', detail: '0 sec inc', category: 'Blitz' },
  { id: '3+2', headline: '3 min', detail: '2 sec inc', category: 'Blitz' },
  { id: '5+0', headline: '5 min', detail: '0 sec inc', category: 'Blitz' },
  { id: '5+3', headline: '5 min', detail: '3 sec inc', category: 'Blitz' },
  { id: '10+0', headline: '10 min', detail: '0 sec inc', category: 'Rapid' },
  { id: '10+5', headline: '10 min', detail: '5 sec inc', category: 'Rapid' },
  { id: '15+10', headline: '15 min', detail: '10 sec inc', category: 'Rapid' },
  { id: '30+0', headline: '30 min', detail: '0 sec inc', category: 'Classical' },
];

export function labelForTimeControl(id: string): string {
  const o = LOBBY_TIME_OPTIONS.find((x) => x.id === id);
  return o ? `${o.headline} · ${o.detail}` : id;
}
