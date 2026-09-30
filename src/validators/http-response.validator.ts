export function validateHttpResponse(
  response: Response,
  message: string,
): void {
  if (!response.ok) {
    throw new Error(`${message}: HTTP ${response.status}`);
  }
}