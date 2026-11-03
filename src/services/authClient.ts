/** Same-origin cookie auth helpers. The session cookie is HttpOnly; JS only reads CSRF tokens. */
export async function getCsrfToken(): Promise<string> {
  const response = await fetch('/api/auth/csrf', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = await response.json() as { csrfToken?: string };
  if (!response.ok || !data.csrfToken) {
    throw new Error('ไม่สามารถเตรียมความปลอดภัยของคำขอได้');
  }
  return data.csrfToken;
}

export async function csrfHeaders(headers: Record<string, string> = {}): Promise<Record<string, string>> {
  return { ...headers, 'X-CSRF-Token': await getCsrfToken() };
}
