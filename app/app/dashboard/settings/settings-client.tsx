"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { ControlModeSelector } from "@/app/_components/settings/control-mode-selector";
import { UserAvatar } from "@/app/_components/shell/dashboard-shell";
import { HoursEditor } from "@/app/_components/settings/hours-editor";
import { ServiceAreaEditor } from "@/app/_components/settings/service-area-editor";
import { AppointmentTypesEditor, type AppointmentTypeRow } from "@/app/_components/settings/appointment-types-editor";
import { EmergencyKeywordsEditor } from "@/app/_components/settings/emergency-keywords-editor";
import {
  updateControlMode,
  updateBusinessHours,
  updateServiceArea,
  updateEmergencyKeywords,
  upsertAppointmentType,
  deleteAppointmentType,
} from "@/lib/business-settings/actions";
import type { BusinessHours, ControlMode, ServiceArea, Staff } from "@/lib/supabase/types";

function Section({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-lg border border-line bg-card">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-ink marker:content-none">
        <span className="mr-2 inline-block text-muted transition-transform group-open:rotate-90">›</span>
        {title}
      </summary>
      <div className="border-t border-line px-4 py-4">{children}</div>
    </details>
  );
}

function SavedFlash({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="mb-2 text-xs text-accent-blue">Saved.</p>;
}

export function SettingsClient({
  controlMode,
  businessHours,
  serviceArea,
  emergencyKeywords,
  appointmentTypes,
  staff,
  calendarConnected,
  subscriptionStatus,
  userEmail,
}: {
  controlMode: ControlMode;
  businessHours: BusinessHours;
  serviceArea: ServiceArea;
  emergencyKeywords: string[];
  appointmentTypes: AppointmentTypeRow[];
  staff: Pick<Staff, "id" | "name" | "phone_number" | "role" | "is_active">[];
  calendarConnected: boolean;
  subscriptionStatus: string | null;
  userEmail: string;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const [flashKey, setFlashKey] = useState<string | null>(null);

  function flash(key: string) {
    setFlashKey(key);
    setTimeout(() => setFlashKey((k) => (k === key ? null : k)), 2000);
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-accent-blue/30 bg-accent-blue/5 p-4">
        <h2 className="mb-1 text-sm font-semibold text-ink">Control mode</h2>
        <SavedFlash show={flashKey === "control_mode"} />
        <ControlModeSelector
          initial={controlMode}
          onSave={async (mode) => {
            await updateControlMode(mode);
            flash("control_mode");
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Section title="Business hours">
            <SavedFlash show={flashKey === "hours"} />
            <HoursEditor
              initial={businessHours}
              onSave={async (hours) => {
                await updateBusinessHours(hours);
                flash("hours");
              }}
            />
          </Section>

          <Section title="Service area">
            <SavedFlash show={flashKey === "service_area"} />
            <ServiceAreaEditor
              initial={serviceArea}
              onSave={async (area) => {
                await updateServiceArea(area);
                flash("service_area");
              }}
            />
          </Section>

          <Section title="Appointment types & pricing">
            <AppointmentTypesEditor initial={appointmentTypes} onSave={upsertAppointmentType} onDelete={deleteAppointmentType} />
          </Section>

          <Section title="Emergency keywords">
            <SavedFlash show={flashKey === "emergency_keywords"} />
            <EmergencyKeywordsEditor
              initial={emergencyKeywords}
              onSave={async (keywords) => {
                await updateEmergencyKeywords(keywords);
                flash("emergency_keywords");
              }}
            />
          </Section>
        </div>

        <div className="space-y-3">
          <Section title="Staff">
            <div className="space-y-2">
              {staff.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border border-line bg-paper px-3 py-2 text-sm">
                  <span className="text-ink">{s.name}</span>
                  <span className="text-muted">{s.phone_number}</span>
                  <span className="text-xs uppercase text-muted">{s.role}</span>
                </div>
              ))}
              <p className="text-xs text-muted">Inviting additional staff is coming soon.</p>
            </div>
          </Section>

          <Section title="Calendar connection">
            {calendarConnected ? (
              <div className="flex items-center gap-2 text-sm text-ink-soft">
                <span className="h-2 w-2 rounded-full bg-gauge-green" />
                Google Calendar is connected. Availability and bookings use your real calendar.
              </div>
            ) : (
              <div>
                <p className="text-sm text-ink-soft">
                  Not connected — the AI offers simulated availability, and Autopilot bookings fall back to
                  staff approval until this is set up.
                </p>
                <a
                  href="/api/calendar/google/connect"
                  className="mt-3 inline-block rounded-md bg-accent-blue px-4 py-2 text-sm font-medium text-white hover:bg-accent-blue-deep"
                >
                  Connect Google Calendar
                </a>
              </div>
            )}
          </Section>

          <Section title="Billing & plan">
            {subscriptionStatus ? (
              <p className="text-sm text-ink-soft">Subscription status: {subscriptionStatus}.</p>
            ) : (
              <div>
                <p className="text-sm text-ink-soft">No active subscription. Pick a plan to get started:</p>
                <div className="mt-3 space-y-2">
                  {[
                    { plan: "starter", label: "Starter", price: "$119/mo" },
                    { plan: "growth", label: "Growth", price: "$299/mo" },
                    { plan: "pro", label: "Pro", price: "$599/mo" },
                  ].map((p) => (
                    <a
                      key={p.plan}
                      href={`/api/billing/checkout?plan=${p.plan}`}
                      className="flex items-center justify-between rounded-md border border-line bg-paper px-3 py-2 text-sm hover:border-accent-blue"
                    >
                      <span className="font-medium text-ink">{p.label}</span>
                      <span className="text-muted">{p.price}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section title="Account">
            <div className="flex items-center gap-2.5">
              <UserAvatar label={userEmail} className="h-8 w-8" />
              <span className="truncate text-sm text-ink-soft">{userEmail}</span>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-3 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-paper disabled:opacity-50"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </Section>
        </div>
      </div>
    </div>
  );
}
