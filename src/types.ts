export type MessageRole = 'user' | 'assistant' | 'system';

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string; // Base64 data URL
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  attachments?: FileAttachment[];
  imageUrl?: string; // For generated images
  isImagePrompt?: boolean;
  modelUsed?: string;
  thinkingTimeMs?: number;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  systemPrompt?: string;
}

export type InputMode = 'text' | 'image';

export type ActiveTab = 'chat' | 'live';

export type LanguageMode = 'auto' | 'en' | 'bn';

export interface LiveTranscriptItem {
  id: string;
  speaker: 'user' | 'waso';
  text: string;
  timestamp: number;
}
