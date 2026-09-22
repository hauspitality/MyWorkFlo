"use client";

import { useMemo, useState } from "react";
import { Card, InitialAvatar } from "@/app/_components/ui";

export interface ScheduleAppointment {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  typeName: string;
  customerName: string;
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Stable accent per appointment type, cycled from the semantic palette.
const EVENT_BAR_COLORS = ["bg-gauge-green", "bg-gauge-blue", "bg-gauge-amber", "bg-gauge-pink"];

function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function ChevronIcon({ direction, className }: { direction: "left" | "right"; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d={direction === "left" ? "m14.5 6-6 6 6 6" : "m9.5 6 6 6-6 6"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <rect x="4" y="5.5" width="16" height="15" rx="3" />
      <path d="M4 10h16M8.5 3.5v3M15.5 3.5v3" strokeLinecap="round" />
    </svg>
  );
}

export function AppointmentsSchedule({ appointments }: { appointments: ScheduleAppointment[] }) {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(() => localISODate(today));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduleAppointment[]>();
    for (const appt of appointments) {
      const key = localISODate(new Date(appt.scheduledStart));
      map.set(key, [...(map.get(key) ?? []), appt]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
    }
    return map;
  }, [appointments]);

  const barColorByType = useMemo(() => {
    const types = [...new Set(appointments.map((a) => a.typeName))].sort();
    return new Map(types.map((t, i) => [t, EVENT_BAR_COLORS[i % EVENT_BAR_COLORS.length]]));
  }, [appointments]);

  const todayKey = localISODate(today);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const selectedAppointments = byDate.get(selectedDate) ?? [];

  const monthLabel = weekDays[3].toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const onCurrentWeek = localISODate(weekStart) === localISODate(startOfWeek(today));

  function goToToday() {
    setWeekStart(startOfWeek(today));
    setSelectedDate(todayKey);
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6 sm:pt-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          Schedule
          {!onCurrentWeek && (
            <button
              onClick={goToToday}
              className="rounded-full px-2 py-0.5 text-[13px] font-medium text-accent-blue transition-colors hover:bg-accent-blue-soft"
            >
              Today
            </button>
          )}
        </h2>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[13px] font-medium text-muted">{monthLabel}</span>
          <button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-paper hover:text-ink"
            aria-label="Previous week"
          >
            <ChevronIcon direction="left" className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-paper hover:text-ink"
            aria-label="Next week"
          >
            <ChevronIcon direction="right" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 px-3 pt-3 sm:px-4">
        {weekDays.map((day) => {
          const key = localISODate(day);
          const dayCount = byDate.get(key)?.length ?? 0;
          const hasAppt = dayCount > 0;
          const isSelected = key === selectedDate;
          const isToday = key === todayKey;
          const fullDate = day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
          return (
            <button
              key={key}
              onClick={() => setSelectedDate(key)}
              className="group flex min-h-11 flex-col items-center gap-1.5 rounded-xl py-2"
              aria-pressed={isSelected}
              aria-label={`${fullDate} — ${dayCount === 0 ? "no appointments" : dayCount === 1 ? "1 appointment" : `${dayCount} appointments`}`}
            >
              <span className="text-[11px] font-medium text-muted">{WEEKDAY_LABELS[day.getDay()]}</span>
              <span
                className={
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums transition-colors " +
                  (isSelected
                    ? "bg-accent-blue font-semibold text-white"
                    : (isToday ? "font-semibold text-accent-blue" : "text-ink-soft") + " group-hover:bg-paper")
                }
              >
                {day.getDate()}
              </span>
              <span className={"h-1 w-1 rounded-full " + (hasAppt ? "bg-accent-blue" : "bg-transparent")} />
            </button>
          );
        })}
      </div>

      <div className="px-5 pb-5 pt-2 sm:px-6">
        {!selectedAppointments.length ? (
          <div className="flex flex-col items-center py-8 text-center">
            <CalendarGlyph className="h-8 w-8 text-faint" />
            <p className="mt-3 text-sm font-medium text-ink-soft">Nothing booked this day</p>
            <p className="mt-1 text-xs text-muted">Approved appointments show up here.</p>
          </div>
        ) : (
          <div>
            {selectedAppointments.map((appt, i) => (
              <div key={appt.id} className={"flex items-center gap-3 py-3 " + (i > 0 ? "border-t border-dashed border-line" : "")}>
                <span className={`h-9 w-1 shrink-0 rounded-full ${barColorByType.get(appt.typeName) ?? "bg-gauge-blue"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{appt.typeName}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted">
                    {formatTime(appt.scheduledStart)} – {formatTime(appt.scheduledEnd)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden max-w-28 truncate text-xs text-muted sm:block">{appt.customerName}</span>
                  <InitialAvatar label={appt.customerName} className="h-8 w-8 text-xs" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
