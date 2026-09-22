"use client";

import { useMemo, useState } from "react";

export interface ScheduleAppointment {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  typeName: string;
  customerName: string;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function DayList({ appointments }: { appointments: ScheduleAppointment[] }) {
  if (!appointments.length) {
    return <p className="mt-3 text-sm text-muted">Nothing booked this day.</p>;
  }
  return (
    <div className="mt-3 space-y-2">
      {appointments.map((appt) => (
        <div key={appt.id} className="border-l-2 border-accent-blue rounded-r-md bg-card py-2 pl-3">
          <p className="text-sm font-medium text-ink">
            {new Date(appt.scheduledStart).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            {" – "}
            {new Date(appt.scheduledEnd).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
          <p className="text-xs text-ink-soft">{appt.typeName}</p>
          <p className="text-xs text-muted">{appt.customerName}</p>
        </div>
      ))}
    </div>
  );
}

export function AppointmentsSchedule({ appointments }: { appointments: ScheduleAppointment[] }) {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(() => localISODate(today));
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(today));

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduleAppointment[]>();
    for (const appt of appointments) {
      const key = localISODate(new Date(appt.scheduledStart));
      map.set(key, [...(map.get(key) ?? []), appt]);
    }
    return map;
  }, [appointments]);

  const todayKey = localISODate(today);
  const selectedAppointments = byDate.get(selectedDate) ?? [];

  // Desktop month grid
  const gridDays = useMemo(() => {
    const first = viewMonth;
    const startWeekday = first.getDay();
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells: Array<Date | null> = Array(startWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(first.getFullYear(), first.getMonth(), d));
    return cells;
  }, [viewMonth]);

  // Mobile day strip: today + next 13 days
  const stripDays = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);

  return (
    <div>
      {/* Desktop: month grid */}
      <div className="hidden rounded-lg border border-line bg-card p-4 lg:block">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setViewMonth((m) => addMonths(m, -1))} className="rounded-md px-2 py-1 text-sm text-muted hover:bg-paper" aria-label="Previous month">
            ←
          </button>
          <p className="text-sm font-semibold text-ink">{viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
          <button onClick={() => setViewMonth((m) => addMonths(m, 1))} className="rounded-md px-2 py-1 text-sm text-muted hover:bg-paper" aria-label="Next month">
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
          {WEEKDAY_LABELS.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {gridDays.map((day, i) => {
            if (!day) return <div key={i} />;
            const key = localISODate(day);
            const hasAppt = byDate.has(key);
            const isSelected = key === selectedDate;
            const isToday = key === todayKey;
            return (
              <button
                key={key}
                onClick={() => setSelectedDate(key)}
                className={
                  "flex flex-col items-center rounded-md py-1.5 text-sm " +
                  (isSelected ? "bg-accent-blue/10 text-accent-blue font-medium" : isToday ? "ring-1 ring-inset ring-accent-blue/40 text-ink" : "text-ink-soft hover:bg-paper")
                }
              >
                {day.getDate()}
                <span className={"mt-0.5 h-1 w-1 rounded-full " + (hasAppt ? "bg-accent-blue" : "bg-transparent")} />
              </button>
            );
          })}
        </div>
        <DayList appointments={selectedAppointments} />
      </div>

      {/* Mobile: horizontal day strip */}
      <div className="rounded-lg border border-line bg-card p-4 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {stripDays.map((day) => {
            const key = localISODate(day);
            const hasAppt = byDate.has(key);
            const isSelected = key === selectedDate;
            return (
              <button
                key={key}
                onClick={() => setSelectedDate(key)}
                className={
                  "flex shrink-0 flex-col items-center rounded-full px-3 py-2 text-sm " +
                  (isSelected ? "bg-accent-blue/10 text-accent-blue font-medium" : "text-ink-soft")
                }
              >
                <span className="text-[10px] uppercase text-muted">{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
                {day.getDate()}
                <span className={"mt-0.5 h-1 w-1 rounded-full " + (hasAppt ? "bg-accent-blue" : "bg-transparent")} />
              </button>
            );
          })}
        </div>
        <DayList appointments={selectedAppointments} />
      </div>
    </div>
  );
}
