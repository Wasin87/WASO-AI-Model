import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Sparkles,
  X,
  FileText,
  Wand2,
  Code2,
  Cpu,
  Globe,
  ChevronDown,
  Layers,
  Presentation,
  Plus,
  AudioLines
} from 'lucide-react';
import { InputMode, FileAttachment } from '../types';

export const AI_MODELS = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', label: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', label: 'Gemini 3.5 Flash Lite' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', label: 'Gemini 3.1 Pro Preview' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', label: 'Gemini 3.1 Flash Lite' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', label: 'Gemini 3 Flash Preview' },
];

interface InputAreaProps {
  onSendMessage: (
    text: string,
    mode: InputMode,
    attachments: FileAttachment[],
    selectedModel: string,
    aspectRatio?: string,
    stylePreset?: string
  ) => void;
  isGenerating: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSendMessage,
  isGenerating,
}) => {
  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.6-flash');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [stylePreset, setStylePreset] = useState<string>('Cinematic 8K');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = () => {
    if ((!inputText.trim() && attachments.length === 0) || isGenerating) return;
    onSendMessage(inputText.trim(), inputMode, attachments, selectedModel, aspectRatio, stylePreset);
    setInputText('');
    setAttachments([]);
    setIsPlusMenuOpen(false);
    setIsModelDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 20MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newAttachment: FileAttachment = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl,
          mimeType: file.type || 'application/octet-stream',
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleSuggestionClick = (prompt: string, mode: InputMode = 'text') => {
    setInputMode(mode);
    setInputText(prompt);
  };

  const currentModelObj = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];
  const isImageMode = inputMode === 'image';

  return (
    <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 pb-4 pt-1">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
        accept="image/*,application/pdf,text/*,.js,.ts,.py,.json"
      />

      {/* Quick Prompt Suggestions */}
      <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          onClick={() =>
            handleSuggestionClick(
              'Write a high-performance C / C++ memory-mapped queue processor with thread-safe atomic locks and colorful syntax explanation.'
            )
          }
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 border border-white/10 transition cursor-pointer text-[11px]"
        >
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>C / C++ Code</span>
        </button>

        <button
          onClick={() =>
            handleSuggestionClick(
              'Generate a complete architectural flowchart diagram and sequence structure for a real-time AI audio streaming engine.'
            )
          }
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 border border-white/10 transition cursor-pointer text-[11px]"
        >
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span>System Diagram</span>
        </button>

        <button
          onClick={() =>
            handleSuggestionClick(
              'Generate a detailed PDF report and PPTX presentation outline for cloud microservices architecture.'
            )
          }
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/30 hover:bg-purple-900/50 text-purple-200 border border-purple-500/30 transition cursor-pointer text-[11px]"
        >
          <FileText className="w-3.5 h-3.5 text-purple-400" />
          <span>PDF / PPTX Report</span>
        </button>

        <button
          onClick={() =>
            handleSuggestionClick(
              'আমাকে বাংলা এবং ইংরেজিতে একটি পাইথন ও রাস্ট মাল্টি-থ্রেডেড মেমোরি কন্ট্রোল গাইড বানিয়ে দাও।'
            )
          }
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-200 border border-emerald-500/30 transition cursor-pointer text-[11px]"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>বাংলা গাইড</span>
        </button>
      </div>

      {/* Main Copilot Input Field Container (Matches Image Reference Exactly) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-3xl border transition-all duration-300 bg-[#0d1527]/95 ${
          isDragging ? 'border-dashed border-cyan-400 bg-cyan-950/40 scale-[1.01]' : ''
        } ${
          isImageMode
            ? 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
            : 'border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] focus-within:border-cyan-500/40 focus-within:shadow-[0_0_20px_rgba(0,180,216,0.2)]'
        }`}
      >
        {/* File Attachments Container */}
        {attachments.length > 0 && (
          <div className="p-3 border-b border-white/10 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs text-slate-200"
              >
                {att.mimeType.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                ) : (
                  <FileText className="w-4 h-4 text-cyan-400" />
                )}
                <span className="max-w-[130px] truncate">{att.name}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="p-0.5 rounded-full hover:bg-white/20 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Image Mode Options */}
        {isImageMode && (
          <div className="px-4 pt-2.5 pb-1 border-b border-purple-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              <span className="text-[11px] font-mono text-purple-300 mr-1">Ratio:</span>
              {['1:1', '16:9', '9:16', '4:3', '3:4'].map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] border transition cursor-pointer ${
                    aspectRatio === ratio
                      ? 'bg-purple-500 text-white font-bold border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                      : 'bg-black/40 text-purple-200 border-purple-500/30 hover:bg-purple-900/40'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 py-1">
              <span className="text-[11px] font-mono text-purple-300">Style:</span>
              <select
                value={stylePreset}
                onChange={(e) => setStylePreset(e.target.value)}
                className="bg-black/60 text-purple-100 border border-purple-500/40 rounded-md px-2 py-0.5 text-[11px] focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                <option value="Cinematic 8K">Cinematic 8K</option>
                <option value="Photorealistic">Photorealistic</option>
                <option value="Cyberpunk / Sci-Fi">Cyberpunk / Sci-Fi</option>
                <option value="Anime & Manga">Anime & Manga</option>
                <option value="3D Digital Render">3D Digital Render</option>
                <option value="Fantasy Concept Art">Fantasy Concept Art</option>
                <option value="Minimalist Logo Vector">Minimalist Vector</option>
              </select>
            </div>
          </div>
        )}

        {/* Text Input Area - Compact & Professional Height */}
        <div className="px-3.5 pt-2.5 pb-0.5">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isImageMode
                ? 'Describe the visual image you want WASO to synthesize...'
                : 'Message WASO AI or ask questions in English / বাংলা...'
            }
            className="w-full bg-transparent border-none text-xs sm:text-sm text-slate-100 placeholder-slate-400/80 focus:outline-none resize-none min-h-[28px] max-h-[85px] leading-snug"
            rows={1}
          />
        </div>

        {/* Bottom Toolbar inside the input field - Tight & Perfectly Fitted Gap */}
        <div className="flex items-center justify-between px-2.5 pb-2 pt-0.5">
          {/* Left Controls: Plus Icon Button + Model Selector Pill Dropdown Button */}
          <div className="flex items-center gap-2">
            {/* [+] Plus Button for Attachments & Extra Features */}
            <div className="relative" ref={plusMenuRef}>
              <button
                type="button"
                onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center transition cursor-pointer"
                title="Add Attachment or Select Mode"
                aria-label="Add Attachment or Select Mode"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Plus Popup Menu */}
              {isPlusMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-56 z-50 bg-[#121927] border border-white/10 rounded-2xl shadow-2xl py-1.5 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-mono text-cyan-400 uppercase tracking-wider border-b border-white/5">
                    Attachments & Tools
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setIsPlusMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition flex items-center gap-2 cursor-pointer"
                  >
                    <Paperclip className="w-4 h-4 text-cyan-400" />
                    <span>Upload File or Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('text');
                      setIsPlusMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition flex items-center gap-2 cursor-pointer ${
                      inputMode === 'text' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    <span>Text & Code Mode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('image');
                      setIsPlusMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition flex items-center gap-2 cursor-pointer ${
                      inputMode === 'image' ? 'bg-purple-500/20 text-purple-300 font-semibold' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <Wand2 className="w-4 h-4 text-purple-400" />
                    <span>8K Image Synthesis</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('text');
                      setInputText((prev) => (prev ? `${prev}\nGenerate a complete professional PDF document` : 'Please generate a detailed professional PDF report on: '));
                      setIsPlusMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-red-300 transition flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-red-400" />
                    <span>PDF Document Generator</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('text');
                      setInputText((prev) => (prev ? `${prev}\nCreate executive PPTX presentation slides` : 'Please create an executive PPTX presentation deck on: '));
                      setIsPlusMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-purple-300 transition flex items-center gap-2 cursor-pointer"
                  >
                    <Presentation className="w-4 h-4 text-purple-400" />
                    <span>PPTX Presentation Deck</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('text');
                      setInputText((prev) => (prev ? `${prev}\nGenerate complete architectural flowchart diagram` : 'Generate system architecture diagram and flowchart for: '));
                      setIsPlusMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-blue-300 transition flex items-center gap-2 cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span>Architecture Diagram</span>
                  </button>
                </div>
              )}
            </div>

            {/* Model Dropdown Pill Button (e.g. [Smart v] / [Gemini 3.6 Flash v] exactly as image) */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 text-slate-200 hover:text-white transition text-xs font-medium cursor-pointer"
              >
                <span className="text-[11px] font-semibold text-slate-200">{currentModelObj.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Model Selector Dropdown Menu */}
              {isModelDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 z-50 bg-[#121824] border border-white/10 rounded-2xl shadow-2xl py-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="px-3.5 py-2 text-[10px] font-mono text-cyan-400 uppercase tracking-wider border-b border-white/5">
                    Select AI Engine / Auto-Fallback Model
                  </div>
                  {AI_MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        setSelectedModel(model.id);
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs transition flex items-center justify-between cursor-pointer ${
                        selectedModel === model.id
                          ? 'bg-cyan-500/20 text-cyan-300 font-semibold border-l-2 border-cyan-400'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>{model.name}</span>
                      {selectedModel === model.id && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Controls: Waveform / Send Button Pinned to Far Right (Matches Image 2 Right Side) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSend}
              disabled={(!inputText.trim() && attachments.length === 0) || isGenerating}
              className={`p-2 min-w-[34px] min-h-[34px] rounded-full flex items-center justify-center transition cursor-pointer ${
                (!inputText.trim() && attachments.length === 0) || isGenerating
                  ? 'text-slate-500 hover:bg-white/5 cursor-not-allowed'
                  : isImageMode
                  ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] active:scale-95'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(0,180,216,0.5)] active:scale-95'
              }`}
              title="Send Prompt (or press Enter)"
              aria-label="Send Prompt"
            >
              {isGenerating ? (
                <AudioLines className="w-4 h-4 animate-pulse text-slate-300" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
