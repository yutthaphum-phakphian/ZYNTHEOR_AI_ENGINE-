export class RequestObservability {
  constructor(options?: { limit?: number; storageFile?: string | null });
  record(input: Record<string, unknown>): any;
  snapshot(options?: { limit?: number; userId?: string; workspaceId?: string }): any;
  clear(options?: { userId?: string | null; workspaceId?: string | null }): any;
}
export function isSimulatedOrMock(record: any): boolean;
