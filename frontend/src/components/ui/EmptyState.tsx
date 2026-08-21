import React from 'react';
import { Mail, Clock, Send, Plus } from 'lucide-react';

interface EmptyStateProps {
  type: 'scheduled' | 'sent' | 'search';
  onCompose?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, onCompose }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
        {type === 'scheduled' && <Clock className="w-8 h-8" />}
        {type === 'sent' && <Send className="w-8 h-8" />}
        {type === 'search' && <Mail className="w-8 h-8" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">
        {type === 'scheduled' && 'No scheduled emails'}
        {type === 'sent' && 'No sent emails yet'}
        {type === 'search' && 'No matching emails found'}
      </h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        {type === 'scheduled' &&
          'Emails that are queued with delayed dispatch will appear here until they are sent.'}
        {type === 'sent' &&
          'Dispatched emails with delivery confirmations from Ethereal SMTP will appear here.'}
        {type === 'search' && 'Try refining your search terms or clearing the filter.'}
      </p>
      {onCompose && type !== 'search' && (
        <button
          onClick={onCompose}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-full font-medium text-sm hover:bg-emerald-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Compose New Email</span>
        </button>
      )}
    </div>
  );
};
