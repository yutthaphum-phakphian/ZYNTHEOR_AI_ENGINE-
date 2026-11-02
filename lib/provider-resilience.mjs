const STATUS_MESSAGES = {
  timeout: 'ผู้ให้บริการ AI ใช้เวลาตอบสนองนานเกินกำหนด กรุณาลองอีกครั้ง',
  unavailable: 'ไม่สามารถเชื่อมต่อผู้ให้บริการ AI ได้ในขณะนี้',
  rate_limit: 'ผู้ให้บริการจำกัดจำนวนคำขอชั่วคราว กรุณารอสักครู่แล้วลองใหม่',
  authentication: 'การยืนยันตัวตนกับผู้ให้บริการ AI ไม่สำเร็จ โปรดตรวจสอบการตั้งค่าฝั่งเซิร์ฟเวอร์',
  invalid_response: 'ผู้ให้บริการ AI ส่งข้อมูลตอบกลับที่ไม่ถูกต้อง',
  provider_error: 'เกิดข้อผิดพลาดจากผู้ให้บริการ AI',
};

export function classifyProviderError(error) {
  const message = String(error?.message || error || '').slice(0, 500);
  const status = Number(error?.status || error?.statusCode || 0);
  const code = String(error?.code || '').toUpperCase();
  let kind = 'provider_error';
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError' || /timeout|timed out|deadline exceeded/i.test(message) || code === 'ETIMEDOUT') kind = 'timeout';
  else if (status === 429 || /rate.?limit|quota exceeded/i.test(message)) kind = 'rate_limit';
  else if ([401, 403].includes(status) || /unauthorized|invalid api key|authentication/i.test(message)) kind = 'authentication';
  else if (/empty_model_response|invalid non-json|returned html|invalid response/i.test(message)) kind = 'invalid_response';
  else if (['ECONNREFUSED','ENOTFOUND','EHOSTUNREACH','ECONNRESET','EAI_AGAIN'].includes(code) || /fetch failed|network error|connection refused|unavailable/i.test(message)) kind = 'unavailable';
  const httpStatus = kind === 'timeout' ? 504 : kind === 'rate_limit' ? 429 : kind === 'authentication' ? 502 : kind === 'unavailable' ? 503 : 502;
  return { kind, httpStatus, message: STATUS_MESSAGES[kind], retryable: ['timeout','unavailable','rate_limit'].includes(kind) };
}

export function toProviderFailure(error) {
  const details = classifyProviderError(error);
  const failure = new Error(details.kind);
  failure.name = 'ProviderFailure';
  failure.code = details.kind;
  failure.httpStatus = details.httpStatus;
  failure.safeMessage = details.message;
  failure.retryable = details.retryable;
  return failure;
}
