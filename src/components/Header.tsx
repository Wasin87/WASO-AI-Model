import React from 'react';
import { Mic, Plus, Settings, Languages, Menu, MessageSquareCode, Download } from 'lucide-react';
import { ActiveTab, LanguageMode } from '../types';
import { WasoRobotLogo } from './WasoRobotLogo';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  languageMode: LanguageMode;
  setLanguageMode: (mode: LanguageMode) => void;
  isInstallable?: boolean;
  onInstallApp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onNewChat,
  onToggleSidebar,
  onOpenSettings,
  languageMode,
  setLanguageMode,
  isInstallable = false,
  onInstallApp,
}) => {
  const toggleLanguage = () => {
    if (languageMode === 'en') setLanguageMode('bn');
    else if (languageMode === 'bn') setLanguageMode('auto');
    else setLanguageMode('en');
  };

  const getLangBadge = () => {
    if (languageMode === 'en') return 'EN';
    if (languageMode === 'bn') return 'BN';
    return 'AUTO';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full backdrop-blur-xl bg-[#0a192f]/90 border-b border-white/10 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Sidebar Toggle & Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white transition border border-white/10 flex items-center justify-center cursor-pointer shadow-sm"
            title="Toggle Sessions Sidebar"
            aria-label="Toggle Sessions Sidebar"
          >
            <Menu className="w-5 h-5 text-cyan-400" />
          </button>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center shrink-0">
              <WasoRobotLogo className="w-9 h-9 sm:w-11 sm:h-11" isPulse={true} />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#0a192f] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-xl italic font-black tracking-[0.22em] font-mono bg-gradient-to-r from-cyan-300 via-sky-100 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(6,182,212,0.6)] uppercase flex items-center gap-1.5 select-none">
                  WASO
                  <span className="not-italic text-[9px] px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-mono tracking-normal font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                    AI
                  </span>
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Mode Tabs as Clean Unique Icon Buttons */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-white/10 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('chat')}
            className={`p-2 min-h-[36px] min-w-[36px] rounded-lg transition-all flex items-center justify-center cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,180,216,0.6)] font-bold'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-white/5'
            }`}
            title="Chat Studio Mode"
            aria-label="Chat Studio Mode"
          >
            <MessageSquareCode className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`p-2 min-h-[36px] min-w-[36px] rounded-lg transition-all flex items-center justify-center cursor-pointer relative ${
              activeTab === 'live'
                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)] font-bold'
                : 'text-slate-400 hover:text-rose-300 hover:bg-white/5'
            }`}
            title="WASO Live Voice Mode"
            aria-label="WASO Live Voice Mode"
          >
            <Mic className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          </button>
        </div>

        {/* Right: Icon Buttons Only for Desktop, Tablet, and Mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* PWA Install Button */}
          {isInstallable && (
            <button
              onClick={onInstallApp}
              className="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-95 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 hover:border-cyan-400/50 transition flex items-center justify-center cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)] animate-pulse"
              title="Install WASO PWA App"
              aria-label="Install WASO PWA App"
            >
              <Download className="w-4.5 h-4.5 text-cyan-400 stroke-[2.5]" />
            </button>
          )}

          {/* Language Mode Toggle Icon Button */}
          <button
            onClick={toggleLanguage}
            className="relative p-2 min-h-[38px] min-w-[38px] rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-cyan-300 transition border border-white/10 flex items-center justify-center cursor-pointer"
            title={`Language Mode: ${languageMode.toUpperCase()} (Click to toggle EN / BN / AUTO)`}
            aria-label="Toggle Language Mode"
          >
            <Languages className="w-4 h-4 text-cyan-400" />
            <span className="absolute -top-1 -right-1 text-[9px] font-mono font-bold px-1 bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded-full">
              {getLangBadge()}
            </span>
          </button>

          {/* New Chat Icon Button */}
          <button
            onClick={onNewChat}
            className="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-slate-950 transition shadow-[0_0_12px_rgba(0,180,216,0.4)] flex items-center justify-center cursor-pointer"
            title="Start New Chat Session"
            aria-label="Start New Chat Session"
          >
            <Plus className="w-4 h-4 font-bold stroke-[3]" />
          </button>
        </div>
      </div>
    </header>
  );
};

