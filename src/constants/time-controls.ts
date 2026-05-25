/** Presets allowed for lobby queue + persisted on `Game`. */
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

export function isLobbyTimePreset(s: string): s is LobbyTimePreset {
  return (LOBBY_TIME_PRESETS as readonly string[]).includes(s);
}

export function normalizeLobbyTimeControl(raw: unknown): LobbyTimePreset {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (isLobbyTimePreset(t)) {
    return t;
  }
  return '10+0';
}
