// @ts-nocheck
export const registry=new Map();
export function registerEvidence(k:string,v:any){registry.set(k,v)}
export default {registerEvidence};
