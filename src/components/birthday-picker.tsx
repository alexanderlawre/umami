"use client";

import { useState } from "react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const selectClass =
  "mt-1 w-full rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-[#1B4332]";
const labelClass = "block text-sm font-medium text-[#1A1D1B]";

function daysInMonth(year: number | null, month: number | null) {
  // Falls back to a non-leap year / January when a part isn't picked yet,
  // so the Day list still has a sane length before all three are chosen.
  return new Date(year ?? 2001, month ?? 1, 0).getDate();
}

/**
 * Month/Day/Year dropdown birthday picker. Emits the same "YYYY-MM-DD"
 * string an <input type="date"> would once all three parts are selected
 * (empty string otherwise), so callers and the API layer need no changes.
 *
 * Keeps its own year/month/day state rather than deriving purely from the
 * composed `value` string: since `value` is only ever fully populated once
 * *all three* parts are chosen, deriving from it would wipe out an
 * in-progress selection (e.g. picking Month alone resets `value` to "",
 * which would otherwise bounce the Month <select> back to unselected).
 */
export function BirthdayPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const initial = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const [year, setYear] = useState<number | null>(initial ? Number(initial[1]) : null);
  const [month, setMonth] = useState<number | null>(initial ? Number(initial[2]) : null);
  const [day, setDay] = useState<number | null>(initial ? Number(initial[3]) : null);

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 13; y >= currentYear - 100; y--) years.push(y);

  const dayCount = daysInMonth(year, month);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);

  function update(nextYear: number | null, nextMonth: number | null, nextDay: number | null) {
    // Clamp the day if the newly-selected month/year has fewer days than
    // the previously-selected day (e.g. switching from Jan 31 to Feb).
    const clampedDay = nextDay ? Math.min(nextDay, daysInMonth(nextYear, nextMonth)) : null;
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(clampedDay);
    if (nextYear && nextMonth && clampedDay) {
      const mm = String(nextMonth).padStart(2, "0");
      const dd = String(clampedDay).padStart(2, "0");
      onChange(`${nextYear}-${mm}-${dd}`);
    } else {
      onChange("");
    }
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className={labelClass}>Month</label>
        <select
          className={selectClass}
          value={month ?? ""}
          onChange={(e) => update(year, e.target.value ? Number(e.target.value) : null, day)}
        >
          <option value="">Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Day</label>
        <select
          className={selectClass}
          value={day ?? ""}
          onChange={(e) => update(year, month, e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Day</option>
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Year</label>
        <select
          className={selectClass}
          value={year ?? ""}
          onChange={(e) => update(e.target.value ? Number(e.target.value) : null, month, day)}
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
