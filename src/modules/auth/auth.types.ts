export type JwtExpiresIn = `${number}${'s' | 'm' | 'h' | 'd'}`;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  sessionId: string;
}
