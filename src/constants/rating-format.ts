/**
 * Maps lobby clock presets (e.g. "3+0", "10+0") to a rating bucket.
 * - Bullet: base minutes under 3
 * - Blitz: 3–9 minutes
 * - Rapid: 10+ minutes
 */
export type RatingFormat = 'bullet' | 'blitz' | 'rapid';

export function timeControlToRatingFormat(timeControl: string): RatingFormat {
  const base = timeControl.trim().split('+')[0] ?? '';
  const minutes = parseInt(base, 10);
  if (!Number.isFinite(minutes) || minutes < 0) {
    return 'rapid';
  }
  if (minutes < 3) {
    return 'bullet';
  }
  if (minutes < 10) {
    return 'blitz';
  }
  return 'rapid';
}

export type UserRatingFields = {
  eloBullet: number;
  eloBlitz: number;
  eloRapid: number;
};

export function ratingFormatEloOnUser(
  user: UserRatingFields,
  format: RatingFormat
): number {
  switch (format) {
    case 'bullet':
      return user.eloBullet;
    case 'blitz':
      return user.eloBlitz;
    default:
      return user.eloRapid;
  }
}

/** Single headline number (legacy / leaderboard “combined”). */
export function peakElo(user: UserRatingFields): number {
  return Math.max(user.eloBullet, user.eloBlitz, user.eloRapid);
}

export function parseRatingFormatQuery(raw: unknown): RatingFormat | 'combined' {
  const v = typeof raw === 'string' ? raw.toLowerCase().trim() : '';
  if (v === 'bullet' || v === 'blitz' || v === 'rapid') {
    return v;
  }
  if (v === 'combined' || v === 'all' || v === '') {
    return 'combined';
  }
  return 'combined';
}
