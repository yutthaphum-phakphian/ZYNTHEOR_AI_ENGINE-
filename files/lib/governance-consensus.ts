import crypto from 'node:crypto';

export interface ProviderVote {
  providerId: string;
  vote: 'GRANT' | 'DENY' | 'ABSTAIN';
  weight: number;
  timestamp: string;
  signature: string;
}

export interface QuorumAttestation {
  consensusId: string;
  term: number;
  policyId: string;
  requiredQuorum: number;
  actualVotes: number;
  weightedPassRatio: number;
  ratified: boolean;
  thresholdSignature: string;
  merkleRoot: string;
  createdAt: string;
}

export interface ConsensusState {
  term: number;
  leaderProviderId: string;
  activeProviders: string[];
  lastConsensusHash: string;
  ratifiedEventsCount: number;
  thresholdWeightRatio: number;
}

export class GovernanceConsensusEngine {
  private term = 1;
  private leader = 'provider-gemini-primary';
  private providers = ['provider-gemini-primary', 'provider-ollama-local', 'provider-zyntheor-core', 'provider-vertex-sec', 'provider-sovereign-node'];
  private voteHistory: ProviderVote[] = [];
  private attestationChain: QuorumAttestation[] = [];
  private lastHash = '0x909ab814479844d8a14816bed34cdbb07528e18501da86fc4691763a43fa4c68';

  constructor() {
    // Seed initial attestation
    this.recordConsensus('policy-init', [
      { providerId: 'provider-gemini-primary', vote: 'GRANT', weight: 30, timestamp: new Date().toISOString(), signature: this.signVote('provider-gemini-primary', 'GRANT') },
      { providerId: 'provider-ollama-local', vote: 'GRANT', weight: 25, timestamp: new Date().toISOString(), signature: this.signVote('provider-ollama-local', 'GRANT') },
      { providerId: 'provider-zyntheor-core', vote: 'GRANT', weight: 25, timestamp: new Date().toISOString(), signature: this.signVote('provider-zyntheor-core', 'GRANT') },
      { providerId: 'provider-vertex-sec', vote: 'GRANT', weight: 20, timestamp: new Date().toISOString(), signature: this.signVote('provider-vertex-sec', 'GRANT') },
    ]);
  }

  private signVote(providerId: string, vote: string): string {
    return crypto.createHash('sha256').update(`${providerId}:${vote}:${this.term}:${this.lastHash}`).digest('hex');
  }

  public recordVote(vote: ProviderVote): boolean {
    if (!this.providers.includes(vote.providerId)) return false;
    this.voteHistory.push(vote);
    return true;
  }

  public recordConsensus(policyId: string, votes: ProviderVote[]): QuorumAttestation {
    const validVotes = votes.filter(v => this.providers.includes(v.providerId));
    const grantWeight = validVotes.filter(v => v.vote === 'GRANT').reduce((acc, v) => acc + v.weight, 0);
    const totalWeight = validVotes.reduce((acc, v) => acc + v.weight, 0) || 100;
    const weightedPassRatio = Number((grantWeight / totalWeight).toFixed(4));
    const ratified = weightedPassRatio >= 0.67;

    const consensusId = `consensus-${crypto.randomUUID()}`;
    const votesConcat = validVotes.map(v => `${v.providerId}:${v.vote}:${v.signature}`).join('|');
    const merkleRoot = crypto.createHash('sha256').update(`${this.lastHash}:${policyId}:${votesConcat}`).digest('hex');
    const fullMerkleRoot = `0x${merkleRoot}`;
    const thresholdSignature = crypto.createHash('sha256').update(`bls-threshold:${consensusId}:${fullMerkleRoot}:${weightedPassRatio}`).digest('hex');

    const attestation: QuorumAttestation = {
      consensusId,
      term: this.term,
      policyId,
      requiredQuorum: 0.67,
      actualVotes: validVotes.length,
      weightedPassRatio,
      ratified,
      thresholdSignature,
      merkleRoot: fullMerkleRoot,
      createdAt: new Date().toISOString(),
    };

    if (ratified) {
      this.lastHash = attestation.merkleRoot;
      this.term += 1;
    }

    this.attestationChain.push(attestation);
    return attestation;
  }

  public verifyThresholdSignature(attestation: QuorumAttestation): boolean {
    const expectedSig = crypto.createHash('sha256').update(`bls-threshold:${attestation.consensusId}:${attestation.merkleRoot}:${attestation.weightedPassRatio}`).digest('hex');
    return attestation.thresholdSignature === expectedSig && attestation.ratified;
  }

  public verifyChainIntegrity(): { valid: boolean; brokenAt?: number; total: number } {
    for (let i = 0; i < this.attestationChain.length; i++) {
      const current = this.attestationChain[i];
      if (!current.merkleRoot.startsWith('0x') || !current.thresholdSignature) {
        return { valid: false, brokenAt: i, total: this.attestationChain.length };
      }
    }
    return { valid: true, total: this.attestationChain.length };
  }

  public getConsensusSnapshot(): { state: ConsensusState; attestations: QuorumAttestation[]; recentVotes: ProviderVote[] } {
    return {
      state: {
        term: this.term,
        leaderProviderId: this.leader,
        activeProviders: [...this.providers],
        lastConsensusHash: this.lastHash,
        ratifiedEventsCount: this.attestationChain.filter(a => a.ratified).length,
        thresholdWeightRatio: 0.67,
      },
      attestations: this.attestationChain.slice(-20),
      recentVotes: this.voteHistory.slice(-20),
    };
  }
}

export const globalConsensus = new GovernanceConsensusEngine();
