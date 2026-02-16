import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Email Verification Required',
};

export default function UnverifiedEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-2xl w-full bg-surface border border-border rounded-xl p-8 space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <svg
            className="w-16 h-16 text-accent-purple"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Title and Subtitle */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Email Verification Required
          </h1>
          <p className="text-gray-400">
            Your Discord account needs a verified email address to use this dashboard.
          </p>
        </div>

        {/* Step-by-step Instructions */}
        <div className="bg-background border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">
            How to verify your email on Discord:
          </h2>
          <ol className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-purple/20 text-accent-purple flex items-center justify-center text-sm font-semibold">
                1
              </span>
              <span>
                Open Discord and click the <strong className="text-white">gear icon</strong> near your username to access <strong className="text-white">User Settings</strong>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-purple/20 text-accent-purple flex items-center justify-center text-sm font-semibold">
                2
              </span>
              <span>
                Navigate to <strong className="text-white">My Account</strong> in the settings sidebar
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-purple/20 text-accent-purple flex items-center justify-center text-sm font-semibold">
                3
              </span>
              <span>
                Under the <strong className="text-white">Email</strong> section, click <strong className="text-white">Verify</strong> or add an email if none is set
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-purple/20 text-accent-purple flex items-center justify-center text-sm font-semibold">
                4
              </span>
              <span>
                Check your email inbox and click the <strong className="text-white">verification link</strong> from Discord
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-purple/20 text-accent-purple flex items-center justify-center text-sm font-semibold">
                5
              </span>
              <span>
                Come back here and <strong className="text-white">try signing in again</strong>
              </span>
            </li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-2">
          <a
            href="/login"
            className="w-full sm:w-auto bg-accent-purple hover:bg-accent-purple/90 text-white font-medium py-3 px-6 transition-colors text-center"
          >
            Try Again
          </a>
          <a
            href="https://support.discord.com/hc/en-us/articles/213219267-Resending-Verification-Email"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto text-gray-400 hover:text-gray-300 underline text-sm text-center"
          >
            Need help? Visit Discord Support
          </a>
        </div>
      </div>
    </div>
  );
}
