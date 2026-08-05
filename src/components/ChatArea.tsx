import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  Bot,
  User,
  Volume2,
  VolumeX,
  Edit2,
  Copy,
  Check,
  Sparkles,
  Clock,
  FileText,
  Loader2,
  Cpu,
  ThumbsUp,
  ThumbsDown,
  Share2,
  RotateCcw,
  Presentation,
  Download,
  Link
} from 'lucide-react';
import { ChatMessage, FileAttachment } from '../types';
import { CodeBlock } from './CodeBlock';
import { exportToPDF, exportToPPTX } from '../utils/documentExporter';
import { WasoRobotLogo } from './WasoRobotLogo';
import { parseResponseJson } from '../utils/storage';


/**
 * Safely converts any base64 image data URI to a Blob and initiates a browser download.
 * This works perfectly on desktops (PC/macOS) and mobile/tablets (iOS/Android).
 */
const downloadBase64Image = (dataUrl: string, filenamePrefix: string) => {
  let extension = 'png';
  if (dataUrl.includes('image/svg+xml')) {
    extension = 'svg';
  } else if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) {
    extension = 'jpg';
  } else if (dataUrl.includes('image/gif')) {
    extension = 'gif';
  } else if (dataUrl.includes('image/webp')) {
    extension = 'webp';
  }

  // Clean filename
  const cleanPrefix = filenamePrefix
    .slice(0, 50)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  
  const filename = `waso_${cleanPrefix || 'visual'}_${Math.floor(Date.now() / 1000)}.${extension}`;

  try {
    if (dataUrl.startsWith('data:')) {
      const parts = dataUrl.split(',');
      if (parts.length < 2) throw new Error('Invalid data URI');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } else {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (err) {
    console.error('Image download failed, falling back to direct open:', err);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

interface ChatAreaProps {
  messages: ChatMessage[];
  onEditMessage: (messageId: string, newContent: string) => void;
  isGenerating: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onEditMessage,
  isGenerating,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [dislikedMap, setDislikedMap] = useState<Record<string, boolean>>({});
  const [shareMenuOpenId, setShareMenuOpenId] = useState<string | null>(null);
  const [linkCopiedId, setLinkCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleCopyShareLink = (msgId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('chat', msgId);
    navigator.clipboard.writeText(url.toString());
    setLinkCopiedId(msgId);
    setTimeout(() => setLinkCopiedId(null), 2500);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Handle TTS (Text-To-Speech)
  const handlePlayVoice = async (message: ChatMessage) => {
    if (playingAudioId === message.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }

    try {
      setLoadingAudioId(message.id);
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message.content, voiceName: 'Charon' }),
      });

      const data = await parseResponseJson(res, 'TTS voice synthesis failed');
      if (!data.audio) throw new Error('No audio returned');

      const binary = atob(data.audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const wavBuffer = createWavHeader(bytes, 24000);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setPlayingAudioId(message.id);

      audio.onended = () => {
        setPlayingAudioId(null);
        audioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (err) {
      console.error('Failed to play TTS audio:', err);
    } finally {
      setLoadingAudioId(null);
    }
  };

  const handleCopyMessage = (messageId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleLike = (id: string) => {
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
    if (dislikedMap[id]) {
      setDislikedMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  const toggleDislike = (id: string) => {
    setDislikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
    if (likedMap[id]) {
      setLikedMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  const startEditing = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const submitEdit = (msgId: string) => {
    if (editContent.trim()) {
      onEditMessage(msgId, editContent.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto px-2.5 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 scrollbar-thin">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isEditing = editingId === msg.id;
          const isLiked = likedMap[msg.id];
          const isDisliked = dislikedMap[msg.id];

          return (
            <div
              key={msg.id}
              className={`flex gap-2 sm:gap-4 ${
                isUser ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Avatar for WASO */}
              {!isUser && (
                <div className="shrink-0 flex items-center justify-center">
                  <WasoRobotLogo className="w-7 h-7 sm:w-10 sm:h-10" isPulse={true} />
                </div>
              )}

              {/* Message Content Container */}
              <div
                className={`flex flex-col max-w-[95%] sm:max-w-[88%] md:max-w-[84%] ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                {/* Header label */}
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 px-1 text-[11px] font-mono text-slate-400">
                  <span className="font-semibold text-slate-200">
                    {isUser ? 'You' : 'WASO'}
                  </span>
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.modelUsed && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      <Cpu className="w-2.5 h-2.5" />
                      {msg.modelUsed}
                    </span>
                  )}
                  {msg.thinkingTimeMs && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-2.5 h-2.5 text-cyan-400" />
                      {(msg.thinkingTimeMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>

                {/* Main Bubble Card */}
                <div
                  className={`relative p-3.5 sm:p-5 rounded-2xl border text-xs sm:text-sm leading-relaxed backdrop-blur-md shadow-xl transition-all w-full ${
                    isUser
                      ? 'bg-gradient-to-br from-cyan-600/20 to-blue-700/20 border-cyan-500/30 text-slate-100 rounded-tr-xs'
                      : msg.isError
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-200 rounded-tl-xs'
                      : 'bg-[#0f172a]/90 border-white/10 text-slate-100 rounded-tl-xs hover:border-cyan-500/30'
                  }`}
                >
                  {/* File Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-200"
                        >
                          {att.mimeType.startsWith('image/') ? (
                            <img
                              src={att.dataUrl}
                              alt={att.name}
                              className="w-8 h-8 object-cover rounded"
                            />
                          ) : (
                            <FileText className="w-5 h-5 text-cyan-400" />
                          )}
                          <div className="max-w-[140px] truncate">
                            <p className="font-medium truncate">{att.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {(att.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Editing Mode */}
                  {isEditing ? (
                    <div className="space-y-3 min-w-[280px]">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-slate-900 border border-cyan-500/50 text-xs text-slate-100 focus:outline-none"
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 rounded bg-white/10 text-slate-300 text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => submitEdit(msg.id)}
                          className="px-3 py-1 rounded bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          Resynthesize
                        </button>
                      </div>
                    </div>
                  ) : (
                    <FormattedMessage text={msg.content} />
                  )}

                  {/* User Question Action Icons (Edit & Copy Buttons) */}
                  {isUser && !isEditing && (
                    <div className="mt-3 pt-2 border-t border-cyan-500/20 flex items-center justify-end gap-1.5 text-slate-300">
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-cyan-500/20 hover:text-cyan-200 border border-white/10 transition cursor-pointer text-xs font-medium"
                        title="Copy question text"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => startEditing(msg)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-cyan-500/20 hover:text-cyan-200 border border-white/10 transition cursor-pointer text-xs font-medium"
                        title="Edit question text"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}

                  {/* Generated Image Result Card */}
                  {msg.imageUrl && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)] bg-black/40 p-2">
                      <div className="flex items-center justify-between gap-2 text-xs font-mono text-purple-300 mb-2 px-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          <span>8K Visual Synthesis Output</span>
                        </div>
                        <button
                          onClick={() => {
                            const promptText = msg.content || 'waso_8k_visual';
                            downloadBase64Image(msg.imageUrl!, promptText);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 hover:text-white border border-purple-500/40 hover:border-purple-500/60 transition cursor-pointer text-xs font-medium font-sans"
                          title="Download high-resolution 8K image"
                        >
                          <Download className="w-3.5 h-3.5 text-purple-300" />
                          <span>Download Image</span>
                        </button>
                      </div>
                      <img
                        src={msg.imageUrl}
                        alt="WASO Generated Visual"
                        className="w-full h-auto max-h-[450px] object-contain rounded-lg"
                      />
                    </div>
                  )}

                  {/* Actions Bar under Bubble (Exact match to uploaded Image 3 & Image 4) */}
                  {!isUser && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        {/* Thumbs Up */}
                        <button
                          onClick={() => toggleLike(msg.id)}
                          className={`p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer ${
                            isLiked ? 'text-cyan-400 bg-cyan-500/10' : 'hover:text-slate-200'
                          }`}
                          title="Good response"
                          aria-label="Good response"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Thumbs Down */}
                        <button
                          onClick={() => toggleDislike(msg.id)}
                          className={`p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer ${
                            isDisliked ? 'text-rose-400 bg-rose-500/10' : 'hover:text-slate-200'
                          }`}
                          title="Bad response"
                          aria-label="Bad response"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Share & Export Chat Link */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setShareMenuOpenId(shareMenuOpenId === msg.id ? null : msg.id)
                            }
                            className={`p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer flex items-center gap-1 ${
                              linkCopiedId === msg.id ? 'text-emerald-400 bg-emerald-500/10' : 'hover:text-slate-200'
                            }`}
                            title="Share Chat & Export"
                            aria-label="Share Chat & Export"
                          >
                            {linkCopiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                            )}
                          </button>

                          {shareMenuOpenId === msg.id && (
                            <div className="absolute left-0 bottom-full mb-2 w-52 z-50 bg-[#121927] border border-white/10 rounded-xl shadow-2xl py-1 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
                              <button
                                onClick={() => {
                                  handleCopyShareLink(msg.id);
                                  setShareMenuOpenId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 text-cyan-300 flex items-center gap-2 cursor-pointer font-medium border-b border-white/5"
                              >
                                <Link className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Copy Chat Share Link</span>
                              </button>
                              <button
                                onClick={() => {
                                  exportToPDF('WASO_Report', msg.content);
                                  setShareMenuOpenId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 text-slate-200 flex items-center gap-2 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-red-400" />
                                <span>Export as PDF Report</span>
                              </button>
                              <button
                                onClick={() => {
                                  exportToPPTX('WASO_Slides', msg.content);
                                  setShareMenuOpenId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 text-slate-200 flex items-center gap-2 cursor-pointer"
                              >
                                <Presentation className="w-3.5 h-3.5 text-purple-400" />
                                <span>Export as PPTX Slides</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Copy text */}
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="p-1.5 rounded-lg hover:bg-white/10 hover:text-cyan-300 transition cursor-pointer"
                          title="Copy text"
                          aria-label="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Voice button */}
                        <button
                          onClick={() => handlePlayVoice(msg)}
                          disabled={loadingAudioId === msg.id}
                          className={`p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer ${
                            playingAudioId === msg.id ? 'text-rose-400 bg-rose-500/10' : 'hover:text-cyan-300'
                          }`}
                          title="Listen with WASO Voice"
                          aria-label="Listen with WASO Voice"
                        >
                          {loadingAudioId === msg.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          ) : playingAudioId === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 animate-pulse text-rose-400" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Re-generate button */}
                        <button
                          onClick={() => onEditMessage(msg.id, msg.content)}
                          className="p-1.5 rounded-lg hover:bg-white/10 hover:text-cyan-300 transition cursor-pointer"
                          title="Regenerate response"
                          aria-label="Regenerate response"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Avatar for User */}
              {isUser && (
                <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isGenerating && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-cyan-500/20 max-w-sm">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <WasoRobotLogo className="w-8 h-8" isSpeaking={true} isPulse={true} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-cyan-300 flex items-center gap-2">
                WASO is synthesizing architecture...
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Reasoning with Gemini 3.6 Flash / Pro
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

/**
 * Rich Markdown Formatted Message component matching attached image structure:
 * - Headings with emoji badges (🔑, ✅, 🎯)
 * - Tables with rounded borders & headers
 * - Inline code pills (e.g. marks >= 50)
 * - Code blocks (via CodeBlock component)
 * - Bullet & numbered lists with bold text
 */
const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  // Auto-wrap bare \frac{...}{...} math formulas if missing $ delimiters
  const processedText = React.useMemo(() => {
    if (!text) return '';
    return text.replace(
      (/(?<!\$)(?<!\\)(\\frac\{[^}]+\}\{[^}]+\}(?:\s*[\times*+\-/=]\s*[\d%a-zA-Z]+)*)(?!\$)/g),
      '$$$1$$'
    );
  }, [text]);

  return (
    <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-100 font-sans leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeStr = String(children).replace(/\n$/, '');
            if (!inline && (match || codeStr.includes('\n'))) {
              return <CodeBlock language={match ? match[1] : 'code'} code={codeStr} />;
            }
            return (
              <code
                className="px-2 py-0.5 mx-0.5 rounded-md bg-[#162238] border border-white/10 text-cyan-300 font-mono text-[11px] inline-block font-medium shadow-sm"
                {...props}
              >
                {children}
              </code>
            );
          },
          table({ children }: any) {
            return (
              <div className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-[#0d1626] shadow-xl">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }: any) {
            return (
              <thead className="bg-[#131f36] border-b border-white/10 text-slate-100 font-semibold uppercase tracking-wider text-[11px] sm:text-xs">
                {children}
              </thead>
            );
          },
          tbody({ children }: any) {
            return <tbody className="divide-y divide-white/5 text-slate-200">{children}</tbody>;
          },
          tr({ children }: any) {
            return <tr className="hover:bg-white/[0.03] transition-colors">{children}</tr>;
          },
          th({ children }: any) {
            return (
              <th className="px-3.5 py-2.5 font-semibold text-slate-100 border-r border-white/10 last:border-r-0">
                {children}
              </th>
            );
          },
          td({ children }: any) {
            return (
              <td className="px-3.5 py-2.5 border-r border-white/5 last:border-r-0 font-mono text-[12px] sm:text-xs text-slate-200">
                {children}
              </td>
            );
          },
          h1({ children }: any) {
            return (
              <h1 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-white/10 pb-2 mb-3 mt-4">
                {children}
              </h1>
            );
          },
          h2({ children }: any) {
            return (
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2 mb-2.5 mt-4">
                {children}
              </h2>
            );
          },
          h3({ children }: any) {
            return (
              <h3 className="text-xs sm:text-sm font-semibold text-cyan-300 flex items-center gap-1.5 mb-2 mt-3">
                {children}
              </h3>
            );
          },
          p({ children }: any) {
            return <p className="mb-2.5 leading-relaxed text-slate-100 text-xs sm:text-sm">{children}</p>;
          },
          ul({ children }: any) {
            return <ul className="my-2.5 space-y-1.5 list-disc list-inside text-xs sm:text-sm text-slate-200">{children}</ul>;
          },
          ol({ children }: any) {
            return <ol className="my-2.5 space-y-1.5 list-decimal list-inside text-xs sm:text-sm text-slate-200">{children}</ol>;
          },
          li({ children }: any) {
            return <li className="leading-relaxed">{children}</li>;
          },
          strong({ children }: any) {
            return <strong className="font-bold text-white">{children}</strong>;
          },
          blockquote({ children }: any) {
            return (
              <blockquote className="my-3 border-l-2 border-cyan-400 pl-4 py-1.5 text-slate-300 italic bg-cyan-950/20 rounded-r-lg">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
};

/**
 * Helper to construct a standard 44-byte WAV header around raw 16-bit Int16 LE PCM data
 */
function createWavHeader(pcmBytes: Uint8Array, sampleRate: number): ArrayBuffer {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // "RIFF"
  view.setUint32(0, 0x52494646, false);
  // file length
  view.setUint32(4, 36 + pcmBytes.length, true);
  // "WAVE"
  view.setUint32(8, 0x57415645, false);
  // "fmt "
  view.setUint32(12, 0x666d7420, false);
  // length of format data
  view.setUint32(16, 16, true);
  // type of format (1 = PCM)
  view.setUint16(20, 1, true);
  // number of channels (1 = mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate = sampleRate * 1 channel * 2 bytes/sample
  view.setUint32(28, sampleRate * 2, true);
  // block align = 1 channel * 2 bytes/sample
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // "data"
  view.setUint32(36, 0x64617461, false);
  // data length
  view.setUint32(40, pcmBytes.length, true);

  const combined = new Uint8Array(44 + pcmBytes.length);
  combined.set(new Uint8Array(header), 0);
  combined.set(pcmBytes, 44);

  return combined.buffer;
}
