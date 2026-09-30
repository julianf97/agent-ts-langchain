import 'dotenv/config';
import type { LoginResponse } from '../interfaces/login-response.interface.js';
import { validateApiAuthConfig } from '../validators/api-config.validator.js';
import { validateHttpResponse } from '../validators/http-response.validator.js';

export async function login(): Promise<string> {
  const { API_BASE_URL, API_EMAIL, API_PASSWORD } = process.env;

  validateApiAuthConfig(API_BASE_URL, API_EMAIL, API_PASSWORD);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: API_EMAIL,
      password: API_PASSWORD,
    }),
  });

  validateHttpResponse(response, 'No se pudo iniciar sesión');

  const data: LoginResponse = await response.json();

  return data.accessToken;
}