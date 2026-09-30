import 'dotenv/config';

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export async function login(): Promise<string> {
  const { API_BASE_URL, API_EMAIL, API_PASSWORD } = process.env;

  if (!API_BASE_URL || !API_EMAIL || !API_PASSWORD) {
    throw new Error('Falta configurar la conexión con api-agente en .env');
  }

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

  if (!response.ok) {
    throw new Error(`No se pudo iniciar sesión: HTTP ${response.status}`);
  }

  const data: LoginResponse = await response.json();

  return data.accessToken;
}