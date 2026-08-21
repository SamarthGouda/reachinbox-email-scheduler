import React from 'react';
import { Search, Filter, RotateCw } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="h-16 border-b border-gray-100 px-8 flex items-center justify-between bg-white">
      {/* Search Input */}
      <div className="flex-1 max-w-xl">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            className="w-full pl-11 pr-4 py-2.5 bg-[#F4F5F7] border border-transparent rounded-full text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Action Icons */}
      <div className="flex items-center space-x-3 ml-4">
        <button
          type="button"
          title="Filter"
          className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Filter className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onRefresh}
          title="Refresh"
          className={`p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ${
            isRefreshing ? 'animate-spin text-emerald-600' : ''
          }`}
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
