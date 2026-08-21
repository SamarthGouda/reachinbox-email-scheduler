import React, { useState } from 'react';
import { Clock, Star } from 'lucide-react';
import { Email } from '../../types/index.js';
import { format } from 'date-fns';

interface EmailListProps {
  emails: Email[];
  type: 'scheduled' | 'sent';
  onSelectEmail: (email: Email) => void;
}

export const EmailList: React.FC<EmailListProps> = ({ emails, type, onSelectEmail }) => {
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatScheduledBadge = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return format(d, 'EEE h:mm:ss a');
    } catch {
      return dateString;
    }
  };

  const getRecipientName = (to: string) => {
    if (to.includes('@')) {
      const [local] = to.split('@');
      return local
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return to;
  };

  const cleanSnippet = (body: string) => {
    return body.replace(/<[^>]*>?/gm, '').trim();
  };

  return (
    <div className="divide-y divide-gray-100">
      {emails.map((email) => {
        const isStarred = starredIds.has(email.id);
        const recipientDisplay = getRecipientName(email.to);
        const snippet = cleanSnippet(email.body);

        return (
          <div
            key={email.id}
            onClick={() => onSelectEmail(email)}
            className="flex items-center px-8 py-3.5 hover:bg-[#F9FAFB] cursor-pointer transition-colors duration-100 group"
          >
            {/* Recipient */}
            <div className="w-56 flex-shrink-0 pr-4">
              <span className="text-sm font-semibold text-gray-900 truncate block">
                To: {recipientDisplay}
              </span>
            </div>

            {/* Status / Scheduled Badge */}
            <div className="flex-shrink-0 mr-4">
              {type === 'scheduled' || email.status === 'SCHEDULED' ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#FFF4E5] text-[#D97706] text-xs font-semibold rounded-full">
                  <Clock className="w-3 h-3 text-[#D97706]" />
                  <span>{formatScheduledBadge(email.scheduledAt)}</span>
                </span>
              ) : email.status === 'PROCESSING' ? (
                <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                  Processing
                </span>
              ) : email.status === 'FAILED' ? (
                <span className="inline-flex items-center px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full">
                  Failed
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 bg-[#F3F4F6] text-gray-600 text-xs font-semibold rounded-full">
                  Sent
                </span>
              )}
            </div>

            {/* Subject and Snippet */}
            <div className="flex-1 min-w-0 pr-6 overflow-hidden">
              <p className="text-sm truncate">
                <span className="font-semibold text-gray-900">{email.subject}</span>
                <span className="text-gray-400 mx-1.5">-</span>
                <span className="text-gray-500 font-normal">{snippet}</span>
              </p>
            </div>

            {/* Star Icon */}
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={(e) => toggleStar(e, email.id)}
                className="p-1 rounded text-gray-300 hover:text-amber-400 transition-colors"
              >
                <Star
                  className={`w-4 h-4 ${
                    isStarred
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-300 group-hover:text-gray-400'
                  }`}
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
