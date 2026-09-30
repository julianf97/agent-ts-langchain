export function validateOpenAiConfig(
  apiKey: string | undefined,
  model: string | undefined,
): void {
  if (!apiKey || !model) {
    throw new Error(
      'Falta configurar OPENAI_API_KEY u OPENAI_MODEL en .env',
    );
  }
}