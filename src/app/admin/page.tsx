import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BarChart, ChartAxisLabels, type BarChartPoint } from "@/components/admin/bar-chart";

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-2xl font-bold text-[#1A1D1B]">{value}</p>
      <p className="mt-1 text-xs text-[#6B7370]">{label}</p>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-[#E8E6E0] bg-white p-4 transition hover:border-[#1B4332] hover:shadow-sm"
      >
        {content}
      </Link>
    );
  }
  return <div className="rounded-2xl border border-[#E8E6E0] bg-white p-4">{content}</div>;
}

function Leaderboard({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: { label: string; count: number }[];
  emptyLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-[#E8E6E0] bg-white p-5">
      <h2 className="text-sm font-semibold text-[#1A1D1B]">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-[#6B7370]">{emptyLabel}</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {rows.map((row, i) => (
            <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-xs font-medium text-[#6B7370]">{i + 1}.</span>
                <span className="truncate text-[#1A1D1B]">{row.label}</span>
              </span>
              <span className="shrink-0 text-xs text-[#6B7370]">{row.count}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${period}`;
});

const SIGNUP_WINDOW_DAYS = 30;

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function shortDateLabel(key: string): string {
  const [, month, day] = key.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[Number(month) - 1]} ${Number(day)}`;
}

// Builds a zero-filled daily bucket series for the last `days` days (inclusive
// of today), so the chart always has a fixed-width x-axis even when there's
// no data yet for some days.
function buildDailySeries(timestamps: Date[], days: number): BarChartPoint[] {
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const key = dateKey(ts);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const series: BarChartPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dateKey(d);
    series.push({ label: shortDateLabel(key), value: counts.get(key) ?? 0 });
  }
  return series;
}

export default async function AdminPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const signupWindowAgo = new Date(Date.now() - SIGNUP_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [
    userCount,
    newUsers7d,
    recipeCount,
    activeRecipeCount,
    unverifiedRecipeCount,
    cookLogCount,
    cookLogs7d,
    interactionCounts,
    mostCookedRaw,
    mostStarredRaw,
    cookHourCounts,
    recentSignups,
    premiumUserCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.recipe.count(),
    prisma.recipe.count({ where: { isActive: true } }),
    prisma.recipe.count({ where: { allergenReviewStatus: "UNVERIFIED" } }),
    prisma.cookLog.count(),
    prisma.cookLog.count({ where: { cookedAt: { gte: sevenDaysAgo } } }),
    prisma.interaction.groupBy({ by: ["type"], _count: true }),
    prisma.cookLog.groupBy({
      by: ["recipeId"],
      _count: { recipeId: true },
      orderBy: { _count: { recipeId: "desc" } },
      take: 5,
    }),
    prisma.interaction.groupBy({
      by: ["recipeId"],
      where: { type: "STAR" },
      _count: { recipeId: true },
      orderBy: { _count: { recipeId: "desc" } },
      take: 5,
    }),
    prisma.interaction.groupBy({
      by: ["localHour"],
      where: { type: "COOK" },
      _count: { localHour: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: signupWindowAgo } },
      select: { createdAt: true },
    }),
    prisma.user.count({ where: { isPremium: true } }),
  ]);

  const signupSeries = buildDailySeries(
    recentSignups.map((u) => u.createdAt),
    SIGNUP_WINDOW_DAYS,
  );
  // Premium tier isn't live yet — the paid-users chart stays a visible but
  // inert placeholder (flat/empty series) until real subscription data
  // exists, at which point this can be replaced with a real daily series
  // the same way signups is built above.
  const paidPlaceholderSeries = buildDailySeries([], SIGNUP_WINDOW_DAYS);
  const chartAxisLabels = [
    signupSeries[0]?.label ?? "",
    signupSeries[Math.floor(signupSeries.length / 2)]?.label ?? "",
    signupSeries[signupSeries.length - 1]?.label ?? "",
  ];

  const recipeIds = [
    ...new Set([...mostCookedRaw.map((r) => r.recipeId), ...mostStarredRaw.map((r) => r.recipeId)]),
  ];
  const titledRecipes = recipeIds.length
    ? await prisma.recipe.findMany({
        where: { id: { in: recipeIds } },
        select: { id: true, title: true },
      })
    : [];
  const titleById = new Map(titledRecipes.map((r) => [r.id, r.title]));

  const mostCooked = mostCookedRaw.map((r) => ({
    label: titleById.get(r.recipeId) ?? "(deleted recipe)",
    count: r._count.recipeId,
  }));
  const mostStarred = mostStarredRaw.map((r) => ({
    label: titleById.get(r.recipeId) ?? "(deleted recipe)",
    count: r._count.recipeId,
  }));

  const peakCookingHour = cookHourCounts.reduce<{ hour: number; count: number } | null>(
    (best, row) => {
      const count = row._count.localHour;
      if (!best || count > best.count) return { hour: row.localHour, count };
      return best;
    },
    null,
  );

  const stats = {
    userCount,
    newUsers7d,
    recipeCount,
    activeRecipeCount,
    unverifiedRecipeCount,
    cookLogCount,
    cookLogs7d,
    interactionCounts: interactionCounts.map((i) => ({ type: i.type, count: i._count })),
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">Overview</h1>
      <p className="mt-1 text-sm text-[#6B7370]">Usage stats across the catalog and userbase.</p>

      <div className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Users" value={stats.userCount} href="/admin/users" />
        <StatCard label="New users (7d)" value={stats.newUsers7d} />
        <StatCard label="Recipes" value={stats.recipeCount} href="/admin/recipes" />
        <StatCard label="Active recipes" value={stats.activeRecipeCount} href="/admin/recipes?filter=active" />
        <StatCard
          label="Unverified allergens"
          value={stats.unverifiedRecipeCount}
          href="/admin/recipes?filter=unverified"
        />
        <StatCard label="Cook logs" value={stats.cookLogCount} />
        <StatCard label="Cook logs (7d)" value={stats.cookLogs7d} />
        <StatCard
          label="Peak cooking hour"
          value={peakCookingHour ? HOUR_LABELS[peakCookingHour.hour] : "—"}
        />
        {stats.interactionCounts.map((i) => (
          <StatCard key={i.type} label={i.type} value={i.count} />
        ))}
        <StatCard label="Premium users" value={premiumUserCount} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-[#E8E6E0] bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#1A1D1B]">User signups</h2>
            <span className="text-xs text-[#6B7370]">Last {SIGNUP_WINDOW_DAYS} days</span>
          </div>
          <div className="mt-4">
            <BarChart data={signupSeries} />
            <ChartAxisLabels labels={chartAxisLabels} />
          </div>
        </section>

        <section className="relative rounded-2xl border border-[#E8E6E0] bg-white p-5 opacity-60">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#1A1D1B]">Paid users</h2>
            <span className="rounded-full bg-[#F4F2EC] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#6B7370]">
              Coming soon
            </span>
          </div>
          <div className="mt-4">
            <BarChart data={paidPlaceholderSeries} color="#C9C4B8" />
            <ChartAxisLabels labels={chartAxisLabels} />
          </div>
          <p className="mt-3 text-xs text-[#6B7370]">Activates automatically once the premium tier ships.</p>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Leaderboard title="Most cooked recipes" rows={mostCooked} emptyLabel="No cook logs yet." />
        <Leaderboard title="Most starred recipes" rows={mostStarred} emptyLabel="No stars yet." />
      </div>
    </main>
  );
}
