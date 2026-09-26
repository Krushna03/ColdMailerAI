const bone = "bg-surface-700/80 animate-pulse rounded";

function CardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-700 bg-surface-850 shadow-lg">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-800 bg-surface-800">
        <div className="flex items-center gap-2">
          <div className={`${bone} h-5 w-16 rounded-full`} />
          <div className={`${bone} h-3 w-20`} />
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`${bone} h-7 w-7 rounded-full`} />
          <div className={`${bone} h-7 w-7 rounded-full`} />
        </div>
      </div>
      <div className="py-4 px-2 sm:px-4 space-y-3">
        <div>
          <div className={`${bone} h-3 w-14 mb-1.5`} />
          <div className={`${bone} h-10 w-full rounded-lg`} />
        </div>
        <div>
          <div className={`${bone} h-3 w-10 mb-1.5`} />
          <div className="bg-surface-900 border border-gray-800 rounded-lg overflow-hidden p-3 space-y-2.5">
            <div className={`${bone} h-3 w-full`} />
            <div className={`${bone} h-3 w-[92%]`} />
            <div className={`${bone} h-3 w-[88%]`} />
            <div className={`${bone} h-3 w-[95%]`} />
            <div className={`${bone} h-3 w-[70%]`} />
            <div className={`${bone} h-3 w-full`} />
            <div className={`${bone} h-3 w-[85%]`} />
            <div className={`${bone} h-3 w-[60%]`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmailHistorySkeleton() {
  return (
    <div className="w-full" aria-busy="true" aria-label="Loading email history">
      {/* Mobile prompt bubble */}
      <div className="lg:hidden flex items-start gap-2.5 mb-4">
        <div className={`${bone} shrink-0 h-8 w-8 rounded-full`} />
        <div className="flex-1 bg-surface-800 border border-gray-700 rounded-2xl rounded-tl-sm px-3.5 py-3 space-y-2">
          <div className={`${bone} h-3.5 w-[90%]`} />
          <div className={`${bone} h-3.5 w-[70%]`} />
        </div>
      </div>

      <div className="w-full lg:flex lg:mt-4">
        <div className="flex flex-col lg:w-[65%] lg:mr-6 z-0">
          <div className="space-y-4 lg:space-y-6 pb-28 lg:pb-4">
            <CardSkeleton />
            <div className="hidden sm:block">
              <CardSkeleton />
            </div>
          </div>
        </div>

        {/* Desktop side panel */}
        <div className="hidden lg:block lg:w-[35%] sticky bottom-2">
          <div className={`${bone} h-8 w-32 rounded-full mb-4`} />
          <div className="mb-4 bg-surface-850 border border-gray-700 rounded-2xl p-4 shadow-lg space-y-2">
            <div className={`${bone} h-3.5 w-full`} />
            <div className={`${bone} h-3.5 w-[85%]`} />
            <div className={`${bone} h-3.5 w-[60%]`} />
          </div>
          <div className="flex flex-col bg-surface-850 border border-gray-700 rounded-2xl p-2 shadow-lg min-h-[150px]">
            <div className="flex-1 space-y-2 px-2 pt-2">
              <div className={`${bone} h-3 w-[80%]`} />
              <div className={`${bone} h-3 w-[55%]`} />
            </div>
            <div className="flex justify-end items-center gap-2 p-1">
              <div className={`${bone} h-9 w-9 rounded-full`} />
              <div className={`${bone} h-9 w-9 rounded-full`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
