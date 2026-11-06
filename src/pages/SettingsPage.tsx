import React from 'react';
import { SettingsCenter } from '../components/SettingsCenter';

export default function SettingsPage() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#050810] text-white">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <SettingsCenter />
      </div>
    </div>
  );
}
