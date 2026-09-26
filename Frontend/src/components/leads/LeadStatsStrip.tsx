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
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/10 bg-surface-800/50 px-4 py-3"
        >
          <p className="text-xs uppercase tracking-wide text-gray-500">{item.label}</p>
          <p
            className={`mt-1 font-semibold text-white ${
              item.wide ? "text-sm" : "text-xl"
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}
