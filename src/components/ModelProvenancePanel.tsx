// @ts-nocheck
import React from 'react';
import { AlertTriangle, CheckCircle2, Database, FileKey2, LockKeyhole, ShieldCheck } from 'lucide-react';

type AnyRecord = Record<string, any>;

export interface ModelProvenancePanelProps {
  model: AnyRecord | null;
  datasetManifest?: AnyRecord | null;
  trainingConfig?: AnyRecord | null;
  trainingStatus?: AnyRecord | null;
  runtimeProbe?: AnyRecord | null;
}

function displayValue(value: unknown, fallback = 'ยังไม่มีข้อมูลยืนยัน') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value ? 'ใช่' : 'ไม่ใช่';
  return String(value);
}

function statusTone(value: unknown) {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('VERIFIED') || normalized.includes('PASSED') || normalized === 'READY') {
    return 'text-emerald-300 border-emerald-800 bg-emerald-950/30';
  }
  if (normalized.includes('UNTRAINED') || normalized.includes('UNVERIFIED') || normalized.includes('NOT_')) {
    return 'text-amber-300 border-amber-800 bg-amber-950/30';
  }
  return 'text-zinc-300 border-zinc-700 bg-zinc-900/70';
}

function StatusChip({ value }: { value: unknown }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-semibold ${statusTone(value)}`}>
      {displayValue(value)}
    </span>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: unknown; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 break-words text-[11px] text-zinc-200 ${mono ? 'font-mono' : ''}`}>
        {displayValue(value)}
      </div>
    </div>
  );
}

export const ModelProvenancePanel: React.FC<ModelProvenancePanelProps> = ({
  model,
  datasetManifest,
  trainingConfig,
  trainingStatus,
  runtimeProbe,
}) => {
  if (!model) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-400">
        เลือกโมเดลจาก Model Registry เพื่อดู metadata และหลักฐาน provenance
      </section>
    );
  }

  const dataset = model.dataset_provenance || {};
  const base = model.base_model || {};
  const spec = model.training_spec || {};
  const checkpoint = model.checkpoints || {};
  const manifest = datasetManifest || {};
  const configModel = trainingConfig?.model || {};
  const configMatchesModel = Boolean(
    trainingConfig &&
    (!base.name || !configModel.base || base.name === configModel.base || base.name.includes(configModel.base) || configModel.base.includes(base.name))
  );
  const matchingConfig = configMatchesModel ? trainingConfig : null;
  const matchingConfigModel = matchingConfig?.model || {};
  const trainingMode = spec.mode || model.training_status || model.status || (configMatchesModel ? matchingConfig?.training?.mode : undefined) || trainingStatus?.trainingStatus;
  const hasCheckpoint = Boolean(checkpoint.checkpoint_digest_sha256 || checkpoint.active_checkpoint);
  const sourceVerification = dataset.human_review_status;
  const registryManifestDigest = dataset.manifest_sha256;
  const registrySamplesDigest = dataset.samples_sha256;
  const runtimeVerification = model.provenance_verification || checkpoint.verification_status || runtimeProbe?.registryCrossCheck;
  const runtimeModelId = runtimeProbe?.modelId;
  const runtimeActualDigest = runtimeProbe?.checkpointSha256Actual;
  const runtimeChecksum = runtimeProbe?.checksumMatched;
  const runtimeModelMatchesSelected = runtimeModelId ? runtimeModelId === model.model_id : null;

  return (
    <section className="rounded-xl border border-cyan-900/70 bg-zinc-900/70 p-4 space-y-4" aria-labelledby="model-provenance-title">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
            <ShieldCheck size={15} /> VERIFIABLE INTELLIGENCE / MODEL PROVENANCE
          </div>
          <h2 id="model-provenance-title" className="mt-1 text-sm font-semibold text-zinc-100">
            {displayValue(model.display_name || model.model_id)}
          </h2>
          <p className="mt-1 break-all font-mono text-[10px] text-zinc-500">{displayValue(model.model_id)}</p>
        </div>
        <StatusChip value={model.status || trainingMode} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200"><LockKeyhole size={14} className="text-cyan-300" /> Training metadata</div>
          <Detail label="Method" value={spec.method || matchingConfig?.training?.method} />
          <Detail label="Precision" value={spec.precision} />
          <Detail label="Learning rate" value={spec.learning_rate || matchingConfig?.training?.learning_rate} mono />
          <Detail label="Seed" value={spec.seed || matchingConfig?.hyperparameters?.random_seed} mono />
          <Detail label="Training status" value={trainingMode} />
        </div>

        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200"><FileKey2 size={14} className="text-amber-300" /> Base model &amp; license</div>
          <Detail label="Base model" value={base.name || matchingConfigModel.base || matchingConfig?.base_model} />
          <Detail label="Revision" value={base.revision} mono />
          <Detail label="License" value={base.license || matchingConfigModel.license} />
          <Detail label="Attribution" value={base.provider_attribution} />
          <Detail label="Model type" value={model.model_type || spec.method || 'ไม่ได้ระบุ'} />
        </div>

        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200"><Database size={14} className="text-emerald-300" /> Dataset provenance</div>
          <Detail label="Manifest (registry record)" value={dataset.manifest_name} />
          <Detail label="Version (registry record)" value={dataset.manifest_version} mono />
          <Detail label="Samples (registry record)" value={dataset.samples_count} />
          <Detail label="Manifest SHA-256 (recorded)" value={registryManifestDigest} mono />
          <Detail label="Samples SHA-256 (recorded)" value={registrySamplesDigest} mono />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Detail label="Dataset review status" value={sourceVerification} />
        <Detail label="Training license claim" value={dataset.training_license_claim} />
        <Detail label="Checkpoint SHA-256 (recorded)" value={checkpoint.checkpoint_digest_sha256} mono />
        <Detail label="Runtime digest verification" value={runtimeVerification} />
        <Detail label="Runtime model id" value={runtimeModelId} mono />
        <Detail label="Runtime checkpoint SHA-256 (actual)" value={runtimeActualDigest} mono />
        <Detail label="Runtime checksum match" value={runtimeChecksum} />
      </div>

      {!configMatchesModel && trainingConfig && (
        <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3 text-[11px] text-amber-200">
          ไม่แสดง training config ส่วนกลาง เพราะยังยืนยันไม่ได้ว่าเป็น config ของโมเดลที่เลือก
        </div>
      )}

      {runtimeModelMatchesSelected === false && (
        <div className="rounded-lg border border-red-900 bg-red-950/20 p-3 text-[11px] text-red-200">
          Runtime model id ไม่ตรงกับ Registry model ที่เลือก จึงไม่ถือว่าเป็น provenance ของโมเดลเดียวกัน
        </div>
      )}

      <div className={`flex items-start gap-2 rounded-lg border p-3 text-[11px] ${hasCheckpoint ? 'border-emerald-900 bg-emerald-950/20 text-emerald-200' : 'border-amber-900 bg-amber-950/20 text-amber-200'}`}>
        {hasCheckpoint ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
        <span>
          {hasCheckpoint
            ? 'มี checkpoint digest ที่ registry บันทึกไว้ แต่ยังต้องใช้ผล verify จาก runtime แยกต่างหากก่อนถือเป็น production evidence'
            : 'ยังไม่มี checkpoint weights ที่ยืนยันได้ใน registry — panel นี้ไม่ประกาศว่าโมเดลฝึกเสร็จ และแยกข้อมูลที่ยังไม่ยืนยันไว้อย่างชัดเจน'}
        </span>
      </div>
    </section>
  );
};

export default ModelProvenancePanel;
