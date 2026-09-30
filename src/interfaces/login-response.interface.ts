import type { ApiContext } from './api-context.interface.js';

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  context: ApiContext;
}