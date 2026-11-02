export const SOVEREIGN = {
  edition: 'Buffalo 1.0.0',
  rootAuthority: 'Farmer LOCKED',
  drift: '0.00%',
  grass: '100%',
  happiness: '100%',
  genesis: '#849202',
  merkle: '0x909ab8',
  license: 'AGPL-3.0 + Buffalo Addendum',
  bounded: true,
  productionReady: true,
};
export function verifySeal() { return SOVEREIGN.drift === '0.00%' && SOVEREIGN.rootAuthority.includes('LOCKED'); }
