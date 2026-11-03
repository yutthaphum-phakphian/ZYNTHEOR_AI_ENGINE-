export function canUpdateOnlineProviderPolicy(
  localOnly: boolean,
  providerIsLocal: boolean,
  accessTokenConfigured: boolean,
): boolean {
  return localOnly || providerIsLocal || accessTokenConfigured;
}
