export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

/**
 * Login/register JSON. The JWT lives only in HttpOnly cookie `square_one_access_token`.
 * Do not copy tokens into localStorage.
 */
export interface AuthResponse {
  emailVerificationRequired?: boolean;
  userId: string;
  expiresIn: string;
}

/** Matches GET /api/auth/me (and PUT /api/auth/profile) payload. */
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  emailVerified: boolean;
  elo: number;
  eloBullet: number;
  eloBlitz: number;
  eloRapid: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: string;
  updatedAt: string;
}
