import React from 'react';
import { X, Bot, Shield, Globe, Database, Cpu, CheckCircle } from 'lucide-react';
import { LanguageMode } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  languageMode: LanguageMode;
  setLanguageMode: (mode: LanguageMode) => void;
  onClearStorage: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  languageMode,
  setLanguageMode,
  onClearStorage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#071325] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 space-y-5 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold">WASO Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

         
        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-cyan-300">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Senior Software Architect Persona</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            Created by <strong className="text-white">Wasin</strong>. Specialized in high-throughput architecture, code analysis, real-time audio synthesis, and 8K visual generation in English and Bengali (বাংলা).
          </p>
        </div>

     
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Language Preference</span>
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            {[
              { id: 'auto', label: 'Auto Detect' },
              { id: 'en', label: 'English' },
              { id: 'bn', label: 'বাংলা' },
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => setLanguageMode(lang.id as LanguageMode)}
                className={`py-2 px-3 rounded-xl border text-center transition cursor-pointer ${
                  languageMode === lang.id
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 font-bold'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Models Matrix */}
        <div className="space-y-2 text-xs">
          <label className="font-semibold text-slate-300 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Active Model Matrix</span>
          </label>
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-[11px] font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Text & Code:</span>
              <span className="text-cyan-300">gemini-3.6-flash</span>
            </div>
            <div className="flex justify-between">
              <span>8K Visuals:</span>
              <span className="text-purple-300">gemini-3.1-flash-image</span>
            </div>
            <div className="flex justify-between">
              <span>Voice TTS:</span>
              <span className="text-emerald-300">gemini-3.1-flash-tts-preview</span>
            </div>
            <div className="flex justify-between">
              <span>Live Audio:</span>
              <span className="text-rose-300">gemini-3.1-flash-live-preview</span>
            </div>
          </div>
        </div>

        {/* Storage Management */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Database className="w-3.5 h-3.5" />
            <span>Local Storage (`waso_chats`)</span>
          </div>
          <button
            onClick={() => {
              if (confirm('Clear all stored WASO chats from localStorage?')) {
                onClearStorage();
                onClose();
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
          >
            Clear Data
          </button>
        </div>
      </div>
    </div>
  );
};
