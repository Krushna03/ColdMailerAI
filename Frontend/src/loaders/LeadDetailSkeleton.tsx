import React from "react";

const bone = "animate-pulse rounded bg-white/10";

export default function LeadDetailSkeleton() {
  return (
    <div
      className="space-y-5"
      aria-busy="true"
      aria-label="Loading lead details"
    >
      {/* Back link Skeleton */}
      <div className={`${bone} h-4 w-28`} />

      {/* Header Skeleton */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3.5 border-b border-white/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`${bone} h-8 w-48 sm:w-64`} />
              <div className={`${bone} h-6 w-20 rounded-full`} />
            </div>
            <div className={`${bone} h-4 w-60`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className={`${bone} h-9 w-32 rounded-lg`} />
            <div className={`${bone} h-9 w-36 rounded-lg`} />
            <div className={`${bone} h-9 w-36 rounded-lg`} />
          </div>
        </div>
      </div>

      {/* Stats Strip Skeleton */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-surface-800/50 p-4 space-y-2"
          >
            <div className={`${bone} h-3 w-24`} />
            <div className={`${bone} h-7 w-16`} />
          </div>
        ))}
      </section>

      {/* Profile Form Skeleton */}
      <section className="rounded-2xl border border-white/10 bg-surface-800/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`${bone} h-6 w-24`} />
          <div className={`${bone} h-8 w-28 rounded-lg`} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className={`${bone} h-4 w-20`} />
              <div className={`${bone} h-11 w-full rounded-lg`} />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className={`${bone} h-4 w-16`} />
          <div className={`${bone} h-24 w-full rounded-lg`} />
        </div>
      </section>

      {/* Timeline Skeleton */}
      <section className="rounded-2xl border border-white/10 bg-surface-800/50 p-5 space-y-4">
        <div className={`${bone} h-6 w-36`} />
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-surface-900/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`${bone} h-5 w-5 rounded-full`} />
                  <div className={`${bone} h-4 w-32`} />
                </div>
                <div className={`${bone} h-3 w-20`} />
              </div>
              <div className={`${bone} h-3.5 w-full`} />
              <div className={`${bone} h-3.5 w-3/4`} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
