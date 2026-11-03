/** Same-origin cookie auth helpers. The session cookie is HttpOnly; JS only reads CSRF tokens. */
/** Parse a fetch Response as JSON; turn HTML/empty bodies (proxy errors, static hosts) into a readable error. */
export async function readJsonResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`เซิร์ฟเวอร์ตอบกลับไม่ใช่ JSON (HTTP ${response.status}) — Backend อาจไม่ทำงาน หรือคุณเปิดผ่าน URL ที่ไม่ใช่เซิร์ฟเวอร์ของแอป`);
  }
}

export async function getCsrfToken(): Promise<string> {
  const response = await fetch('/api/auth/csrf', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = await readJsonResponse<{ csrfToken?: string }>(response);
  if (!response.ok || !data.csrfToken) {
    throw new Error('ไม่สามารถเตรียมความปลอดภัยของคำขอได้');
  }
  return data.csrfToken;
}

export async function csrfHeaders(headers: Record<string, string> = {}): Promise<Record<string, string>> {
  return { ...headers, 'X-CSRF-Token': await getCsrfToken() };
}
