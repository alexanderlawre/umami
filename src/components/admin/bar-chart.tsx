// Minimal, dependency-free SVG bar chart for admin stat panels. Renders a
// series of { label, value } points as evenly-spaced bars scaled to the
// series max. Deliberately hand-rolled (no charting library) to match this
// project's preference for small, purpose-built UI over heavy dependencies.

export type BarChartPoint = { label: string; value: number };

const CHART_HEIGHT = 120;
const BASELINE_PAD = 4;

export function BarChart({
  data,
  color = "#1F5F45",
}: {
  data: BarChartPoint[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barSlot = data.length > 0 ? 100 / data.length : 100;
  const usableHeight = CHART_HEIGHT - BASELINE_PAD;

  return (
    <svg
      viewBox={`0 0 100 ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      className="h-[120px] w-full overflow-visible"
      role="img"
      aria-label="Bar chart"
    >
      {data.map((d, i) => {
        const barHeight = (d.value / max) * usableHeight;
        const x = i * barSlot;
        const width = barSlot * 0.6;
        const y = CHART_HEIGHT - BASELINE_PAD - barHeight;
        return (
          <rect
            key={i}
            x={x + barSlot * 0.2}
            y={y}
            width={width}
            height={Math.max(barHeight, 0.5)}
            fill={color}
          >
            <title>{`${d.label}: ${d.value}`}</title>
          </rect>
        );
      })}
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

export function ChartAxisLabels({ labels }: { labels: string[] }) {
  return (
    <div className="mt-2 flex justify-between text-[10px] text-[#6B7370]">
      {labels.map((label, i) => (
        <span key={i}>{label}</span>
      ))}
    </div>
  );
}
