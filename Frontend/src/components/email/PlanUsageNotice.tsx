export interface PlanUsageNoticeProps {
  usage?: any;
  loading?: boolean;
  onUpgrade?: () => void;
  className?: string;
}

export function PlanUsageNotice({
  usage,
  loading,
  onUpgrade,
  className = 'w-full max-w-[350px] mx-auto px-4'
}: PlanUsageNoticeProps) {
  if (loading) {
    return (
      <div className={className}>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300 animate-pulse">
          Checking plan usage...
        </div>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const monthly = usage?.usage?.monthlyEmailGenerations;
  if (!monthly) return null;

  const limit = monthly.limit;
  const used = monthly.used ?? 0;
  const remaining = typeof limit === 'number' ? Math.max(limit - used, 0) : null;
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const nearingLimit = limit ? percent >= 80 : false;

  const resetDate = monthly.windowEnd ? new Date(monthly.windowEnd) : null;
  const resetLabel = resetDate
    ? `Resets on ${resetDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      })}`
    : null;

  return (
    <div className={className}>
      <div
        className={`w-full rounded-2xl border ${
          nearingLimit ? 'border-yellow-400/70 bg-yellow-400/10' : 'border-white/10 bg-white/5'
        } p-4 text-white`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">
              {usage?.plan?.name || 'Current plan'}
            </p>
            <p className="text-base font-semibold">
              {limit != null ? `${used} / ${limit} emails this month` : `${used} emails this month`}
            </p>
            {limit != null ? (
              <p className="text-xs text-gray-400">
                {remaining} remaining{resetLabel ? ` • ${resetLabel}` : ''}
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                Unlimited plan benefits{resetLabel ? ` • ${resetLabel}` : ''}
              </p>
            )}
          </div>
          {nearingLimit && onUpgrade && (
            <button
              type="button"
              onClick={onUpgrade}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand px-3 py-1 text-sm font-medium cursor-pointer"
            >
              Upgrade plan
            </button>
          )}
        </div>
        {limit != null && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full ${nearingLimit ? 'bg-yellow-400' : 'bg-brand'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
