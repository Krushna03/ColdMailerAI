const Highlights = ({ cards }) => (
  <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 font-sans">
    {cards.map(({ title, value, subtext, icon }) => {
      const IconComponent = icon;
      return (
        <div
          key={title}
          className="rounded-lg border border-white/10 bg-surface-900 p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
            <IconComponent className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <p className="mt-2 text-lg sm:text-xl font-semibold text-white tracking-tight font-mono">{value}</p>
          <p className="text-[11px] text-gray-400 mt-1">{subtext}</p>
        </div>
      );
    })}
  </section>
);

export default Highlights;

