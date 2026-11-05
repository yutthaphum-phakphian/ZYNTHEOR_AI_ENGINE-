// @ts-nocheck
export const runtime = { status: 'READY' };

export function probeNativeModelRuntime() {
  return {
    status: 'READY',
    isAvailable: true,
    isLocal: true,
    model: 'zyntheor-core-native-v1',
  };
}

export function classifyAnswerSource(provider: string, probe?: any) {
  if (provider === 'native' || provider?.startsWith('zyntheor-core')) {
    return 'native';
  }
  return 'external_provider';
}

export default runtime;
