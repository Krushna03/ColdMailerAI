import React from "react";

const bone = "animate-pulse rounded bg-white/10";

export default function LeadsTableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10 bg-surface-800/60"
      aria-busy="true"
      aria-label="Loading leads table"
    >
      <div className="border-b border-white/10 bg-surface-900/80 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className={`${bone} h-4 w-28`} />
          <div className={`${bone} h-4 w-20`} />
        </div>
      </div>
      <div className="divide-y divide-white/5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-4">
              <div className={`${bone} h-4 w-4 rounded`} />
              <div className="space-y-1.5">
                <div className={`${bone} h-4 w-32 sm:w-44`} />
                <div className={`${bone} h-3 w-24 sm:w-36`} />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <div className={`${bone} h-6 w-20 rounded-full`} />
              <div className={`${bone} h-4 w-12`} />
              <div className={`${bone} h-4 w-16`} />
              <div className={`${bone} h-4 w-24`} />
            </div>
            <div className={`${bone} h-8 w-8 rounded-lg`} />
          </div>
        ))}
      </div>
    </div>
  );
}
