import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Tracking Dashboard",
  description: "Privacy Policy for Tracking Dashboard",
};

export default function PrivacyPolicy() {
  return (
    <div>
      <h1>Privacy Policy</h1>
      <p className="text-foreground/60">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

      <h2>1. Information We Collect</h2>
      <p>
        When you use the Tracking Dashboard service, we collect the following types of information:
      </p>

      <h3>Information from Discord OAuth</h3>
      <ul>
        <li>Your Discord user ID, username, and discriminator</li>
        <li>Your Discord profile picture</li>
        <li>Your Discord email address (if you grant permission)</li>
        <li>List of Discord servers (guilds) where you have administrative permissions</li>
      </ul>

      <h3>Guild Data via API</h3>
      <ul>
        <li>Guild identifiers and names for servers where you have access</li>
        <li>Bot configuration settings for your guilds</li>
        <li>Tracking data collected by the bot (tracked accounts, posts, brands)</li>
        <li>Usage statistics and bot health status</li>
        <li>Audit logs of changes made to guild settings</li>
      </ul>

      <h3>Automatically Collected Information</h3>
      <ul>
        <li>Browser type and version</li>
        <li>IP address</li>
        <li>Pages visited and time spent on pages</li>
        <li>Referrer URL</li>
      </ul>

      <h2>2. How We Use Information</h2>
      <p>
        We use the collected information for the following purposes:
      </p>
      <ul>
        <li>To authenticate you and provide access to your guild data</li>
        <li>To display tracking data and bot status for guilds where you have permissions</li>
        <li>To process changes you make to guild settings</li>
        <li>To maintain and improve the Service</li>
        <li>To communicate with you about the Service</li>
        <li>To detect, prevent, and address technical issues or security vulnerabilities</li>
        <li>To comply with legal obligations</li>
      </ul>
      <p>
        We do not use your data for advertising purposes or sell your information to third parties.
      </p>

      <h2>3. Data Sharing</h2>
      <p>
        We do not share your personal information with third parties except in the following circumstances:
      </p>
      <ul>
        <li><strong>Service Providers:</strong> We may share information with trusted service providers who assist us in operating the Service (e.g., hosting providers, analytics services). These providers are contractually obligated to keep your information confidential and use it only for the purposes we specify.</li>
        <li><strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., court orders, subpoenas).</li>
        <li><strong>Business Transfers:</strong> If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
      </ul>
      <p>
        We do not sell, trade, or rent your personal information to third parties for marketing purposes.
      </p>

      <h2>4. Data Security</h2>
      <p>
        We implement appropriate technical and organizational measures to protect your information:
      </p>
      <ul>
        <li>All data transmitted between your browser and our servers is encrypted using HTTPS</li>
        <li>Authentication is handled using JWT (JSON Web Tokens) with secure token rotation</li>
        <li>Access to guild data is strictly controlled based on your Discord permissions</li>
        <li>We employ industry-standard security practices to protect against unauthorized access, alteration, disclosure, or destruction of data</li>
      </ul>
      <p>
        However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain your information for as long as necessary to provide the Service and fulfill the purposes outlined in this Privacy Policy. Specifically:
      </p>
      <ul>
        <li>Authentication data is retained while your account is active</li>
        <li>Guild data and tracking information is retained as long as the bot is active in your guild</li>
        <li>Audit logs are retained for up to 90 days</li>
        <li>If you revoke OAuth access or request account deletion, we will delete your personal information within 30 days</li>
      </ul>
      <p>
        We may retain certain information as required by law or for legitimate business purposes (e.g., fraud prevention, dispute resolution).
      </p>

      <h2>6. Your Rights</h2>
      <p>
        Depending on your location, you may have the following rights regarding your personal information:
      </p>
      <ul>
        <li><strong>Access:</strong> You can request a copy of the personal information we hold about you</li>
        <li><strong>Correction:</strong> You can request correction of inaccurate or incomplete information</li>
        <li><strong>Deletion:</strong> You can request deletion of your personal information (subject to legal retention requirements)</li>
        <li><strong>Portability:</strong> You can request a copy of your data in a machine-readable format</li>
        <li><strong>Objection:</strong> You can object to certain processing of your personal information</li>
        <li><strong>Withdrawal of Consent:</strong> You can revoke OAuth access through Discord at any time</li>
      </ul>
      <p>
        To exercise these rights, please contact us at [Contact Email]. We will respond to your request within 30 days.
      </p>

      <h2>7. Children's Privacy</h2>
      <p>
        The Service is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us so we can delete that information.
      </p>
      <p>
        Discord's Terms of Service require users to be at least 13 years old (or older in some jurisdictions). By using our Service through Discord OAuth, you confirm that you meet Discord's age requirements.
      </p>

      <h2>8. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. For material changes, we will provide at least 30 days' notice.
      </p>
      <p>
        You are advised to review this Privacy Policy periodically for any changes. Continued use of the Service after changes become effective constitutes acceptance of the revised policy.
      </p>

      <h2>9. Contact Information</h2>
      <p>
        If you have any questions about this Privacy Policy or our data practices, please contact us at:
      </p>
      <p>
        [Contact Email]
      </p>
      <p>
        We will respond to your inquiry within a reasonable timeframe.
      </p>
    </div>
  );
}
