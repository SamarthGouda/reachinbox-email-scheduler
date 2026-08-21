import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { addDays, setHours, setMinutes, format } from 'date-fns';

interface SendLaterPickerProps {
  initialDate?: Date;
  onSelect: (date: Date) => void;
  onCancel: () => void;
}

export const SendLaterPicker: React.FC<SendLaterPickerProps> = ({
  initialDate,
  onSelect,
  onCancel,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || addDays(new Date(), 1));
  const [customDateTime, setCustomDateTime] = useState<string>(
    format(initialDate || addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm")
  );

  const handlePreset = (presetType: string) => {
    const tomorrow = addDays(new Date(), 1);
    let target = tomorrow;

    switch (presetType) {
      case 'tomorrow':
        target = setMinutes(setHours(tomorrow, 9), 0);
        break;
      case 'tomorrow-10':
        target = setMinutes(setHours(tomorrow, 10), 0);
        break;
      case 'tomorrow-11':
        target = setMinutes(setHours(tomorrow, 11), 0);
        break;
      case 'tomorrow-15':
        target = setMinutes(setHours(tomorrow, 15), 0);
        break;
    }

    setSelectedDate(target);
    setCustomDateTime(format(target, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDateTime(e.target.value);
    const d = new Date(e.target.value);
    if (!isNaN(d.getTime())) {
      setSelectedDate(d);
    }
  };

  return (
    <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50 select-none">
      <h3 className="font-semibold text-gray-900 text-sm mb-4">Send Later</h3>

      {/* Date & Time Picker */}
      <div className="relative mb-5">
        <input
          type="datetime-local"
          value={customDateTime}
          onChange={handleCustomChange}
          className="w-full text-xs text-gray-700 font-medium px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500"
        />
        <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
      </div>

      {/* Quick Presets */}
      <div className="space-y-1.5 mb-6 text-xs text-gray-600 font-medium">
        <button
          type="button"
          onClick={() => handlePreset('tomorrow')}
          className="w-full text-left py-2 px-2.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Tomorrow
        </button>
        <button
          type="button"
          onClick={() => handlePreset('tomorrow-10')}
          className="w-full text-left py-2 px-2.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Tomorrow, 10:00 AM
        </button>
        <button
          type="button"
          onClick={() => handlePreset('tomorrow-11')}
          className="w-full text-left py-2 px-2.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Tomorrow, 11:00 AM
        </button>
        <button
          type="button"
          onClick={() => handlePreset('tomorrow-15')}
          className="w-full text-left py-2 px-2.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Tomorrow, 3:00 PM
        </button>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end space-x-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSelect(selectedDate)}
          className="px-4 py-1.5 border border-[#00A859] text-[#00A859] hover:bg-[#EAF7ED] text-xs font-semibold rounded-full transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
