import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Upload,
  ChevronDown,
  X,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Image as ImageIcon,
} from 'lucide-react';
import Papa from 'papaparse';
import { useAuth } from '../../context/AuthContext.js';
import { emailApi } from '../../services/api.js';
import { SendLaterPicker } from './SendLaterPicker.js';
import { parseLeadEmails } from '../../utils/csvParser.js';

interface ComposeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fromEmail = user?.email || 'oliver.brown@domain.io';
  const [recipientInput, setRecipientInput] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(200);

  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

  const addRecipient = (rawEmail: string) => {
    const clean = rawEmail.trim().toLowerCase();
    if (clean && emailRegex.test(clean) && !recipients.includes(clean)) {
      setRecipients((prev) => [...prev, clean]);
      setRecipientInput('');
    }
  };

  const removeRecipient = (indexToRemove: number) => {
    setRecipients((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRecipientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addRecipient(recipientInput);
    } else if (e.key === 'Backspace' && !recipientInput && recipients.length > 0) {
      removeRecipient(recipients.length - 1);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setUploadFeedback('Parsing CSV...');

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rawContent = JSON.stringify(results.data);
        const { emails: newRecipients, count } = parseLeadEmails(rawContent);

        if (count === 0) {
          setErrorMessage('No valid email addresses detected in uploaded file.');
          setUploadFeedback(null);
        } else {
          setRecipients((prev) => Array.from(new Set([...prev, ...newRecipients])));
          setUploadFeedback(`${count} email addresses detected and added.`);
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      error: (err) => {
        setErrorMessage(`CSV parsing error: ${err.message}`);
        setUploadFeedback(null);
      },
    });
  };

  const handleSubmit = async () => {
    let finalRecipients = [...recipients];
    if (recipientInput.trim() && emailRegex.test(recipientInput.trim())) {
      finalRecipients.push(recipientInput.trim().toLowerCase());
    }

    if (finalRecipients.length === 0) {
      setErrorMessage('Please provide at least one valid recipient email address.');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Please enter an email subject.');
      return;
    }

    if (!body.trim()) {
      setErrorMessage('Please enter email content.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await emailApi.scheduleEmails({
        subject,
        body,
        recipients: finalRecipients,
        startTime: scheduledDate ? scheduledDate.toISOString() : new Date().toISOString(),
        delayMs: Math.max(0, delaySeconds * 1000),
        hourlyLimit,
      });

      onSuccess();
    } catch (err: any) {
      console.error('Scheduling error:', err);
      setErrorMessage(err.response?.data?.error || 'Failed to schedule emails. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick text formatting helpers for rich editor
  const applyFormat = (tag: string) => {
    setBody((prev) => `${prev} <${tag}>sample</${tag}>`);
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto">
      {/* Top Header Bar */}
      <div className="h-16 border-b border-gray-100 px-8 flex items-center justify-between sticky top-0 bg-white z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-gray-900">Compose New Email</h2>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center space-x-3 relative">
          {/* Attachment Icon */}
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition relative"
          >
            <Paperclip className="w-4 h-4 text-emerald-600" />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              1
            </span>
          </button>

          {/* Clock Icon (Send Later Popover Trigger) */}
          <button
            type="button"
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`p-2 rounded-full transition ${
              scheduledDate
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Send / Send Later Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 border border-[#00A859] text-[#00A859] hover:bg-[#EAF7ED] font-semibold text-xs rounded-full transition-all duration-150 flex items-center space-x-1.5 disabled:opacity-50"
          >
            <span>{scheduledDate ? 'Send Later' : 'Send'}</span>
          </button>

          {/* Send Later Popover */}
          {showDatePicker && (
            <SendLaterPicker
              initialDate={scheduledDate || undefined}
              onSelect={(date) => {
                setScheduledDate(date);
                setShowDatePicker(false);
              }}
              onCancel={() => {
                setScheduledDate(null);
                setShowDatePicker(false);
              }}
            />
          )}
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="p-8 max-w-4xl space-y-6">
        {/* Error / Feedback banners */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-100 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {uploadFeedback && (
          <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-100 flex items-center justify-between">
            <span>{uploadFeedback}</span>
            <button onClick={() => setUploadFeedback(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* From Field */}
        <div className="flex items-center space-x-4">
          <label className="w-16 text-xs font-medium text-gray-500">From</label>
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#F4F5F7] rounded-xl text-xs font-medium text-gray-800">
            <span>{fromEmail}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>

        {/* To Field with Email Chips & CSV Upload */}
        <div className="flex items-start space-x-4">
          <label className="w-16 text-xs font-medium text-gray-500 pt-2.5">To</label>
          <div className="flex-1 flex flex-wrap items-center gap-1.5 border-b border-gray-100 pb-2">
            {/* Display chips */}
            {recipients.slice(0, 3).map((email, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-1 bg-[#D1EFE0] text-emerald-900 rounded-full text-xs font-medium"
              >
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => removeRecipient(idx)}
                  className="ml-1 text-emerald-700 hover:text-emerald-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {recipients.length > 3 && (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold">
                +{recipients.length - 3}
              </span>
            )}

            {/* Input field */}
            <input
              type="email"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={handleRecipientKeyDown}
              onBlur={() => recipientInput && addRecipient(recipientInput)}
              placeholder={recipients.length === 0 ? 'recipient@example.com' : 'Add more...'}
              className="flex-1 min-w-[140px] text-xs text-gray-800 placeholder-gray-400 py-1.5 focus:outline-none bg-transparent"
            />

            {/* Upload List Button */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              onChange={handleCsvUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold px-2 py-1 hover:bg-emerald-50 rounded-lg transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload List</span>
            </button>
          </div>
        </div>

        {/* Subject Field */}
        <div className="flex items-center space-x-4 border-b border-gray-100 pb-2">
          <label className="w-16 text-xs font-medium text-gray-500">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 text-xs text-gray-800 placeholder-gray-400 py-1 focus:outline-none"
          />
        </div>

        {/* Delay & Hourly Limit Controls */}
        <div className="flex items-center space-x-8 text-xs text-gray-600">
          <div className="flex items-center space-x-3">
            <span className="font-medium text-gray-500">Delay between 2 emails</span>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                min="0"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 0)}
                className="w-14 px-2 py-1 bg-white border border-gray-200 rounded-lg text-center font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-gray-400 text-[11px]">sec</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="font-medium text-gray-500">Hourly Limit</span>
            <input
              type="number"
              min="1"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
              className="w-16 px-2 py-1 bg-white border border-gray-200 rounded-lg text-center font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Rich Text Editor Container */}
        <div className="rounded-2xl border border-gray-100 bg-[#FAFAFA] p-4 space-y-3">
          {/* Formatting Toolbar */}
          <div className="flex items-center space-x-1 bg-white rounded-full px-4 py-1.5 shadow-sm border border-gray-100 w-fit text-gray-500">
            <button
              type="button"
              onClick={() => {}}
              className="p-1 hover:text-gray-900 rounded"
              title="Undo"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {}}
              className="p-1 hover:text-gray-900 rounded"
              title="Redo"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-gray-200 mx-1" />
            <button
              type="button"
              onClick={() => applyFormat('b')}
              className="p-1 hover:text-gray-900 rounded"
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('i')}
              className="p-1 hover:text-gray-900 rounded"
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('u')}
              className="p-1 hover:text-gray-900 rounded"
              title="Underline"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('s')}
              className="p-1 hover:text-gray-900 rounded"
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-gray-200 mx-1" />
            <button
              type="button"
              onClick={() => {}}
              className="p-1 hover:text-gray-900 rounded"
              title="Align"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('ol')}
              className="p-1 hover:text-gray-900 rounded"
              title="Numbered List"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('ul')}
              className="p-1 hover:text-gray-900 rounded"
              title="Bullet List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('blockquote')}
              className="p-1 hover:text-gray-900 rounded"
              title="Quote"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {}}
              className="p-1 hover:text-gray-900 rounded"
              title="Image"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Text Area */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type Your Reply..."
            rows={10}
            className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
};
