// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { workspaceGraphService } from './workspaceGraph.ts';
import { CodeIntelligence } from '../../lib/code-intelligence.ts';

export interface ImpactSymbolRef {
  name: string;
  type: string;
  file: string;
  line: number;
  endLine?: number;
  exported?: boolean;
}

export interface RegressionTestRecommendation {
  testFile: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  relevance: 'DIRECT' | 'TRANSITIVE' | 'SECURITY_BASELINE';
}

export interface ImpactAnalysisOptions {
  diff?: string;
  proposedChangeSummary?: string;
  lang?: 'th' | 'en';
}

export interface ImpactAnalysisReport {
  targetFile: string;
  changeType: 'schema' | 'api' | 'service' | 'component' | 'config' | 'test' | 'other';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // File level impact
  affectedFiles: string[];
  directlyAffectedFiles: string[];
  indirectlyAffectedFiles: string[];
  dependentModules: string[];
  
  // AST level impact
  affectedFunctionsAndClasses: ImpactSymbolRef[];
  affectedApisAndInterfaces: ImpactSymbolRef[];
  breakingApiContracts: string[];
  affectedDbFields: string[];
  
  // Regression tests
  potentiallyBrokenTests: string[];
  recommendedRegressionTests: RegressionTestRecommendation[];
  
  // Risk & Security
  securityImplications: string[];
  potentialRegressionAreas: string[];
  dependencyRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  // 4-Tier Categorization
  verifiedFacts: string[];
  analysis: string[];
  hypotheses: string[];
  unknowns: string[];

  // Backward compatibility
  verifiedEvidence: string[];
  recommendations: string[];
  generatedAt: string;
}

function parseTouchedLinesFromDiff(diffText: string): Set<number> {
  const lines = new Set<number>();
  if (!diffText || typeof diffText !== 'string') return lines;

  let currentLine = 0;
  for (const row of diffText.split(/\r?\n/)) {
    const hunkMatch = row.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      currentLine = parseInt(hunkMatch[1], 10);
      continue;
    }
    if (row.startsWith('+') && !row.startsWith('+++')) {
      lines.add(currentLine);
      currentLine += 1;
    } else if (row.startsWith(' ') || row.startsWith('-')) {
      if (!row.startsWith('---')) {
        if (!row.startsWith('-')) currentLine += 1;
      }
    }
  }
  return lines;
}

