import { prisma } from "@/lib/prisma";
import { MultiLineChart, ChartLegend } from "@/components/admin/line-chart";
import { ChartAxisLabels } from "@/components/admin/bar-chart";
import { StatCard } from "@/components/admin/stat-card";
import { Leaderboard } from "@/components/admin/leaderboard";
import { ExtraInsights } from "@/components/admin/extra-insights";

const SIGNUP_WINDOW_DAYS = 30;
const HOUR_LABELS = [
  "12am", "1am", "2am", "3am", "4am", "5am", "6am", "7am", "8am", "9am", "10am", "11am",
  "12pm", "1pm", "2pm", "3pm", "4pm", "5pm", "6pm", "7pm", "8pm", "9pm", "10pm", "11pm",
];

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function shortDateLabel(key: string): string {
  const [, month, day] = key.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[Number(month) - 1]} ${Number(day)}`;
}

// Builds two cumulative running-total series (all users, and users who are
// currently premium) bucketed by day for the last `days` days, so the chart
// reads as "growth over time" rather than daily deltas. Note: premium status
// is a live flag with no historical "upgraded at" timestamp in the schema,
// so the premium line is "currently-premium users, grouped by signup date" —
// a reasonable growth proxy without a schema migration, not a literal
// record of when each user upgraded.
function buildCumulativeUserSeries(
  users: { createdAt: Date; isPremium: boolean }[],
  days: number,
): { labels: string[]; total: number[]; premium: number[] } {
  const sorted = [...users].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const labels: string[] = [];
  const total: number[] = [];
  const premium: number[] = [];
  const today = new Date();
  let idx = 0;
  let totalSoFar = 0;
  let premiumSoFar = 0;
  for (let i = days - 1; i >= 0; i--) {
    const cutoff = new Date(today);
    cutoff.setUTCDate(cutoff.getUTCDate() - i);
    cutoff.setUTCHours(23, 59, 59, 999);
    while (idx < sorted.length && sorted[idx].createdAt <= cutoff) {
      totalSoFar++;
      if (sorted[idx].isPremium) premiumSoFar++;
      idx++;
    }
    labels.push(shortDateLabel(dateKey(cutoff)));
    total.push(totalSoFar);
    premium.push(premiumSoFar);
  }
  return { labels, total, premium };
}

export default async function AdminPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    allUsers,
    recipeCount,
    activeRecipeCount,
    needReviewCount,
    inReviewCount,
    interactionCounts,
    cookLaterCount,
    cookLogCount,
    cookLogs7d,
    peakHourCounts,
    mostCookedRaw,
    mostStarredRaw,
  ] = await Promise.all([
    prisma.user.findMany({
      select: { createdAt: true, isPremium: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.recipe.count(),
    prisma.recipe.count({ where: { isActive: true } }),
    prisma.recipe.count({ where: { allergenReviewStatus: "UNVERIFIED" } }),
    prisma.recipe.count({ where: { allergenReviewStatus: "IN_REVIEW" } }),
    prisma.interaction.groupBy({ by: ["type"], _count: true }),
    prisma.savedRecipe.count(),
    prisma.cookLog.count(),
    prisma.cookLog.count({ where: { cookedAt: { gte: sevenDaysAgo } } }),
    prisma.interaction.groupBy({
      by: ["localHour"],
      where: { type: "COOK" },
      _count: { localHour: true },
    }),
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
  ]);

  const userCount = allUsers.length;
  const premiumUserCount = allUsers.filter((u) => u.isPremium).length;

  const { labels: userChartLabels, total: totalUserSeries, premium: premiumUserSeries } =
    buildCumulativeUserSeries(allUsers, SIGNUP_WINDOW_DAYS);
  const userChartAxisLabels = [
    userChartLabels[0] ?? "",
    userChartLabels[Math.floor(userChartLabels.length / 2)] ?? "",
    userChartLabels[userChartLabels.length - 1] ?? "",
  ];

  const interactionCountByType = new Map(interactionCounts.map((r) => [r.type, r._count]));

  const peakHour = peakHourCounts.reduce<{ hour: number; count: number } | null>((best, row) => {
    const count = row._count.localHour;
    if (!best || count > best.count) return { hour: row.localHour, count };
    return best;
  }, null);

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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">Overview</h1>
      <p className="mt-1 text-sm text-[#6B7370]">Usage stats across the catalog and userbase.</p>

      <section className="mt-6 rounded-2xl border border-[#E8E6E0] bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#1A1D1B]">Users</h2>
          <span className="text-xs text-[#6B7370]">Last {SIGNUP_WINDOW_DAYS} days</span>
        </div>
        <div className="mt-4">
          <MultiLineChart
            series={[
              { label: "Users", color: "#1B4332", data: totalUserSeries },
              { label: "Premium users", color: "#7C5CBF", data: premiumUserSeries },
            ]}
          />
          <ChartAxisLabels labels={userChartAxisLabels} />
        </div>
        <ChartLegend
          series={[
            { label: `Users — ${userCount}`, color: "#1B4332" },
            { label: `Premium — ${premiumUserCount}`, color: "#7C5CBF" },
          ]}
        />
      </section>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard label="Recipes" value={recipeCount} href="/admin/recipes" />
        <StatCard label="Active recipes" value={activeRecipeCount} href="/admin/recipes?filter=active" />
        <StatCard
          label="Need review"
          value={needReviewCount}
          sub={`${inReviewCount} in review`}
          href="/admin/recipes?filter=unverified"
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Opened" value={interactionCountByType.get("OPEN") ?? 0} />
        <StatCard label="Impressions" value={interactionCountByType.get("IMPRESSION") ?? 0} />
        <StatCard label="Cosigns" value={interactionCountByType.get("COSIGN") ?? 0} />
        <StatCard label="Cooked" value={interactionCountByType.get("COOK") ?? 0} />
        <StatCard label="Stars" value={interactionCountByType.get("STAR") ?? 0} />
        <StatCard label="Unstars" value={interactionCountByType.get("UNSTAR") ?? 0} />
        <StatCard label="Cook laters" value={cookLaterCount} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Leaderboard title="Most cooked recipes" rows={mostCooked} emptyLabel="No cook logs yet." />
        <Leaderboard title="Most starred recipes" rows={mostStarred} emptyLabel="No stars yet." />
      </div>

      <ExtraInsights
        cookLogCount={cookLogCount}
        cookLogs7d={cookLogs7d}
        peakHourLabel={peakHour ? HOUR_LABELS[peakHour.hour] ?? `${peakHour.hour}:00` : "—"}
      />
    </main>
  );
}
