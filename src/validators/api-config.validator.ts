export function validateApiBaseUrl(
  baseUrl: string | undefined,
): asserts baseUrl is string {
  if (!baseUrl) {
    throw new Error('Falta configurar API_BASE_URL en .env');
  }
}

export function validateApiAuthConfig(
  baseUrl: string | undefined,
  email: string | undefined,
  password: string | undefined,
): void {
  if (!baseUrl || !email || !password) {
    throw new Error('Falta configurar la conexión con api-agente en .env');
  }
}