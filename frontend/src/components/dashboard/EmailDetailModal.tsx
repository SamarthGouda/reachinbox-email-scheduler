import React, { useState } from 'react';
import { ArrowLeft, Star, Trash2, ChevronDown } from 'lucide-react';
import { Email } from '../../types/index.js';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext.js';

interface EmailDetailModalProps {
  email: Email;
  onBack: () => void;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({ email, onBack }) => {
  const { user } = useAuth();
  const [isStarred, setIsStarred] = useState(false);

  const formattedDate = () => {
    try {
      const d = email.sentAt ? new Date(email.sentAt) : new Date(email.scheduledAt);
      return format(d, 'MMM d, h:mm a');
    } catch {
      return '';
    }
  };

  const senderName = email.sender?.displayName || 'ReachInbox Scheduler';
  const senderEmail = email.sender?.email || 'scheduler@reachinbox.ai';
  const senderInitial = senderName.charAt(0).toUpperCase();

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto">
      {/* Top Detail Header Bar */}
      <div className="h-16 border-b border-gray-100 px-8 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-gray-900 truncate">
            {email.subject}
            <span className="text-gray-400 font-normal mx-2">|</span>
            <span className="text-xs text-gray-400 font-mono">
              ID: {email.id.substring(0, 8)}
            </span>
          </h2>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-3 ml-4">
          <button
            onClick={() => setIsStarred(!isStarred)}
            className="p-2 text-gray-400 hover:text-amber-500 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Star
              className={`w-4 h-4 ${
                isStarred ? 'fill-amber-400 text-amber-400' : 'text-gray-400'
              }`}
            />
          </button>
          <button className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover ml-2"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center ml-2">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </div>
      </div>

      {/* Main Email Content */}
      <div className="p-8 max-w-4xl">
        {/* Sender info row */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start space-x-3.5">
            {/* Initial Circle Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#00A859] text-white flex items-center justify-center font-bold text-base flex-shrink-0">
              {senderInitial}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-gray-900">{senderName}</span>
                <span className="text-xs text-gray-400">&lt;{senderEmail}&gt;</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500 mt-0.5">
                <span>to {email.to}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-400 font-medium">{formattedDate()}</div>
        </div>

        {/* Status banner */}
        <div className="mb-6">
          {email.status === 'SENT' ? (
            <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium">
              ✓ Sent via Ethereal SMTP {email.sentAt && `at ${format(new Date(email.sentAt), 'PPpp')}`}
            </div>
          ) : email.status === 'SCHEDULED' ? (
            <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-medium">
              🕒 Scheduled for {format(new Date(email.scheduledAt), 'PPpp')}
            </div>
          ) : email.status === 'FAILED' ? (
            <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-50 text-red-800 text-xs font-medium">
              ✕ Failed: {email.lastError || 'Delivery error'}
            </div>
          ) : (
            <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 text-xs font-medium">
              ⚙ Processing dispatch in queue
            </div>
          )}
        </div>

        {/* Email Body */}
        <div className="prose prose-sm max-w-none text-gray-800 space-y-4">
          <div
            dangerouslySetInnerHTML={{
              __html: email.body.replace(/\n/g, '<br />'),
            }}
          />
        </div>
      </div>
    </div>
  );
};
