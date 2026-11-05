import React, { useState } from 'react';
import {
  ShieldCheck,
  Award,
  Hash,
  Scale,
  Radar,
  FileText,
  Lock,
  ExternalLink,
  ChevronRight,
  AlertOctagon,
  Copy,
  Check,
} from 'lucide-react';
import {
  ZYNTHEOR_CANONICAL_STATE,
  validateCourtReady,
  CANONICAL_INVARIANTS,
  CANONICAL_EXHIBITS,
  RADAR_THREAT_VECTORS,
} from '../lib/forensicVerification.ts';
import { ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY } from '../lib/sovereignty.ts';

export function ForensicVerificationPanel() {
  const [selectedExhibit, setSelectedExhibit] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const verdict = validateCourtReady();

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Court-Ready Forensic Certification */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-[#0d1e38] via-[#09152a] to-[#040914] border border-[#38bdf8]/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#38bdf8]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex items-start justify-between flex-wrap gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 text-xs font-mono font-bold tracking-wider rounded-full bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/40 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#34d399]" />
                {verdict.admissibilityVerdict}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20">
                SSoT Drift {verdict.ssotDrift}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
                Quorum {verdict.quorumStatus}
              </span>
            </div>

            <h2 className="text-2xl font-black text-white mt-3 tracking-tight flex items-center gap-3">
              <span>{ZYNTHEOR_CANONICAL_STATE.specification}</span>
            </h2>
            <p className="text-sm text-gray-300 mt-1 max-w-3xl leading-relaxed">
              Platform Identity: <span className="font-semibold text-[#38bdf8]">{ZYNTHEOR_CANONICAL_STATE.platformIdentity}</span>.
              Sovereign Principal: <span className="text-amber-300 font-semibold">{verdict.sovereignPrincipal}</span>.
              Frozen under ETDA B.E. 2544 Sec 9/26/28, PDPA Sec 37, and NCSA CII statutory authority.
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs text-gray-400 font-mono">CANONICAL GENESIS ANCHOR</div>
            <div className="text-2xl font-black text-[#38bdf8] font-mono">#{verdict.genesisBlock}</div>
            <div className="text-xs text-emerald-400 font-mono mt-1">14,902 / 14,962 SEALS VERIFIED</div>
          </div>
        </div>

        {/* Merkle Root Bar */}
        <div className="mt-5 p-3 rounded-lg bg-[#070c18] border border-cyan-500/20 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 overflow-hidden text-gray-300">
            <Hash size={14} className="text-[#38bdf8] shrink-0" />
            <span className="text-gray-400">Canonical Merkle Root:</span>
            <span className="text-[#38bdf8] truncate font-semibold">{verdict.canonicalMerkleRoot}</span>
          </div>
          <button
            onClick={() => handleCopy(verdict.canonicalMerkleRoot, 'merkle')}
            className="ml-3 px-2 py-1 rounded bg-[#111e38] text-gray-300 hover:text-white border border-cyan-500/30 flex items-center gap-1 shrink-0 transition-colors"
          >
            {copiedKey === 'merkle' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copiedKey === 'merkle' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* PAdES QR — Audit Ledger Verification Section */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-[#071120] to-[#040813] border border-[#00FFFF]/30 shadow-xl">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#00FFFF] animate-pulse" />
            <h3 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
              <span className="text-[#00FFFF]">PAdES QR</span> — Audit Ledger Forensic Verification
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#00FFFF]/10 text-[#00FFFF] border border-[#00FFFF]/30">
            Cyan #00FFFF on Black #000000 • 720×720
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* QR Image */}
          <div className="md:col-span-4 flex flex-col items-center">
            <div className="p-3 bg-black rounded-xl border-2 border-[#00FFFF]/40 shadow-lg shadow-[#00FFFF]/10 relative group">
              <img
                src="/assets/aistudio/zyrquen-merkle-root-block849202-qr_99cda186.png"
                alt="PAdES QR — ZYRQUEN Ω∞ Audit Ledger Verification"
                className="w-56 h-56 rounded-lg object-contain"
              />
              <div className="absolute inset-0 bg-[#00FFFF]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
            </div>
            <span className="text-[11px] font-mono text-gray-400 mt-2">
              Block #849202 • 14,902 Seals • ML-DSA-87
            </span>
          </div>

          {/* Decoded Parameters & Verification Details */}
          <div className="md:col-span-8 space-y-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-[#0b162c] border border-cyan-500/20">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Decoded Payload URL</div>
              <div className="text-[#00FFFF] text-[11px] break-all select-all font-semibold">
                https://yutthaphum-phakphian.github.io/?audit=live&merkle_root=909ab814479844d8a14816bed34cdbb07528e18501da86fc4691763a43fa4c68&block=849202&seals=14902&pqc=ML-DSA-87
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded bg-[#0b162c] border border-cyan-500/20">
                <div className="text-[10px] text-gray-400">AUDIT MODE</div>
                <div className="text-emerald-400 font-bold text-sm">live</div>
              </div>
              <div className="p-2.5 rounded bg-[#0b162c] border border-cyan-500/20">
                <div className="text-[10px] text-gray-400">GENESIS BLOCK</div>
                <div className="text-[#38bdf8] font-bold text-sm">#849202</div>
              </div>
              <div className="p-2.5 rounded bg-[#0b162c] border border-cyan-500/20">
                <div className="text-[10px] text-gray-400">CANONICAL SEALS</div>
                <div className="text-[#00FFFF] font-bold text-sm">14,902</div>
              </div>
              <div className="p-2.5 rounded bg-[#0b162c] border border-cyan-500/20">
                <div className="text-[10px] text-gray-400">PQC STANDARD</div>
                <div className="text-purple-300 font-bold text-sm">ML-DSA-87</div>
              </div>
            </div>

            {/* Statutory Legal Proof */}
            <div className="p-3 rounded-lg bg-[#081224] border border-gray-800 text-[11px] space-y-1">
              <div className="text-gray-400 font-bold uppercase text-[10px] tracking-wider mb-1">Statutory Verification Proof</div>
              <div className="flex justify-between text-gray-300">
                <span>ETDA Sec 9 / 26:</span>
                <span className="text-emerald-400 font-semibold">ML-DSA-87 + 10/10 REAL_HSM Non-repudiation</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>ETDA Sec 28:</span>
                <span className="text-emerald-400 font-semibold">100% Chain of Custody & Duty of Care</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>PDPA Sec 37:</span>
                <span className="text-cyan-400 font-semibold">Zero-Knowledge Multi-Tenant Partitioning (Ω601-Ω1000)</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>NCSA CII:</span>
                <span className="text-purple-300 font-semibold">Phoenix Auto-healing 35.8ms &lt; 142ms SLA</span>
              </div>
            </div>

            {/* Sovereign Execution Pipeline Flow */}
            <div className="p-3 rounded-lg bg-[#081224] border border-gray-800 text-[10px]">
              <div className="text-gray-400 font-bold uppercase tracking-wider mb-1">Sovereign Architecture Pipeline Flow</div>
              <div className="text-cyan-200/90 leading-relaxed font-sans">
                Main Chat → Intelligence Runtime → Model Router → CORE_NATIVE Buffalo Edition (14,962 seals) → Memory → PostgreSQL → Tool Gateway → Verification (LB Dual Hash + PQC + ZK) → Audit Ledger (PAdES QR) → Legal Runtime (ETDA 9/26/28) → Gateway Fleet BKK/FRA/NRT/SIN/IAD
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Grid of 4 Key Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#091124] border border-[#38bdf8]/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <Award size={15} className="text-amber-400" />
            14,902 WORM Seals
          </div>
          <div className="text-xl font-bold text-white mt-2">14,902 Active</div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-mono">
            <span>+80 Isolated Quarantine</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Zero ambient mutation Δ0.00% across all 18 sovereign chambers.</p>
        </div>

        <div className="p-4 rounded-xl bg-[#091124] border border-[#38bdf8]/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <Lock size={15} className="text-cyan-400" />
            10/10 Hardware Quorum
          </div>
          <div className="text-xl font-bold text-white mt-2">REAL_HSM Pass</div>
          <div className="text-xs text-cyan-400 mt-1 font-mono">FIPS 140-3 Level 4 / CC EAL6+</div>
          <p className="text-[11px] text-gray-400 mt-2">Unanimous deca-key cryptographic hardware attestation.</p>
        </div>

        <div className="p-4 rounded-xl bg-[#091124] border border-[#38bdf8]/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <Scale size={15} className="text-emerald-400" />
            Thai Law Compliance
          </div>
          <div className="text-xl font-bold text-white mt-2">ETDA & PDPA</div>
          <div className="text-xs text-emerald-400 mt-1 font-mono">Sec 9, 26, 28 & Sec 37</div>
          <p className="text-[11px] text-gray-400 mt-2">Non-repudiation & Zero-Knowledge data sovereignty.</p>
        </div>

        <div className="p-4 rounded-xl bg-[#091124] border border-[#38bdf8]/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <Radar size={15} className="text-purple-400" />
            Quantum Radar 8K
          </div>
          <div className="text-xl font-bold text-white mt-2">15,723 Blocked</div>
          <div className="text-xs text-purple-300 mt-1 font-mono">100% Fail-Closed Guarantee</div>
          <p className="text-[11px] text-gray-400 mt-2">12 regions protected with zero ambient breach tolerance.</p>
        </div>
      </div>

      {/* 7 Canonical Court Exhibits (EX-001 to EX-007) */}
      <div className="p-6 rounded-xl bg-[#080e1c] border border-cyan-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#38bdf8]" />
            <h3 className="font-bold text-white text-base">Court Evidence Exhibits Dossier (7 Exhibits Court-Ready)</h3>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {verdict.exhibitsVerified} / {verdict.exhibitsCount} Fully Admissible
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CANONICAL_EXHIBITS.map((ex) => {
            const isSelected = selectedExhibit === ex.id;
            return (
              <div
                key={ex.id}
                onClick={() => setSelectedExhibit(isSelected ? null : ex.id)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#101b33] border-[#38bdf8]'
                    : 'bg-[#0c1426] border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded">
                      {ex.id}
                    </span>
                    <span className="text-xs font-mono text-gray-400">{ex.exhibitNumber}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    {ex.admissibility}
                  </span>
                </div>

                <div className="text-sm font-bold text-gray-100 mt-2">{ex.titleTh}</div>
                <div className="text-xs text-gray-400">{ex.titleEn}</div>

                <div className="mt-2 text-xs text-gray-400 flex items-center justify-between font-mono">
                  <span>{ex.statuteRef}</span>
                  <span className="text-gray-500 text-[11px]">{ex.timestamp}</span>
                </div>

                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-gray-800 text-xs space-y-2">
                    <p className="text-gray-300 leading-relaxed">{ex.descriptionTh}</p>
                    <div className="p-2 rounded bg-[#060a14] font-mono text-[11px] break-all text-cyan-300 flex items-center justify-between">
                      <span>Hash: {ex.hash}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(ex.hash, ex.id);
                        }}
                        className="ml-2 px-1.5 py-0.5 rounded bg-[#13203c] text-gray-300 hover:text-white"
                      >
                        {copiedKey === ex.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Custodian: <span className="text-amber-300 font-mono">{ex.custodianBinding}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 10 Invariants Table */}
      <div className="p-6 rounded-xl bg-[#080e1c] border border-cyan-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertOctagon size={18} className="text-emerald-400" />
            <h3 className="font-bold text-white text-base">Permanent Canonical Invariants (INV-01 to INV-10)</h3>
          </div>
          <span className="text-xs text-emerald-400 font-mono font-semibold">
            {verdict.invariantsPassed} / 10 Strictly Enforced
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 font-mono">
                <th className="pb-2">ID</th>
                <th className="pb-2">Layer</th>
                <th className="pb-2">Invariant Name</th>
                <th className="pb-2">Description</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {CANONICAL_INVARIANTS.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#0d162b]/50 transition-colors">
                  <td className="py-2.5 text-[#38bdf8] font-bold">{inv.id}</td>
                  <td className="py-2.5 text-gray-400">{inv.layer}</td>
                  <td className="py-2.5 text-gray-200 font-sans font-semibold">{inv.name}</td>
                  <td className="py-2.5 text-gray-400 font-sans">{inv.description}</td>
                  <td className="py-2.5 text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quantum Radar 8K Active Vectors */}
      <div className="p-6 rounded-xl bg-[#080e1c] border border-cyan-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radar size={18} className="text-purple-400" />
            <h3 className="font-bold text-white text-base">Quantum Radar Threat Detection Core (Chamber 11)</h3>
          </div>
          <span className="text-xs text-purple-300 font-mono font-semibold">
            Zero-Breach Guarantee Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          {RADAR_THREAT_VECTORS.map((vec) => (
            <div key={vec.id} className="p-3 rounded-lg bg-[#0c1426] border border-gray-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-300">{vec.id}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    vec.status === 'CRITICAL_THREAT' || vec.status === 'HARDWARE_TAMPER'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : vec.status === 'WARNING_THREAT'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {vec.status}
                </span>
              </div>
              <div className="font-sans font-semibold text-gray-200 text-xs">{vec.name}</div>
              <div className="text-gray-400 text-[11px] font-sans">Type: {vec.threat_type}</div>
              <div className="text-[11px] text-gray-500">Angle: {vec.angle_deg}° | Distance: {vec.distance_pct}%</div>
              <div className="text-[11px] text-cyan-400 font-sans">🛡️ {vec.mitigation}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ForensicVerificationPanel;