export class ChangeImpactEngine {
  public analyzeImpact(
    targetFile: string,
    optionsOrDiff?: string | ImpactAnalysisOptions
  ): ImpactAnalysisReport {
    let diff = '';
    let proposedChangeSummary = '';
    let lang: 'th' | 'en' = 'th';

    if (typeof optionsOrDiff === 'string') {
      if (optionsOrDiff.startsWith('diff --git') || optionsOrDiff.includes('@@ ') || optionsOrDiff.includes('\n+')) {
        diff = optionsOrDiff;
      } else {
        proposedChangeSummary = optionsOrDiff;
      }
    } else if (optionsOrDiff && typeof optionsOrDiff === 'object') {
      diff = optionsOrDiff.diff || '';
      proposedChangeSummary = optionsOrDiff.proposedChangeSummary || '';
      lang = optionsOrDiff.lang || 'th';
    }

    const graphDetails = workspaceGraphService.getWorkspaceGraph();
    const targetNorm = targetFile.replace(/\\/g, '/');
    const isThai = lang === 'th';

    const directlyAffectedSet = new Set<string>();
    const indirectlyAffectedSet = new Set<string>();
    const dependentModulesSet = new Set<string>();
    const breakingApiContractsSet = new Set<string>();
    const potentiallyBrokenTestsSet = new Set<string>();
    const affectedDbFieldsSet = new Set<string>();
    const securityImplications: string[] = [];
    const potentialRegressionAreas: string[] = [];
    const recommendedRegressionTests: RegressionTestRecommendation[] = [];

    // 1. Direct Dependents
    for (const edge of graphDetails.graph.edges) {
      if (edge.targetFile === targetNorm) {
        directlyAffectedSet.add(edge.sourceFile);
        if (edge.sourceFile.startsWith('tests/') || edge.sourceFile.startsWith('src/tests/')) {
          potentiallyBrokenTestsSet.add(edge.sourceFile);
        } else {
          dependentModulesSet.add(edge.sourceFile);
        }
      }
    }

    // 2. Transitive (Indirect) Dependents
    const queue = Array.from(directlyAffectedSet);
    const visited = new Set<string>(queue);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of graphDetails.graph.edges) {
        if (edge.targetFile === current && !visited.has(edge.sourceFile) && edge.sourceFile !== targetNorm) {
          visited.add(edge.sourceFile);
          indirectlyAffectedSet.add(edge.sourceFile);
          queue.push(edge.sourceFile);
          if (edge.sourceFile.startsWith('tests/') || edge.sourceFile.startsWith('src/tests/')) {
            potentiallyBrokenTestsSet.add(edge.sourceFile);
          } else {
            dependentModulesSet.add(edge.sourceFile);
          }
        }
      }
    }

    // 3. Inspect target file AST & affected functions / classes / interfaces
    const affectedFunctionsAndClasses: ImpactSymbolRef[] = [];
    const affectedApisAndInterfaces: ImpactSymbolRef[] = [];
    let fileSha256 = '';
    let fileSize = 0;
    let fileExistsOnDisk = false;

    try {
      const fullPath = path.resolve(process.cwd(), targetNorm);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        fileExistsOnDisk = true;
        fileSize = content.length;
        fileSha256 = crypto.createHash('sha256').update(content).digest('hex');

        if (targetNorm.endsWith('.ts') || targetNorm.endsWith('.tsx') || targetNorm.endsWith('.js') || targetNorm.endsWith('.mjs')) {
          const ci = new CodeIntelligence();
          const analysis = ci.analyze(content, targetNorm);
          const touchedLines = parseTouchedLinesFromDiff(diff);
          const hasDiffFilter = touchedLines.size > 0;

          for (const sym of analysis.symbols) {
            const symStart = sym.line;
            const symEnd = sym.endLine || sym.line;
            let isSymbolTouched = true;

            if (hasDiffFilter) {
              isSymbolTouched = false;
              for (let l = symStart; l <= symEnd; l += 1) {
                if (touchedLines.has(l)) {
                  isSymbolTouched = true;
                  break;
                }
              }
            }

            if (!isSymbolTouched) continue;

            const ref: ImpactSymbolRef = {
              name: sym.name,
              type: sym.type,
              file: targetNorm,
              line: sym.line,
              endLine: sym.endLine,
              exported: sym.exported,
            };

            if (sym.type === 'function' || sym.type === 'class' || sym.type === 'method' || sym.type === 'react-component') {
              affectedFunctionsAndClasses.push(ref);
            } else if (sym.type === 'interface' || sym.type === 'type' || sym.type === 'api-route') {
              affectedApisAndInterfaces.push(ref);
            }
          }
        }
      }
    } catch {
      // In-memory or virtual proposal
    }

    // 4. Change Type & Risk Classification
    let changeType: ImpactAnalysisReport['changeType'] = 'service';
    let riskLevel: ImpactAnalysisReport['riskLevel'] = 'LOW';
    let dependencyRisk: ImpactAnalysisReport['dependencyRisk'] = 'LOW';

    if (targetNorm.includes('schema') || targetNorm.includes('database')) {
      changeType = 'schema';
      riskLevel = 'CRITICAL';
      dependencyRisk = 'HIGH';
      affectedDbFieldsSet.add('tenant_id');
      affectedDbFieldsSet.add('role');
      affectedDbFieldsSet.add('status');
      securityImplications.push(
        isThai
          ? 'การเปลี่ยนแปลงโครงสร้างฐานข้อมูล: ต้องตรวจสอบการแยกข้อมูลระหว่างผู้เช่า (Cross-tenant data isolation)'
          : 'Database schema alteration: Cross-tenant data isolation must be verified.'
      );
      potentialRegressionAreas.push(
        isThai
          ? 'การสืบค้นข้อมูลเฉพาะผู้เช่า (Tenant-scoped queries) และการย้อนกลับ Migration'
          : 'Tenant scoped queries and migration rollbacks'
      );
    } else if (targetNorm.includes('routes') || targetNorm.includes('server')) {
      changeType = 'api';
      riskLevel = 'HIGH';
      dependencyRisk = 'HIGH';
      breakingApiContractsSet.add(`API Contract in ${targetNorm}`);
      securityImplications.push(
        isThai
          ? 'การแก้ไข API Route: ต้องตรวจสอบ Middleware ยืนยันตัวตน และการจำกัดอัตราเรียกใช้งาน (Rate-limiting)'
          : 'API route alteration: Verify authentication middleware and rate-limiting enforcement.'
      );
      potentialRegressionAreas.push(
        isThai
          ? 'Client API consumers และชุดทดสอบการทำงานร่วมกัน (Integration test suites)'
          : 'Client API consumers and integration test suites'
      );
    } else if (targetNorm.includes('auth') || targetNorm.includes('rbac') || targetNorm.includes('billing') || targetNorm.includes('patchApplier') || targetNorm.includes('repairGovernance')) {
      changeType = 'service';
      riskLevel = 'HIGH';
      dependencyRisk = 'HIGH';
      securityImplications.push(
        isThai
          ? 'การแก้ไขบริการความปลอดภัยและสิทธิ์: ต้องคงระบบตรวจสอบสิทธิ์แบบ Fail-closed อย่างสมบูรณ์'
          : 'Authorization service modification: Fail-closed role checks must remain intact.'
      );
      potentialRegressionAreas.push(
        isThai
          ? 'การตรวจสอบเซสชัน (Session resolution) และตารางสิทธิ์ (Permission matrix validation)'
          : 'Session resolution and permission matrix validation'
      );
    } else if (targetNorm.includes('components')) {
      changeType = 'component';
      riskLevel = 'MEDIUM';
      dependencyRisk = 'LOW';
      potentialRegressionAreas.push(
        isThai
          ? 'การแสดงผล UI, การซิงค์สถานะ (State synchronization) และการเข้าถึงด้วยแป้นพิมพ์'
          : 'UI rendering, state synchronization, and keyboard accessibility'
      );
    } else if (targetNorm.includes('config') || targetNorm === 'package.json') {
      changeType = 'config';
      riskLevel = 'HIGH';
      dependencyRisk = 'CRITICAL';
      securityImplications.push(
        isThai
          ? 'การเปลี่ยนแปลงการตั้งค่าบิลด์หรือรันไทม์: ตรวจสอบการผูกพอร์ต 3000 และความสมบูรณ์ของ Dependencies'
          : 'Build or runtime configuration change: Verify port 3000 binding and dependency integrity.'
      );
      potentialRegressionAreas.push(
        isThai
          ? 'การสตาร์ตคอนเทนเนอร์, Dev Server Initialization และ Module Resolution'
          : 'Container startup, dev server initialization, and module resolution'
      );
    }

    const totalAffected = directlyAffectedSet.size + indirectlyAffectedSet.size;
    if (totalAffected > 6 && (riskLevel === 'LOW' || riskLevel === 'MEDIUM')) {
      riskLevel = 'HIGH';
      dependencyRisk = 'HIGH';
    }

    // 5. Build Regression Test Recommendations
    for (const testFile of potentiallyBrokenTestsSet) {
      const isDirect = directlyAffectedSet.has(testFile);
      recommendedRegressionTests.push({
        testFile,
        priority: isDirect ? 'HIGH' : 'MEDIUM',
        relevance: isDirect ? 'DIRECT' : 'TRANSITIVE',
        reason: isDirect
          ? (isThai ? `อิมพอร์ตตรงจากโมดูลเป้าหมาย ${targetNorm}` : `Directly imports target module ${targetNorm}`)
          : (isThai ? `ทดสอบการทำงานข้ามโมดูลที่ได้รับผลกระทบทางอ้อม` : `Covers transitive dependents of ${targetNorm}`),
      });
    }

    // Baseline security / integrity test recommendations for critical components
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      if (!potentiallyBrokenTestsSet.has('tests/patch-security-regression.test.ts')) {
        recommendedRegressionTests.push({
          testFile: 'tests/patch-security-regression.test.ts',
          priority: 'HIGH',
          relevance: 'SECURITY_BASELINE',
          reason: isThai ? 'เกณฑ์ความปลอดภัยขั้นต่ำและการป้องกันการถดถอยของสิทธิ์' : 'Baseline patch containment and security guardrails',
        });
      }
      if (!potentiallyBrokenTestsSet.has('tests/phase8-repository-intelligence.test.ts')) {
        recommendedRegressionTests.push({
          testFile: 'tests/phase8-repository-intelligence.test.ts',
          priority: 'HIGH',
          relevance: 'SECURITY_BASELINE',
          reason: isThai ? 'การตรวจสอบความสมบูรณ์ของ AST และ Repository Analysis' : 'AST parsing and repository intelligence regression verification',
        });
      }
    }

    // 6. Partition into 4 Distinct Categorical Layers
    const verifiedFacts: string[] = [];
    const analysis: string[] = [];
    const hypotheses: string[] = [];
    const unknowns: string[] = [];

    // VERIFIED FACTS: Grounded in filesystem and AST
    if (fileExistsOnDisk) {
      verifiedFacts.push(
        isThai
          ? `ไฟล์ '${targetNorm}' ตรวจสอบพบใน Repository จริง (ขนาด ${fileSize} ไบต์, SHA-256: ${fileSha256.slice(0, 16)}...)`
          : `File '${targetNorm}' verified in repository filesystem (${fileSize} bytes, SHA-256: ${fileSha256.slice(0, 16)}...)`
      );
    } else {
      verifiedFacts.push(
        isThai
          ? `ไฟล์ '${targetNorm}' เป็นไฟล์ใหม่หรือไฟล์ข้อเสนอที่ยังไม่ได้บันทึกลงดิสก์`
          : `File '${targetNorm}' is a newly proposed or unwritten virtual file`
      );
    }

    verifiedFacts.push(
      isThai
        ? `พบโมดูลที่พึ่งพาไฟล์นี้โดยตรงจำนวน ${directlyAffectedSet.size} ไฟล์ จากกราฟ Dependency ของ Repository จริง`
        : `Identified ${directlyAffectedSet.size} direct dependent file(s) from real repository dependency graph.`
    );
    verifiedFacts.push(
      isThai
        ? `พบโมดูลที่ได้รับผลกระทบต่อเนื่อง (Transitive) จำนวน ${indirectlyAffectedSet.size} ไฟล์`
        : `Identified ${indirectlyAffectedSet.size} transitive (indirect) dependent file(s).`
    );

    if (affectedFunctionsAndClasses.length > 0) {
      const names = affectedFunctionsAndClasses.slice(0, 5).map(s => s.name).join(', ');
      const more = affectedFunctionsAndClasses.length > 5 ? ` +${affectedFunctionsAndClasses.length - 5}` : '';
      verifiedFacts.push(
        isThai
          ? `สกัด Function และ Class จาก AST ที่เกี่ยวข้อง: ${names}${more}`
          : `AST extracted ${affectedFunctionsAndClasses.length} relevant function(s)/class(es): ${names}${more}`
      );
    }

    if (affectedApisAndInterfaces.length > 0) {
      const names = affectedApisAndInterfaces.slice(0, 5).map(s => s.name).join(', ');
      const more = affectedApisAndInterfaces.length > 5 ? ` +${affectedApisAndInterfaces.length - 5}` : '';
      verifiedFacts.push(
        isThai
          ? `สกัด Interface, Type และ API Routes จาก AST: ${names}${more}`
          : `AST extracted ${affectedApisAndInterfaces.length} interface(s)/route(s): ${names}${more}`
      );
    }

    // ANALYSIS: Deductive structural conclusions
    analysis.push(
      isThai
        ? `จัดหมวดหมู่การเปลี่ยนแปลงเป็นประเภท '${changeType}' พร้อมระดับความเสี่ยงระดับ '${riskLevel}'`
        : `Classified change category as '${changeType}' with assessed risk level '${riskLevel}'.`
    );
    analysis.push(
      isThai
        ? `รัศมีผลกระทบรวม (Total Blast Radius): ${totalAffected} ไฟล์ในระบบ`
        : `Total blast radius calculated at ${totalAffected} file(s) across workspace.`
    );
    if (potentiallyBrokenTestsSet.size > 0) {
      analysis.push(
        isThai
          ? `ตรวจพบชุดทดสอบที่ได้รับผลกระทบโดยตรงและโดยอ้อม ${potentiallyBrokenTestsSet.size} ไฟล์`
          : `Detected ${potentiallyBrokenTestsSet.size} test file(s) in direct and indirect blast radius.`
      );
    }

    // HYPOTHESES: Risk hypotheses and potential regression scenarios
    if (changeType === 'schema') {
      hypotheses.push(
        isThai
          ? 'การแก้ไข Column ใน Schema โดยไม่มีค่า Default อาจทำให้คำสั่ง SELECT หรือ INSERT เดิมล้มเหลว'
          : 'Altering schema columns without default values could fail existing read or insert queries.'
      );
      hypotheses.push(
        isThai
          ? 'หากมีการเปลี่ยน Foreign Key หรือ Unique Constraints อาจกระทบต่อกระบวนการ Migration แบบย้อนกลับ'
          : 'Altering foreign keys or unique constraints may disrupt automated rollback migrations.'
      );
    } else if (changeType === 'api') {
      hypotheses.push(
        isThai
          ? 'การเปลี่ยน Request Body หรือ Response Shape อาจทำให้ Client UI หรือ Third-party Consumers ล้มเหลว'
          : 'Changes to request validation schemas or response shapes may reject previously valid payloads.'
      );
    } else if (changeType === 'service') {
      hypotheses.push(
        isThai
          ? 'การแก้ไขตรรกะในฟังก์ชันอาจส่งผลข้างเคียง (Side-effects) ต่อ State หรือ Async Lock ในระบบ'
          : 'Function signature or internal logic alterations may cause unexpected side effects or lock timeouts in dependent callers.'
      );
    } else {
      hypotheses.push(
        isThai
          ? 'การเปลี่ยน Props หรือ State ภายในคอมโพเนนต์อาจกระตุ้น Cascading Re-renders ในส่วนที่เชื่อมโยง'
          : 'Component prop or state changes may trigger cascading re-renders or missing prop errors.'
      );
    }

    // UNKNOWN: Non-statically determinable factors
    unknowns.push(
      isThai
        ? 'การเรียกใช้แบบไดนามิก (Dynamic Reflection หรือ string-interpolated imports) ไม่สามารถประเมินได้จาก Static AST'
        : 'Dynamic imports, reflection, or dynamically constructed module paths cannot be evaluated via static AST.'
    );
    unknowns.push(
      isThai
        ? 'ภาระโหลดในระบบจริง (Production Concurrency Load) และพฤติกรรมของเครือข่ายภายนอกไม่อาจทราบได้จนกว่าจะรัน Sandbox'
        : 'Production concurrency patterns, actual network latency, and external service responses remain unknown without live execution.'
    );
    unknowns.push(
      isThai
        ? 'ข้อมูลทดสอบของผู้ใช้จริง (Edge-case Input Data) ที่ไม่ได้อยู่ใน Test Fixtures ยังไม่สามารถครอบคลุมได้ทั้งหมด'
        : 'Runtime user edge-case inputs not represented in current test fixtures remain unknown.'
    );

    // Recommendations
    const recommendations: string[] = [];
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      recommendations.push(
        isThai
          ? 'ต้องผ่าน Human Approval Gate ก่อนนำแพตช์ไปประยุกต์ใช้งานจริง'
          : 'Require Human Approval Gate before applying patch.'
      );
      recommendations.push(
        isThai
          ? `รันชุดทดสอบถดถอยทั้งหมดที่เกี่ยวข้อง (${recommendedRegressionTests.length} ชุดทดสอบ)`
          : `Run full automated regression test suite (${recommendedRegressionTests.length} test suites affected).`
      );
    }
    recommendations.push(
      isThai
        ? 'ตรวจสอบความเข้ากันได้ย้อนหลังของ API Signatures และ Interface Contracts'
        : 'Verify API response signatures and backwards compatibility.'
    );

    const allAffectedFiles = Array.from(new Set([...directlyAffectedSet, ...indirectlyAffectedSet]));

    return {
      targetFile: targetNorm,
      changeType,
      riskLevel,
      affectedFiles: allAffectedFiles,
      directlyAffectedFiles: Array.from(directlyAffectedSet),
      indirectlyAffectedFiles: Array.from(indirectlyAffectedSet),
      dependentModules: Array.from(dependentModulesSet),
      affectedFunctionsAndClasses,
      affectedApisAndInterfaces,
      breakingApiContracts: Array.from(breakingApiContractsSet),
      potentiallyBrokenTests: Array.from(potentiallyBrokenTestsSet),
      recommendedRegressionTests,
      affectedDbFields: Array.from(affectedDbFieldsSet),
      securityImplications,
      potentialRegressionAreas,
      dependencyRisk,
      verifiedFacts,
      analysis,
      hypotheses,
      unknowns,
      verifiedEvidence: verifiedFacts, // backwards compatibility
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const changeImpactEngine = new ChangeImpactEngine();
export default changeImpactEngine;
