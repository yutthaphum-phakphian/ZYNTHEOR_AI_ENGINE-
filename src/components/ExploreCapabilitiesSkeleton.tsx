import React from 'react';

export interface ExploreCapabilitiesSkeletonProps {
  count?: number;
}

export function ExploreCapabilitiesSkeleton({ count = 6 }: ExploreCapabilitiesSkeletonProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full"
      aria-busy="true"
      aria-label="Loading capabilities..."
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-[16px] border border-white/[0.06] bg-[#0b1020]/80 p-4 space-y-3 animate-pulse select-none min-h-[100px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Symbol Icon Placeholder */}
              <div className="w-5 h-5 rounded-md bg-white/10" />
              {/* Title Placeholder */}
              <div className="w-24 h-4 rounded-md bg-white/15" />
            </div>
            {/* Subtitle Badge Placeholder */}
            <div className="w-12 h-3 rounded bg-white/10" />
          </div>

          {/* Subtext Paragraph Placeholder */}
          <div className="space-y-1.5 pt-1">
            <div className="w-full h-3 rounded bg-white/10" />
            <div className="w-2/3 h-3 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ExploreCapabilitiesSkeleton;
