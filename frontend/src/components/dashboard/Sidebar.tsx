import React, { useState } from 'react';
import { Clock, Send, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface SidebarProps {
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onComposeClick: () => void;
  scheduledCount: number;
  sentCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onComposeClick,
  scheduledCount,
  sentCount,
}) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <aside className="w-64 border-r border-gray-100 bg-white flex flex-col h-screen flex-shrink-0 select-none">
      {/* Top Brand Logo */}
      <div className="px-6 py-5 flex items-center">
        <div className="flex items-center space-x-2">
          {/* Stylized Logo QNB / ReachInbox */}
          <span className="font-extrabold text-2xl tracking-tighter text-black font-mono">
            QNB
          </span>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="px-4 py-2 relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-[#F8F9FA] hover:bg-gray-100 transition-colors text-left"
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.name || 'Oliver Brown'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || 'oliver.brown@domain.io'}
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" />
        </button>

        {/* User Dropdown Menu */}
        {showUserMenu && (
          <div className="absolute left-4 right-4 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
            <div className="px-3 py-2 border-b border-gray-50 flex items-center space-x-2 text-xs text-gray-500">
              <UserIcon className="w-3.5 h-3.5" />
              <span className="truncate">{user?.email}</span>
            </div>
            <button
              onClick={() => {
                setShowUserMenu(false);
                logout();
              }}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>

      {/* Compose Button */}
      <div className="px-4 py-4">
        <button
          onClick={onComposeClick}
          className="w-full py-2.5 px-4 border-2 border-[#00A859] text-[#00A859] hover:bg-[#EAF7ED] font-semibold text-sm rounded-full transition-all duration-150 flex items-center justify-center"
        >
          <span>Compose</span>
        </button>
      </div>

      {/* Navigation section */}
      <div className="flex-1 px-3 py-2 space-y-1">
        <div className="px-3 py-2">
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
            CORE
          </span>
        </div>

        {/* Scheduled Tab */}
        <button
          onClick={() => onTabChange('scheduled')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'scheduled'
              ? 'bg-[#EAF7ED] text-gray-900 font-semibold'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Clock
              className={`w-4 h-4 ${
                activeTab === 'scheduled' ? 'text-gray-800' : 'text-gray-500'
              }`}
            />
            <span>Scheduled</span>
          </div>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              activeTab === 'scheduled'
                ? 'text-emerald-800'
                : 'text-gray-400'
            }`}
          >
            {scheduledCount}
          </span>
        </button>

        {/* Sent Tab */}
        <button
          onClick={() => onTabChange('sent')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'sent'
              ? 'bg-[#EAF7ED] text-gray-900 font-semibold'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Send
              className={`w-4 h-4 ${
                activeTab === 'sent' ? 'text-gray-800' : 'text-gray-500'
              }`}
            />
            <span>Sent</span>
          </div>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              activeTab === 'sent'
                ? 'text-emerald-800'
                : 'text-gray-400'
            }`}
          >
            {sentCount}
          </span>
        </button>
      </div>
    </aside>
  );
};
