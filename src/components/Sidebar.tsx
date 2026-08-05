import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Search,
  Download,
  X,
  AlertTriangle,
  FileCode2,
  Sparkles,
  Settings
} from 'lucide-react';
import { ChatSession } from '../types';
import { exportToPDF, exportToPPTX } from '../utils/documentExporter';
import { WasoRobotLogo } from './WasoRobotLogo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onClearAllSessions: () => void;
  onOpenSettings?: () => void;
  isInstallable?: boolean;
  onInstallApp?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClearAllSessions,
  onOpenSettings,
  isInstallable = false,
  onInstallApp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExportSession = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    let mdContent = `# WASO Chat: ${session.title}\nDate: ${new Date(session.createdAt).toLocaleString()}\n\n---\n\n`;
    for (const msg of session.messages) {
      const sender = msg.role === 'user' ? 'User' : 'WASO';
      mdContent += `### ${sender} (${new Date(msg.timestamp).toLocaleTimeString()})\n${msg.content}\n\n`;
      if (msg.imageUrl) {
        mdContent += `![Generated Visual](${msg.imageUrl})\n\n`;
      }
    }

    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waso_chat_${session.id.substring(0, 8)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-80 max-w-[85vw] h-full bg-[#071325] border-r border-white/10 flex flex-col z-10 shadow-2xl">
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WasoRobotLogo className="w-5.5 h-5.5" />
            <h2 className="text-sm italic font-black tracking-[0.2em] font-mono bg-gradient-to-r from-cyan-300 via-white to-cyan-400 bg-clip-text text-transparent uppercase drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
              WASO <span className="not-italic text-xs font-normal text-slate-300 tracking-normal font-sans">Sessions</span>
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {onOpenSettings && (
              <button
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/20 transition border border-white/10 flex items-center gap-1 cursor-pointer bg-white/5"
                title="WASO System Settings"
                aria-label="WASO System Settings"
              >
                <Settings className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-mono text-cyan-300">Settings</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Close Drawer"
              aria-label="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action: New Chat */}
        <div className="p-4 border-b border-white/10">
          <button
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,180,216,0.4)] transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Architecture Session</span>
          </button>

          {/* Search Box */}
          <div className="mt-3 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search chats or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filteredSessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No sessions found. Start a new chat!
            </div>
          ) : (
            filteredSessions.map(session => {
              const isActive = session.id === activeSessionId;
              const msgCount = session.messages.length;
              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                  className={`group relative flex items-center justify-between p-3 rounded-xl border text-xs transition cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200 shadow-[0_0_10px_rgba(0,180,216,0.2)]'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-12">
                    <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <p className="font-medium truncate text-xs">{session.title}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(session.updatedAt).toLocaleDateString()} • {msgCount} msg{msgCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition bg-slate-900/90 px-1 py-0.5 rounded-lg border border-white/10 shadow-lg">
                    <button
                      onClick={e => handleExportSession(session, e)}
                      className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-white/10 rounded transition"
                      title="Export Markdown File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const fullText = session.messages.map(m => `${m.role === 'user' ? 'User' : 'WASO'}:\n${m.content}`).join('\n\n');
                        exportToPDF(session.title, fullText);
                      }}
                      className="p-1 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded transition"
                      title="Export Session as PDF"
                    >
                      <FileCode2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const fullText = session.messages.map(m => `## ${m.role === 'user' ? 'User Question' : 'WASO Solution'}\n${m.content}`).join('\n\n');
                        exportToPPTX(session.title, fullText);
                      }}
                      className="p-1 text-slate-400 hover:text-purple-400 hover:bg-white/10 rounded transition"
                      title="Export Session as PPTX Slides"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    </button>
                    {sessions.length > 1 && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded transition"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PWA Promotion Card */}
        {isInstallable && (
          <div className="mx-3.5 mb-3 p-3 rounded-xl bg-gradient-to-br from-cyan-950/50 to-blue-950/30 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)] shrink-0">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-cyan-300 font-mono">Install WASO App</p>
                <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                  Access WASO directly from your home screen with high-speed performance and offline capabilities.
                </p>
                <button
                  onClick={onInstallApp}
                  className="mt-2 w-full py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] transition transform hover:scale-[1.02] active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)] flex items-center justify-center gap-1 font-mono uppercase"
                >
                  <Download className="w-3 h-3 text-slate-950 stroke-[2.5]" />
                  <span>Install Web App</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40">
          {showConfirmClear ? (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs">
              <p className="text-rose-200 font-medium mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Clear all chats?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onClearAllSessions();
                    setShowConfirmClear(false);
                  }}
                  className="flex-1 py-1 px-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px]"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="flex-1 py-1 px-2 rounded bg-white/10 hover:bg-white/20 text-slate-300 text-[11px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmClear(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}

          <div className="mt-3 text-[10px] text-center text-slate-500 font-mono">
            WASO v2.5 • Wasin AI Responsive Intelligence
          </div>
        </div>
      </div>
    </div>
  );
};
