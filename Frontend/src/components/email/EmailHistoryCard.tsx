import { memo } from "react";
import { Copy, CopyCheckIcon, MailOpen } from "lucide-react";

export interface EmailHistoryCardProps {
  id: string;
  badge: string;
  badgeClass: string;
  date?: string | Date;
  subject: string;
  body: string;
  modifications?: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onGmailCompose: (subject: string, body: string) => void;
}

function EmailHistoryCardComponent({
  id,
  badge,
  badgeClass,
  date,
  subject,
  body,
  modifications,
  copiedId,
  onCopy,
  onGmailCompose,
}: EmailHistoryCardProps) {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-700 bg-surface-850 shadow-lg">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-800 bg-surface-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>{badge}</span>
          <span className="text-xs text-gray-400 truncate">{date ? new Date(date).toLocaleDateString() : ""}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onGmailCompose(subject, body)}
            aria-label="Send to Gmail"
            className="h-7 w-7 flex items-center justify-center text-gray-300 bg-surface-900 border border-gray-700 rounded-full active:scale-95 transition-transform hover:text-white"
          >
            <MailOpen className="h-3 w-3" />
          </button>
          <button
            onClick={() => onCopy(`Subject: ${subject}\n\n${body}`, id)}
            aria-label="Copy email"
            className="h-7 w-7 flex items-center justify-center text-gray-300 bg-surface-900 border border-gray-700 rounded-full active:scale-95 transition-transform hover:text-white"
          >
            {copiedId === id ? <CopyCheckIcon className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {modifications && (
        <div className="px-4 pt-3">
          <div className="bg-info border-l-4 border-blue-500 rounded-lg p-2.5">
            <p className="text-xs text-blue-200">
              <span className="font-semibold">Modifications:</span> {modifications}
            </p>
          </div>
        </div>
      )}

      <div className="py-4 px-2 sm:px-4 space-y-3">
        <div>
          <h4 className="text-xs font-semibold text-gray-400 mb-1.5">Subject</h4>
          <p className="text-[14px] text-gray-100 bg-surface-900 border border-gray-800 rounded-lg p-2.5">{subject}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-gray-400 mb-1.5">Body</h4>
          {/* Outer keeps radius; desktop scroll is on the inner layer so corners stay visible */}
          <div className="bg-surface-900 border border-gray-800 rounded-lg overflow-hidden">
            <div className="text-[14px] text-gray-100 p-3 whitespace-pre-wrap leading-relaxed lg:max-h-[min(60vh,48rem)] lg:overflow-y-auto custom-scroll">
              {body}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const EmailHistoryCard = memo(EmailHistoryCardComponent);
