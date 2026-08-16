import { formatDateTime } from "./leadUtils";

export default function LeadStatsStrip({ stats }) {
  
  const items = [
    { label: "Generated", value: stats?.emailsGenerated ?? 0 },
    { label: "Marked sent", value: stats?.emailsSent ?? 0 },
    { label: "Pending follow-ups", value: stats?.pendingFollowUps ?? 0 },
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
              item.wide ? "text-sm" : "text-2xl"
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}
