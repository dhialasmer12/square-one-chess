/** Standard ELO K-factor (FIDE default for most ratings). */
export const DEFAULT_ELO_K = 32;

/**
 * Expected score for `playerRating` against `opponentRating`.
 * E = 1 / (1 + 10^((R_opponent - R_player) / 400))
 */
export function expectedScore(
  playerRating: number,
  opponentRating: number
): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * New rating: R' = R + K * (S - E), where S ∈ {0, 0.5, 1}.
 */
export function computeNewElo(
  playerRating: number,
  opponentRating: number,
  score: number,
  K: number = DEFAULT_ELO_K
): number {
  const expected = expectedScore(playerRating, opponentRating);
  return Math.round(playerRating + K * (score - expected));
}
