// Minimal, dependency-free multi-series SVG line chart — sibling to
// bar-chart.tsx, same "small, purpose-built UI over heavy dependencies"
// philosophy. Renders one or more { label, color, data } series as
// polylines sharing a single x-axis (all series must be the same length,
// one value per day/bucket) and a shared y-scale so they're comparable.

export type LineSeries = {
  label: string;
  color: string;
  data: number[];
};

const CHART_HEIGHT = 120;
const BASELINE_PAD = 4;

export function MultiLineChart({ series }: { series: LineSeries[] }) {
  const pointCount = Math.max(0, ...series.map((s) => s.data.length));
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const usableHeight = CHART_HEIGHT - BASELINE_PAD;

  function pointsFor(data: number[]) {
    if (pointCount <= 1) return "";
    return data
      .map((value, i) => {
        const x = (i / (pointCount - 1)) * 100;
        const y = CHART_HEIGHT - BASELINE_PAD - (value / max) * usableHeight;
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <svg
      viewBox={`0 0 100 ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      className="h-[120px] w-full overflow-visible"
      role="img"
      aria-label="Line chart"
    >
      {series.map((s) => (
        <polyline
          key={s.label}
          points={pointsFor(s.data)}
          fill="none"
          stroke={s.color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        >
          <title>{s.label}</title>
        </polyline>
      ))}
      <line
        x1={0}
        y1={CHART_HEIGHT - BASELINE_PAD}
        x2={100}
        y2={CHART_HEIGHT - BASELINE_PAD}
        stroke="#E8E6E0"
        strokeWidth={0.5}
      />
    </svg>
  );
}

export function ChartLegend({ series }: { series: { label: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4">
      {series.map((s) => (
        <span key={s.label} className="flex items-center gap-1.5 text-xs text-[#6B7370]">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}
