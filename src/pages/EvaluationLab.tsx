import React, { useMemo } from 'react';
import CapabilityRegistryView from '../components/evaluation/CapabilityRegistryView';
import { createUnifiedEvaluation } from '../evaluation/unifiedEngine';

export default function EvaluationLab() {
  const evaluation = useMemo(() => createUnifiedEvaluation(), []);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <CapabilityRegistryView evaluation={evaluation} />
    </div>
  );
}
