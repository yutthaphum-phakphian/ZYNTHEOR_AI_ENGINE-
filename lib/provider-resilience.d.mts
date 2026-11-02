export interface ProviderFailureDetails {
  kind: 'timeout' | 'unavailable' | 'rate_limit' | 'authentication' | 'invalid_response' | 'provider_error';
  httpStatus: number;
  message: string;
  retryable: boolean;
}
export function classifyProviderError(error: unknown): ProviderFailureDetails;
export function toProviderFailure(error: unknown): Error & {
  code: ProviderFailureDetails['kind'];
  httpStatus: number;
  safeMessage: string;
  retryable: boolean;
};
