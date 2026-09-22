import type { Metadata } from "next";
import { LegalPage } from "../legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy — MyWorkFlo",
  description: "How MyWorkFlo collects, uses, and protects information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 22, 2026">
      <p>
        MyWorkFlo (&ldquo;we,&rdquo; &ldquo;us&rdquo;) provides an AI-powered front desk for HVAC and
        home-service businesses: when a business misses a call, MyWorkFlo texts the caller back, collects the
        details of their service request, and books or escalates it on the business&rsquo;s behalf. This policy
        explains what information we collect, how we use it, and the choices you have. It applies to the
        myworkflo.com website and the MyWorkFlo application at app.myworkflo.com.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Business account information.</strong> When a business signs up we collect the owner&rsquo;s
          name, email address, phone number, business name, hours, service area, and appointment settings.
        </li>
        <li>
          <strong>Customer conversations.</strong> When a customer calls or texts a business&rsquo;s MyWorkFlo
          number, we process the phone number, call status, and the content of text messages so the AI can
          respond, and we store the conversation so the business can review it.
        </li>
        <li>
          <strong>Calendar data (optional).</strong> If a business connects Google Calendar, we access
          free/busy information to offer real appointment times and create calendar events for confirmed
          bookings.
        </li>
        <li>
          <strong>Payment information.</strong> Subscription payments are processed by Stripe. We never see or
          store full card numbers; we store only the subscription status and plan.
        </li>
        <li>
          <strong>Usage and log data.</strong> Standard technical logs (such as timestamps and delivery
          status) used to operate and debug the service, and an audit trail of actions the AI takes.
        </li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>To answer, qualify, book, and escalate service requests on behalf of the business you contacted.</li>
        <li>To notify business staff when something needs their attention, including safety emergencies.</li>
        <li>To operate, secure, and improve the service, and to comply with law.</li>
      </ul>
      <p>
        We do <strong>not</strong> sell personal information, and we do not use customer conversation content
        for advertising. Conversation content is used to provide the service to the business you contacted.
      </p>

      <h2>SMS messaging</h2>
      <p>
        MyWorkFlo sends and receives text messages on behalf of the businesses that use it. By texting a
        business&rsquo;s number you consent to receive replies related to your service request. Message
        frequency varies; message and data rates may apply. Reply <strong>STOP</strong> to opt out of messages
        from a business at any time, or <strong>HELP</strong> for help. Mobile phone numbers and SMS opt-in
        consent are never shared with or sold to third parties for their own marketing.
      </p>

      <h2>Google user data</h2>
      <p>
        If a business connects Google Calendar, MyWorkFlo&rsquo;s use and transfer of information received
        from Google APIs adheres to the{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          className="text-accent-blue"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. We access only free/busy availability and create events for
        confirmed bookings; we do not read unrelated event details, we do not use Google user data for
        advertising, and we do not transfer it to third parties except as needed to provide the service.
        Calendar tokens are encrypted at rest, and a business can disconnect Google Calendar at any time, or
        revoke access at{" "}
        <a href="https://myaccount.google.com/permissions" className="text-accent-blue">
          myaccount.google.com/permissions
        </a>
        .
      </p>

      <h2>Sharing</h2>
      <p>
        We share information only with service providers that help us run MyWorkFlo — hosting (Vercel),
        database and authentication (Supabase), telephony (Twilio), payments (Stripe), and AI model providers
        that process conversation text to generate replies — each bound to use it only to provide their
        service to us; with the business whose number you contacted; and when required by law.
      </p>

      <h2>Retention and security</h2>
      <p>
        Conversation records are retained for the business&rsquo;s account so they can review their customer
        history, and deleted when the business deletes them or closes its account. We use encryption in
        transit, encrypt calendar credentials at rest, and restrict access to production data.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Text STOP to any MyWorkFlo number to stop receiving messages from that business.</li>
        <li>Businesses can export or delete their data by contacting us.</li>
        <li>
          To exercise privacy rights (access, correction, deletion), email{" "}
          <a href="mailto:support@myworkflo.com" className="text-accent-blue">
            support@myworkflo.com
          </a>
          .
        </li>
      </ul>

      <h2>Contact</h2>
      <p>
        Questions about this policy: <a href="mailto:support@myworkflo.com" className="text-accent-blue">support@myworkflo.com</a>.
        We may update this policy from time to time; material changes will be reflected by the date above.
      </p>
    </LegalPage>
  );
}
