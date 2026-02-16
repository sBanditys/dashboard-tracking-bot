'use client'

import { Monitor, Smartphone, Tablet } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ParsedSession } from '@/types/session'
import { cn } from '@/lib/utils'

interface SessionCardProps {
  session: ParsedSession;
  onRevoke: (sessionId: string) => void;
}

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: Monitor,
} as const;

export function SessionCard({ session, onRevoke }: SessionCardProps) {
  const DeviceIcon = DEVICE_ICONS[session.device.type];

  return (
    <div className="bg-surface border border-border rounded-sm p-6 transition-all duration-300 ease-in-out">
      {/* Top row: device icon + name + badge + revoke button */}
      <div className="flex items-start gap-3 mb-3">
        <DeviceIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-medium">{session.device.name}</h3>
            {session.isCurrent && (
              <span className="bg-accent-purple/20 text-accent-purple px-2 py-0.5 rounded text-xs font-medium">
                Current Session
              </span>
            )}
          </div>

          {/* Browser and OS info */}
          <p className="text-sm text-gray-400 mt-1">
            {session.browser.name} {session.browser.version} on {session.os.name} {session.os.version}
          </p>
        </div>

        {/* Revoke button - always show */}
        <button
          onClick={() => onRevoke(session.id)}
          className="text-sm text-red-400 hover:text-red-300 transition-colors ml-auto"
        >
          Revoke
        </button>
      </div>

      {/* Bottom section: IP and Last Active */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
        <div>
          <div className="text-gray-400 text-xs mb-1">IP Address</div>
          <div className="text-white font-mono text-sm">{session.ipAddress}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs mb-1">Last Active</div>
          <div className="text-white text-sm">
            {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
          </div>
        </div>
      </div>
    </div>
  );
}
