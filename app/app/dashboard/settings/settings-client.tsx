"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { ControlModeSelector } from "@/app/_components/settings/control-mode-selector";
import { HoursEditor } from "@/app/_components/settings/hours-editor";
import { ServiceAreaEditor } from "@/app/_components/settings/service-area-editor";
import { AppointmentTypesEditor, type AppointmentTypeRow } from "@/app/_components/settings/appointment-types-editor";
import { EmergencyKeywordsEditor } from "@/app/_components/settings/emergency-keywords-editor";
import { ApprovalExpiryEditor } from "@/app/_components/settings/approval-expiry-editor";
import { StaffManager, type StaffManagerRow } from "@/app/_components/settings/staff-manager";
import { PlanPicker } from "@/app/_components/settings/plan-picker";
import { Button, ButtonLink, Card, CardHeader, Chip, InitialAvatar } from "@/app/_components/ui";
import { PushDemo } from "../push-demo";
import { formatPhone, humanizeCode } from "@/lib/format";
import {
  updateControlMode,
  updateBusinessHours,
  updateServiceArea,
  updateEmergencyKeywords,
  updateApprovalExpiryMinutes,
  upsertAppointmentType,
  deleteAppointmentType,
  addStaffMember,
  setStaffActive,
} from "@/lib/business-settings/actions";
import type { BusinessHours, ControlMode, PlanTier, ServiceArea } from "@/lib/supabase/types";

function Section({ title, chip, children }: { title: string; chip?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title}>{chip}</CardHeader>
      <div className="px-5 pb-5 pt-2 sm:px-6">{children}</div>
    </Card>
  );
}

export function SettingsClient({
  businessName,
  controlMode,
  approvalExpiryMinutes,
  businessHours,
  serviceArea,
  emergencyKeywords,
  appointmentTypes,
  staff,
  planTier,
  twilioPhoneNumber,
  calendarConnected,
  subscriptionStatus,
  userEmail,
}: {
  businessName: string;
  controlMode: ControlMode;
  approvalExpiryMinutes: number;
  businessHours: BusinessHours;
  serviceArea: ServiceArea;
  emergencyKeywords: string[];
  appointmentTypes: AppointmentTypeRow[];
  staff: StaffManagerRow[];
  planTier: PlanTier | null;
  twilioPhoneNumber: string | null;
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
        <ControlModeSelector initial={controlMode} onSave={updateControlMode} approvalExpiryMinutes={approvalExpiryMinutes} />
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
            <EmergencyKeywordsEditor initial={emergencyKeywords} businessName={businessName} onSave={updateEmergencyKeywords} />
          </Section>
        </div>

        <div className="space-y-4">
          <Section
            title="Your phone line"
            chip={twilioPhoneNumber ? <Chip tone="green">Connected</Chip> : <Chip tone="amber">Not connected yet</Chip>}
          >
            {twilioPhoneNumber ? (
              <div>
                <p className="text-lg font-semibold tabular-nums text-ink">{formatPhone(twilioPhoneNumber)}</p>
                <p className="mt-2 text-sm text-ink-soft">
                  This is the number that texts your customers. Customers can keep calling your existing number —
                  set conditional call forwarding so missed calls ring your MyWorkFlo number, and we take it from
                  there.
                </p>
              </div>
            ) : (
              <p className="text-sm text-ink-soft">
                Not connected yet — until then, nothing texts your customers. Here&rsquo;s how it will work:
                customers can keep calling your existing number — you&rsquo;ll set conditional call forwarding so
                missed calls ring your MyWorkFlo number, and that number texts the caller back. We&rsquo;ll help
                you set this up when your number is ready.
              </p>
            )}
          </Section>

          <Section title="Staff">
            <StaffManager staff={staff} planTier={planTier} onAdd={addStaffMember} onSetActive={setStaffActive} />
          </Section>

          <Section title="Approvals">
            <ApprovalExpiryEditor initial={approvalExpiryMinutes} onSave={updateApprovalExpiryMinutes} />
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
              <div>
                <p className="text-sm text-ink-soft">
                  {subscriptionStatus === "trialing" ? "Your trial is active." : "Your subscription is active."}
                </p>
                <ButtonLink href="/api/billing/portal" variant="secondary" className="mt-3">
                  Manage billing
                </ButtonLink>
                <p className="mt-2 text-xs text-ink-soft">Change plan, update your card, or cancel anytime.</p>
              </div>
            ) : subscriptionStatus ? (
              <div>
                <p className="text-sm text-ink-soft">Subscription status: {humanizeCode(subscriptionStatus)}.</p>
                <div className="mt-3">
                  <PlanPicker />
                </div>
                <ButtonLink href="/api/billing/portal" variant="secondary" className="mt-3">
                  Manage billing
                </ButtonLink>
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
