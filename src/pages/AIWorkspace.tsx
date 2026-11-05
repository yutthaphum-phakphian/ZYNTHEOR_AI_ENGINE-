// @ts-nocheck
import React, { useState } from 'react';
import { WorkspaceProjectsPage } from '../components/WorkspaceProjectsPage';

export default function AIWorkspace() {
  const [projects, setProjects] = useState([]);
  const [toast, setToast] = useState('');
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <WorkspaceProjectsPage
        projects={projects}
        setProjects={setProjects}
        add={(p) => setProjects((prev) => [...prev, p])}
        remove={(p) => setProjects((prev) => prev.filter((item) => item.id !== p.id))}
        query=""
        authHeaders={() => ({})}
        setToast={setToast}
        lastBackupAt={lastBackupAt}
        setLastBackupAt={setLastBackupAt}
      />
      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-2 bg-zinc-800 text-white rounded-lg shadow-lg text-xs z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
