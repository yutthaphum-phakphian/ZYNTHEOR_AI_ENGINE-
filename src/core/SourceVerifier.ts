export enum SourceQuality {
  PEER_REVIEWED = 'PEER_REVIEWED',   // เช่น งานวิจัย, เอกสารวิชาการ
  OFFICIAL_DOCS = 'OFFICIAL_DOCS',   // เช่น docs.python.org, react.dev
  COMMUNITY_TRUSTED = 'COMMUNITY',   // เช่น StackOverflow ที่มี Vote สูง
  UNVERIFIED = 'UNVERIFIED'          // บล็อกทั่วไป, ฟอรัม
}

export interface SourceMetadata {
  url: string;
  quality: SourceQuality;
  timestamp: string;
  authorTrustScore?: number;
}

export class SourceVerifier {
  /**
   * ให้คะแนนความน่าเชื่อถือของ URL (ไม่ใช้ AI เดา แต่ใช้ Allowlist/Pattern Matching)
   */
  static verifySource(url: string): SourceMetadata {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    if (hostname.endsWith('.edu') || hostname.endsWith('.gov') || hostname.includes('arxiv.org')) {
      return { url, quality: SourceQuality.PEER_REVIEWED, timestamp: new Date().toISOString() };
    }
    if (hostname.includes('github.com') || hostname.includes('stackoverflow.com') || hostname.endsWith('dev')) {
      return { url, quality: SourceQuality.COMMUNITY_TRUSTED, timestamp: new Date().toISOString() };
    }
    if (hostname.includes('docs.')) {
      return { url, quality: SourceQuality.OFFICIAL_DOCS, timestamp: new Date().toISOString() };
    }
    
    return { url, quality: SourceQuality.UNVERIFIED, timestamp: new Date().toISOString() };
  }
}
