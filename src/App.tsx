import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { InputArea } from './components/InputArea';
import { LiveArea } from './components/LiveArea';
import { SettingsModal } from './components/SettingsModal';
import {
  ChatSession,
  ChatMessage,
  ActiveTab,
  InputMode,
  LanguageMode,
  FileAttachment
} from './types';
import {
  loadSessions,
  saveSessions,
  createInitialSession,
  generateId,
  parseResponseJson
} from './utils/storage';
import { exportToPDF, exportToPPTX } from './utils/documentExporter';

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [languageMode, setLanguageMode] = useState<LanguageMode>('auto');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  // Load sessions from localStorage on mount and listen to PWA prompt
  useEffect(() => {
    const loaded = loadSessions();
    setSessions(loaded);
    if (loaded.length > 0) {
      setActiveSessionId(loaded[0].id);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent automatic prompt to handle professionally via custom button
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If app is launched inside PWA standalone, don't show custom install buttons
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation outcome: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };


  // Save sessions to localStorage whenever sessions state updates
  useEffect(() => {
    if (sessions.length > 0) {
      saveSessions(sessions);
    }
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const handleNewChat = () => {
    const newSession = createInitialSession();
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const fresh = createInitialSession();
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleClearAllSessions = () => {
    const fresh = createInitialSession();
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
  };

  // Send user message and trigger AI response (Text or Image Synthesis with Model Fallback)
  const handleSendMessage = async (
    text: string,
    mode: InputMode,
    attachments: FileAttachment[],
    selectedModel: string = 'gemini-3.6-flash',
    aspectRatio: string = '1:1',
    stylePreset: string = 'Cinematic 8K'
  ) => {
    if (!activeSession) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
      isImagePrompt: mode === 'image',
    };

    const updatedMessages = [...activeSession.messages, userMsg];
    let updatedTitle = activeSession.title;

    // Auto update title if default title
    if (activeSession.title === 'New Architecture Chat' && text.trim()) {
      updatedTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
    }

    const updatedSession: ChatSession = {
      ...activeSession,
      title: updatedTitle,
      updatedAt: Date.now(),
      messages: updatedMessages,
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? updatedSession : s))
    );

    setIsGenerating(true);

    try {
      if (mode === 'image') {
        // Image Synthesis Mode
        const res = await fetch('/api/gemini/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            aspectRatio,
            stylePreset,
            imageSize: '1K',
          }),
        });

        const data = await parseResponseJson(res, 'Failed to synthesize 8K visual image');

        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `Synthesized 8K Visual Image for prompt: "${text}"`,
          timestamp: Date.now(),
          imageUrl: data.imageUrl,
          modelUsed: 'gemini-3.1-flash-image',
        };

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === activeSession.id) {
              return {
                ...s,
                updatedAt: Date.now(),
                messages: [...s.messages, assistantMsg],
              };
            }
            return s;
          })
        );
      } else {
        // Text / Code / Multimodal Synthesis Mode with Selected Model & Streaming
        const res = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages,
            attachments,
            model: selectedModel,
            stream: true,
          }),
        });

        if (!res.ok) {
          await parseResponseJson(res, 'AI Synthesis endpoint error');
        }

        const assistantMsgId = generateId();
        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          modelUsed: selectedModel,
        };

        
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === activeSession.id) {
              return {
                ...s,
                updatedAt: Date.now(),
                messages: [...s.messages, assistantMsg],
              };
            }
            return s;
          })
        );

        const reader = res.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedText = '';
        let usedModel = selectedModel;

        if (reader) {
          let buffer = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Hold partial line in buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.slice(6);
                if (dataStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.error) {
                    throw new Error(parsed.error);
                  }
                  if (parsed.text) {
                    accumulatedText += parsed.text;
                    if (parsed.modelUsed) {
                      usedModel = parsed.modelUsed;
                    }

                    // Update the message in-place
                    setSessions((prev) =>
                      prev.map((s) => {
                        if (s.id === activeSession.id) {
                          return {
                            ...s,
                            messages: s.messages.map((m) =>
                              m.id === assistantMsgId
                                ? { ...m, content: accumulatedText, modelUsed: usedModel }
                                : m
                            ),
                          };
                        }
                        return s;
                      })
                    );
                  }
                } catch (e: any) {
                  if (e.message && e.message.includes('Error')) {
                    throw e;
                  }
                }
              }
            }
          }
        } else {
          throw new Error('ReadableStream not supported in this environment.');
        }

        
        const lowerText = text.toLowerCase();
        if (lowerText.includes('pdf') || lowerText.includes('report document') || lowerText.includes('pdf report')) {
          setTimeout(() => {
            exportToPDF(text.slice(0, 35) || 'WASO PDF Report', accumulatedText);
          }, 800);
        } else if (lowerText.includes('pptx') || lowerText.includes('presentation deck') || lowerText.includes('slides')) {
          setTimeout(() => {
            exportToPPTX(text.slice(0, 35) || 'WASO Presentation', accumulatedText);
          }, 800);
        }
      }
    } catch (err: any) {
      console.error('Error during message generation:', err);
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `Error: ${err.message || 'AI Synthesis Failed. Please check Gemini API connection.'}`,
        timestamp: Date.now(),
        isError: true,
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              updatedAt: Date.now(),
              messages: [...s.messages, errorMsg],
            };
          }
          return s;
        })
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Message Editing & Conversation Re-Synthesis
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeSession) return;

    const msgIndex = activeSession.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const targetMsg = activeSession.messages[msgIndex];
    let truncatedMessages: ChatMessage[] = [];

    if (targetMsg.role === 'assistant') {
      // Regenerate response: keep messages up to the preceding user message
      truncatedMessages = activeSession.messages.slice(0, msgIndex);
    } else {
      // Edit user message: truncate up to this user message and update content
      truncatedMessages = activeSession.messages.slice(0, msgIndex + 1);
      truncatedMessages[msgIndex] = {
        ...truncatedMessages[msgIndex],
        content: newContent,
        timestamp: Date.now(),
      };
    }

    if (truncatedMessages.length === 0) return;

    const updatedSession: ChatSession = {
      ...activeSession,
      updatedAt: Date.now(),
      messages: truncatedMessages,
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? updatedSession : s))
    );

    setIsGenerating(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: truncatedMessages,
          model: 'gemini-3.6-flash',
          stream: true,
        }),
      });

      if (!res.ok) {
        await parseResponseJson(res, 'Failed to resynthesize message');
      }

      const newAssistantMsgId = generateId();
      const newAssistantMsg: ChatMessage = {
        id: newAssistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        modelUsed: 'gemini-3.6-flash',
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              updatedAt: Date.now(),
              messages: [...s.messages, newAssistantMsg],
            };
          }
          return s;
        })
      );

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let usedModel = 'gemini-3.6-flash';

      if (reader) {
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  if (parsed.modelUsed) {
                    usedModel = parsed.modelUsed;
                  }

                  setSessions((prev) =>
                    prev.map((s) => {
                      if (s.id === activeSession.id) {
                        return {
                          ...s,
                          messages: s.messages.map((m) =>
                            m.id === newAssistantMsgId
                              ? { ...m, content: accumulatedText, modelUsed: usedModel }
                              : m
                          ),
                        };
                      }
                      return s;
                    })
                  );
                }
              } catch (e) {}
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error during resynthesis:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-full bg-gradient-to-b from-[#0a192f] via-[#030c1b] to-[#000000] text-slate-100 selection:bg-cyan-500/30 font-sans overflow-hidden">
      {/* Top Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewChat={handleNewChat}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        languageMode={languageMode}
        setLanguageMode={setLanguageMode}
        isInstallable={isInstallable}
        onInstallApp={handleInstallApp}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-hidden relative pt-[58px] sm:pt-[68px]">
        {activeTab === 'chat' ? (
          <>
            {/* Chat Messages Feed */}
            <ChatArea
              messages={activeSession ? activeSession.messages : []}
              onEditMessage={handleEditMessage}
              isGenerating={isGenerating}
            />

            {/* Input Box */}
            <InputArea
              onSendMessage={handleSendMessage}
              isGenerating={isGenerating}
            />
          </>
        ) : (
          /* WASO Live Duplex Real-Time Voice Screen */
          <LiveArea />
        )}
      </main>

      {/* Sessions Sidebar Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => setActiveSessionId(id)}
        onNewSession={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onClearAllSessions={handleClearAllSessions}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isInstallable={isInstallable}
        onInstallApp={handleInstallApp}
      />

      {/* System Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        languageMode={languageMode}
        setLanguageMode={setLanguageMode}
        onClearStorage={handleClearAllSessions}
      />
    </div>
  );
}
