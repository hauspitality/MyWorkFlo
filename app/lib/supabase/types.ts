// Hand-written interim types matching supabase/migrations/0001_init.sql.
// Replace with `supabase gen types typescript --local` once a real Supabase
// project exists — keep the shape in sync with the migration until then.

export type PlanTier = "starter" | "growth" | "pro";
export type ControlMode = "draft" | "assisted" | "autopilot";
export type StaffRole = "owner" | "dispatcher" | "tech";
export type CalendarProvider = "google";
export type CalendarStatus = "active" | "expired" | "revoked";
export type IssueUrgency = "routine" | "priority" | "emergency";
export type LeadStatus =
  | "new"
  | "qualifying"
  | "booking_pending_approval"
  | "booked"
  | "escalated"
  | "closed_lost"
  | "spam";
export type CallStatus = "no-answer" | "busy" | "completed" | "voicemail";
export type ConversationChannel = "sms";
export type ConversationStatus =
  | "active"
  | "awaiting_staff_approval"
  | "booked"
  | "escalated_emergency"
  | "escalated_priority"
  | "closed";
export type MessageDirection = "inbound" | "outbound";
export type MessageSender = "customer" | "ai" | "staff";
export type MessageStatus = "queued" | "sent" | "delivered" | "failed";
export type AppointmentStatus =
  | "pending_approval"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";
export type BookedVia = "autopilot" | "assisted_approval" | "staff_manual";
export type ApprovalType =
  | "outbound_message"
  | "booking"
  | "emergency_escalation"
  | "other_exception";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "auto_expired";
export type ResponseChannel = "sms_reply" | "magic_link";
export type AuditActorType = "system" | "ai" | "staff" | "owner";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export interface Business {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  timezone: string;
  plan_tier: PlanTier;
  control_mode: ControlMode;
  twilio_phone_number: string | null;
  twilio_phone_sid: string | null;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus | null;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  business_id: string;
  user_id: string | null;
  name: string;
  phone_number: string;
  role: StaffRole;
  is_active: boolean;
  invited_at: string;
  joined_at: string | null;
  created_at: string;
}

export interface WeatherThresholds {
  no_cooling_high_f: number;
  no_heat_low_f: number;
}

export interface ServiceArea {
  type?: "zip_list" | "radius";
  zips?: string[];
  center_lat?: number;
  center_lng?: number;
  radius_miles?: number;
}

export interface BusinessHours {
  [day: string]: { open: string; close: string } | null;
}

export interface ServiceSettings {
  business_id: string;
  business_hours: BusinessHours;
  service_area: ServiceArea;
  emergency_keywords: string[];
  languages: string[];
  min_notice_hours: number;
  weather_thresholds: WeatherThresholds;
  ai_persona_name: string | null;
  updated_at: string;
}

export interface AppointmentType {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  auto_bookable: boolean;
  is_emergency_type: boolean;
  hvac_issue_codes: string[];
  is_active: boolean;
  created_at: string;
}

export interface PricingGuidance {
  id: string;
  business_id: string;
  appointment_type_id: string;
  price_range_min: number | null;
  price_range_max: number | null;
  display_text: string;
  is_quotable_by_ai: boolean;
  created_at: string;
}

export interface CalendarConnection {
  id: string;
  business_id: string;
  provider: CalendarProvider;
  calendar_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  status: CalendarStatus;
  connected_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HvacIssueType {
  code: string;
  label: string;
  aliases_en: string[];
  aliases_es: string[];
  default_urgency: IssueUrgency;
  seasonal_sensitive: boolean;
  required_fields: string[];
  sort_order: number;
}

export interface Lead {
  id: string;
  business_id: string;
  source_phone_number: string;
  name: string | null;
  language: string | null;
  status: LeadStatus;
  first_contact_at: string;
  created_at: string;
}

export interface Call {
  id: string;
  business_id: string;
  lead_id: string | null;
  twilio_call_sid: string | null;
  status: CallStatus;
  triggered_text_back: boolean;
  started_at: string;
  ended_at: string | null;
}

export interface Conversation {
  id: string;
  business_id: string;
  lead_id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  control_mode_snapshot: ControlMode;
  detected_language: string | null;
  matched_issue_code: string | null;
  weather_elevated: boolean;
  collected_fields: Record<string, string | boolean | null>;
  turn_count: number;
  started_at: string;
  last_message_at: string;
  closed_reason: string | null;
}

export interface AiDecisionMetadata {
  reply_text: string;
  language: string;
  emergency_flag: boolean;
  emergency_category?: string;
  /** Set on engine-generated decisions (emergency/fallback); respond_to_customer turns don't produce one. */
  intent?: string;
  /** HVAC taxonomy code the model matched this conversation to, if any. */
  matched_issue_code?: string | null;
  /** Qualifying fields collected so far (symptom_onset, service_address, ...). */
  collected_fields?: Record<string, string>;
  booking_ready: boolean;
  proposed_appointment_type_id?: string | null;
  proposed_start?: string | null;
  needs_human: boolean;
  needs_human_reason?: string | null;
  tool_calls?: Array<{ name: string; input: unknown; result: unknown }>;
}

export interface Message {
  id: string;
  conversation_id: string;
  business_id: string;
  direction: MessageDirection;
  sender: MessageSender;
  body: string;
  twilio_message_sid: string | null;
  status: MessageStatus;
  ai_metadata: AiDecisionMetadata | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  lead_id: string;
  conversation_id: string | null;
  appointment_type_id: string;
  google_event_id: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: AppointmentStatus;
  booked_via: BookedVia;
  created_at: string;
  updated_at: string;
}

export interface ApprovalQueueItem {
  id: string;
  business_id: string;
  conversation_id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  payload: Record<string, unknown>;
  magic_link_token: string;
  requested_at: string;
  expires_at: string;
  responded_at: string | null;
  responded_by: string | null;
  response_channel: ResponseChannel | null;
}

export interface AuditLogEntry {
  id: string;
  business_id: string;
  actor_type: AuditActorType;
  actor_id: string | null;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Subscription {
  id: string;
  business_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

// Matches supabase/migrations/0002_push_subscriptions.sql. Named
// PushSubscriptionRow (not PushSubscription) to avoid clashing with the
// browser's built-in DOM PushSubscription type used client-side.
export interface PushSubscriptionRow {
  id: string;
  business_id: string;
  staff_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
}
