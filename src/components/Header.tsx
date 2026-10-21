import React from 'react';
import { Download } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onQuickDownload: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onQuickDownload,
}) => {
  const navItems = [
    { id: 'download', label: 'Download Tool' },
    { id: 'security', label: 'Security & Safety' },
    { id: 'inspector', label: 'Folder Preview' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#080c14]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-18">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-white text-slate-950 flex items-center justify-center font-bold text-sm shadow-md">
              D
            </div>
            <button
              onClick={() => onSelectTab('download')}
              className="text-lg font-bold tracking-tight text-white hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer flex items-baseline gap-1.5"
            >
              <span>DriveSync</span>
              <span className="font-editorial italic font-normal text-emerald-400 text-sm">Pro</span>
            </button>
          </div>

          {/* Zone 2: 3 clean single-line nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-emerald-400 rounded-full shadow-xs shadow-emerald-400/50" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onQuickDownload}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-white rounded-xl hover:bg-slate-200 active:scale-[0.98] transition-all shadow-md shadow-white/5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Tool (.zip)</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
