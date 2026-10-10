import { formatDateTime } from "./leadUtils";

interface LeadStatsStripProps {
  stats?: {
    emailsGenerated?: number;
    emailsSent?: number;
    pendingFollowUps?: number;
    lastActivityAt?: string | Date;
  };
}

export default function LeadStatsStrip({ stats }: LeadStatsStripProps) {
  const items = [
    { label: "Generated", value: stats?.emailsGenerated ?? 0, wide: false },
    { label: "Marked sent", value: stats?.emailsSent ?? 0, wide: false },
    { label: "Pending follow-ups", value: stats?.pendingFollowUps ?? 0, wide: false },
    {
      label: "Last activity",
      value: formatDateTime(stats?.lastActivityAt),
      wide: true,
    },
  ];

  return (
    <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-lg border border-white/10 bg-surface-900 p-4"
        >
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            {item.label}
          </p>
          <p
            className={`mt-2 font-semibold text-white tracking-tight ${
              item.wide ? "text-xs sm:text-sm font-sans" : "text-xl sm:text-lg font-mono"
            }`}
          >
            {item.value}
          </p>
        </article>
      ))}
    </section>
  );
}
