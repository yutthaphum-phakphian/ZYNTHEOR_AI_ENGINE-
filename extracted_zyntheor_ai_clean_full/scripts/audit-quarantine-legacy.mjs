import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const workspaceDataDir = path.join(rootDir, 'workspace_data');
const projectsFile = path.join(workspaceDataDir, 'projects.json');
const backupFile = path.join(workspaceDataDir, 'projects.backup.json');

console.log('===================================================');
console.log('ZYNTHEOR LEGACY DATA AUDIT & QUARANTINE ENGINE');
console.log('===================================================\n');

function runLegacyQuarantineAudit() {
  if (!fs.existsSync(workspaceDataDir)) {
    fs.mkdirSync(workspaceDataDir, { recursive: true });
  }

  let projects = [];
  if (fs.existsSync(projectsFile)) {
    try {
      projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
    } catch (err) {
      console.error('Error reading projects.json:', err.message);
      process.exit(1);
    }
  } else {
    console.log('No projects.json found at workspace_data/projects.json. Nothing to quarantine.');
    return;
  }

  if (!Array.isArray(projects)) {
    console.error('projects.json is not an array.');
    process.exit(1);
  }

  let verifiedCount = 0;
  let newlyQuarantinedCount = 0;
  let alreadyQuarantinedCount = 0;
  const quarantinedList = [];

  const updatedProjects = projects.map((project) => {
    // Check if project has a valid verified tenantId
    const hasVerifiedTenant = Boolean(
      project.tenantId &&
      typeof project.tenantId === 'string' &&
      project.tenantId.trim().length > 0 &&
      project.unclassified !== true
    );

    if (hasVerifiedTenant) {
      verifiedCount++;
      return project;
    }

    // Lacks verified tenantId -> Assign QUARANTINED_UNCLASSIFIED status without guessing tenant
    const wasAlreadyQuarantined = project.status === 'QUARANTINED_UNCLASSIFIED' && project.unclassified === true;
    if (wasAlreadyQuarantined) {
      alreadyQuarantinedCount++;
    } else {
      newlyQuarantinedCount++;
    }

    quarantinedList.push({ id: project.id, name: project.name });

    return {
      ...project,
      status: 'QUARANTINED_UNCLASSIFIED',
      unclassified: true,
      updatedAt: new Date().toISOString(),
    };
  });

  // Create immediate safety backup before writing changes
  if (fs.existsSync(projectsFile)) {
    fs.copyFileSync(projectsFile, backupFile);
  }

  // Atomically write updated projects
  const tmpFile = path.join(workspaceDataDir, `projects.tmp.audit.${Date.now()}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify(updatedProjects, null, 2), 'utf8');
  fs.renameSync(tmpFile, projectsFile);

  console.log(`[Audit Summary]`);
  console.log(`- Total records inspected:        ${projects.length}`);
  console.log(`- Verified tenant records:        ${verifiedCount}`);
  console.log(`- Newly quarantined records:       ${newlyQuarantinedCount}`);
  console.log(`- Previously quarantined records:  ${alreadyQuarantinedCount}`);
  console.log(`- Total quarantined records:      ${newlyQuarantinedCount + alreadyQuarantinedCount}\n`);

  if (quarantinedList.length > 0) {
    console.log('Quarantined Records List (Isolated from normal tenant queries):');
    quarantinedList.forEach((q, idx) => {
      console.log(`  ${idx + 1}. ID: ${q.id} | Name: "${q.name}"`);
    });
    console.log('\nAll unclassified records have been safely isolated with status "QUARANTINED_UNCLASSIFIED".');
    console.log('No legacy data was lost or prematurely assigned to any tenant.');
  } else {
    console.log('All records possess verified tenant ownership. Zero unclassified records found.');
  }

  console.log('\nAudit and quarantine script completed successfully.');
}

runLegacyQuarantineAudit();
