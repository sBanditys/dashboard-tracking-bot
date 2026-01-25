import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Tracking Dashboard",
  description: "Terms of Service for Tracking Dashboard",
};

export default function TermsOfService() {
  return (
    <div>
      <h1>Terms of Service</h1>
      <p className="text-foreground/60">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing and using the Tracking Dashboard service (the &quot;Service&quot;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        Tracking Dashboard provides a web-based interface for Discord server administrators to view and manage tracking data collected by our Discord bot. The Service allows you to:
      </p>
      <ul>
        <li>View tracking data for Discord servers where you have administrative access</li>
        <li>Manage bot settings and configurations</li>
        <li>Monitor bot health and status</li>
        <li>Access audit logs of changes made to your guilds</li>
      </ul>
      <p>
        The Service is provided &quot;as is&quot; and we reserve the right to modify or discontinue the Service at any time with or without notice.
      </p>

      <h2>3. User Accounts</h2>
      <p>
        To access the Service, you must authenticate using Discord OAuth. By logging in, you authorize us to access your Discord profile information and guild memberships necessary to provide the Service. You are responsible for:
      </p>
      <ul>
        <li>Maintaining the security of your Discord account</li>
        <li>All activities that occur under your account</li>
        <li>Notifying us immediately of any unauthorized use of your account</li>
      </ul>
      <p>
        We reserve the right to refuse service, terminate accounts, or remove or edit content at our sole discretion.
      </p>

      <h2>4. Acceptable Use</h2>
      <p>
        You agree not to use the Service to:
      </p>
      <ul>
        <li>Violate any applicable laws or regulations</li>
        <li>Infringe on the intellectual property rights of others</li>
        <li>Transmit any malicious code, viruses, or harmful data</li>
        <li>Attempt to gain unauthorized access to the Service or related systems</li>
        <li>Interfere with or disrupt the Service or servers</li>
        <li>Use the Service for any illegal or unauthorized purpose</li>
        <li>Scrape, harvest, or collect data from the Service through automated means</li>
      </ul>
      <p>
        Violation of these terms may result in immediate termination of your access to the Service.
      </p>

      <h2>5. Intellectual Property</h2>
      <p>
        The Service and its original content, features, and functionality are owned by [Company Name] and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our Service without our express written permission.
      </p>

      <h2>6. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by applicable law, [Company Name] shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from:
      </p>
      <ul>
        <li>Your access to or use of or inability to access or use the Service</li>
        <li>Any conduct or content of any third party on the Service</li>
        <li>Any content obtained from the Service</li>
        <li>Unauthorized access, use, or alteration of your transmissions or content</li>
      </ul>
      <p>
        The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis without any warranties of any kind, either express or implied.
      </p>

      <h2>7. Termination</h2>
      <p>
        We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
      </p>
      <p>
        You may terminate your use of the Service at any time by discontinuing your use of the Service and revoking OAuth access through Discord&apos;s settings.
      </p>

      <h2>8. Changes to Terms</h2>
      <p>
        We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will provide at least 30 days&apos; notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
      </p>
      <p>
        By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.
      </p>

      <h2>9. Contact Information</h2>
      <p>
        If you have any questions about these Terms, please contact us at [Contact Email].
      </p>
    </div>
  );
}
