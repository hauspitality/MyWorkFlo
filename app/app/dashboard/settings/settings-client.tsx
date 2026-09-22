"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { ControlModeSelector } from "@/app/_components/settings/control-mode-selector";
import { HoursEditor } from "@/app/_components/settings/hours-editor";
import { ServiceAreaEditor } from "@/app/_components/settings/service-area-editor";
import { AppointmentTypesEditor, type AppointmentTypeRow } from "@/app/_components/settings/appointment-types-editor";
import { EmergencyKeywordsEditor } from "@/app/_components/settings/emergency-keywords-editor";
import { PlanPicker } from "@/app/_components/settings/plan-picker";
import { Button, ButtonLink, Card, CardHeader, Chip, InitialAvatar } from "@/app/_components/ui";
import { PushDemo } from "../push-demo";
import { formatPhone, humanizeCode } from "@/lib/format";
import {
  updateControlMode,
  updateBusinessHours,
  updateServiceArea,
  updateEmergencyKeywords,
  upsertAppointmentType,
  deleteAppointmentType,
} from "@/lib/business-settings/actions";
import type { BusinessHours, ControlMode, ServiceArea, Staff } from "@/lib/supabase/types";

function Section({ title, chip, children }: { title: string; chip?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title}>{chip}</CardHeader>
      <div className="px-5 pb-5 pt-2 sm:px-6">{children}</div>
    </Card>
  );
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

  const planActive = subscriptionStatus === "active" || subscriptionStatus === "trialing";

  return (
    <div className="mt-6 space-y-6">
      <Section title="Control mode">
        <ControlModeSelector initial={controlMode} onSave={updateControlMode} />
      </Section>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Business hours">
            <HoursEditor initial={businessHours} onSave={updateBusinessHours} />
          </Section>

          <Section title="Service area">
            <ServiceAreaEditor initial={serviceArea} onSave={updateServiceArea} />
          </Section>

          <Section title="Appointment types & pricing">
            <AppointmentTypesEditor initial={appointmentTypes} onSave={upsertAppointmentType} onDelete={deleteAppointmentType} />
          </Section>

          <Section title="Emergency keywords">
            <EmergencyKeywordsEditor initial={emergencyKeywords} onSave={updateEmergencyKeywords} />
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Staff">
            <div className="space-y-2">
              {staff.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm">
                  <span className="min-w-0 truncate font-medium text-ink">{s.name}</span>
                  <span className="shrink-0 tabular-nums text-muted">{formatPhone(s.phone_number)}</span>
                  <Chip className="shrink-0">{humanizeCode(s.role)}</Chip>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted">Inviting additional staff is coming soon.</p>
            </div>
          </Section>

          <Section
            title="Calendar"
            chip={calendarConnected ? <Chip tone="green">Connected</Chip> : <Chip tone="amber">Not connected</Chip>}
          >
            {calendarConnected ? (
              <p className="text-sm text-ink-soft">
                Google Calendar is connected. Availability and bookings use your real calendar.
              </p>
            ) : (
              <div>
                <p className="text-sm text-ink-soft">
                  Not connected — the AI offers simulated availability, and Autopilot bookings fall back to
                  staff approval until this is set up.
                </p>
                <ButtonLink href="/api/calendar/google/connect" className="mt-3">
                  Connect Google Calendar
                </ButtonLink>
              </div>
            )}
          </Section>

          <Section
            title="Billing & plan"
            chip={
              subscriptionStatus === "trialing" ? (
                <Chip tone="blue">Trial</Chip>
              ) : planActive ? (
                <Chip tone="green">Active</Chip>
              ) : (
                <Chip>No plan</Chip>
              )
            }
          >
            {planActive ? (
              <p className="text-sm text-ink-soft">
                {subscriptionStatus === "trialing" ? "Your trial is active." : "Your subscription is active."}
              </p>
            ) : subscriptionStatus ? (
              <div>
                <p className="text-sm text-ink-soft">Subscription status: {humanizeCode(subscriptionStatus)}.</p>
                <div className="mt-3">
                  <PlanPicker />
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-3 text-sm text-ink-soft">No active subscription. Pick a plan to get started:</p>
                <PlanPicker />
              </div>
            )}
          </Section>

          <Section title="Notifications">
            <PushDemo />
          </Section>

          <Section title="Account">
            <div className="flex items-center gap-2.5">
              <InitialAvatar label={userEmail} className="h-8 w-8 text-xs" />
              <span className="min-w-0 truncate text-sm text-ink-soft">{userEmail}</span>
            </div>
            <Button variant="secondary" onClick={handleSignOut} disabled={signingOut} className="mt-3">
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </Section>
        </div>
      </div>
    </div>
  );
}
