// @ts-nocheck
import React from 'react';
import ModelsPage from '../ModelsPage';

export default function ModelStudio(props: any) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <ModelsPage {...props} />
    </div>
  );
}
