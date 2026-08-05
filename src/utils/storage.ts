import { ChatSession, ChatMessage } from '../types';

export const STORAGE_KEY = 'waso_chats';

export const SYSTEM_PERSONA_INSTRUCTION = 
  "You are WASO (Wasin AI Responsive Virtual Intelligence), created by Wasin. You are a Senior Polyglot Software Architect, Lead Systems Developer, and AI Master. You possess complete expertise across ALL programming languages (C, C++, Rust, Go, Python, Java, JavaScript, TypeScript, C#, Kotlin, Swift, Haskell, PHP, SQL, Shell, Assembly, Assembly, Dart, Ruby, etc.) and software design patterns. Always provide 100% accurate, syntactically perfect, production-ready code with colorful syntax formatting. You maintain absolute memory of all previous messages in the current chat session. When requested, you generate architectural diagrams (using SVG/Mermaid/ASCII structures), detailed PDF document outlines, and PPTX presentation slide decks. You fully support both English and Bengali (বাংলা) with equal perfection. When asked about your creator or identity, state clearly that you are WASO, created by Wasin.";

export const INITIAL_GREETING = 
  "Hey! I am WASO, created by Wasin. As an elite Polyglot Software Architect & AI Master, I am ready to write high-precision code in any programming language, design architecture diagrams, generate PDF/PPTX reports & presentations, and solve complex engineering tasks in English & বাংলা.";

/**
 * Key Collision Fix: Uses timestamp + high-entropy random string
 */
export function generateId(): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${randomStr}`;
}

export function createInitialSession(): ChatSession {
  const now = Date.now();
  const initialMsg: ChatMessage = {
    id: generateId(),
    role: 'assistant',
    content: INITIAL_GREETING,
    timestamp: now,
    modelUsed: 'gemini-3.6-flash'
  };

  return {
    id: generateId(),
    title: 'New Architecture Chat',
    createdAt: now,
    updatedAt: now,
    messages: [initialMsg],
    systemPrompt: SYSTEM_PERSONA_INSTRUCTION
  };
}

/**
 * Corrupted Session Recovery Logic & Sanitization
 */
export function sanitizeSessions(raw: unknown): ChatSession[] {
  if (!Array.isArray(raw)) return [];
  
  const validSessions: ChatSession[] = [];
  const seenIds = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const session = item as Partial<ChatSession>;
    
    if (!session.id || typeof session.id !== 'string') continue;
    let safeId = session.id;
    if (seenIds.has(safeId)) {
      safeId = generateId();
    }
    seenIds.add(safeId);

    const safeMessages: ChatMessage[] = [];
    const msgSeenIds = new Set<string>();

    if (Array.isArray(session.messages)) {
      for (const m of session.messages) {
        if (!m || typeof m !== 'object' || !m.role || !m.content) continue;
        let mId = typeof m.id === 'string' ? m.id : generateId();
        if (msgSeenIds.has(mId)) {
          mId = generateId();
        }
        msgSeenIds.add(mId);

        safeMessages.push({
          id: mId,
          role: m.role === 'user' ? 'user' : 'assistant',
          content: String(m.content),
          timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
          attachments: Array.isArray(m.attachments) ? m.attachments : undefined,
          imageUrl: typeof m.imageUrl === 'string' ? m.imageUrl : undefined,
          isImagePrompt: Boolean(m.isImagePrompt),
          modelUsed: typeof m.modelUsed === 'string' ? m.modelUsed : undefined,
          thinkingTimeMs: typeof m.thinkingTimeMs === 'number' ? m.thinkingTimeMs : undefined,
          isError: Boolean(m.isError)
        });
      }
    }

    // Fallback if session has no valid messages
    if (safeMessages.length === 0) {
      safeMessages.push({
        id: generateId(),
        role: 'assistant',
        content: INITIAL_GREETING,
        timestamp: Date.now()
      });
    }

    validSessions.push({
      id: safeId,
      title: typeof session.title === 'string' && session.title.trim() ? session.title : 'WASO Session',
      createdAt: typeof session.createdAt === 'number' ? session.createdAt : Date.now(),
      updatedAt: typeof session.updatedAt === 'number' ? session.updatedAt : Date.now(),
      messages: safeMessages,
      systemPrompt: SYSTEM_PERSONA_INSTRUCTION
    });
  }

  return validSessions;
}

export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = [createInitialSession()];
      saveSessions(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeSessions(parsed);
    if (sanitized.length === 0) {
      const initial = [createInitialSession()];
      saveSessions(initial);
      return initial;
    }
    return sanitized;
  } catch (err) {
    console.error('Failed to load WASO chats from localStorage, re-initializing:', err);
    const initial = [createInitialSession()];
    saveSessions(initial);
    return initial;
  }
}

export function saveSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Failed to save WASO chats to localStorage:', err);
  }
}

/**
 * Safely parses response JSON, detecting the Content-Type first to handle
 * raw text/error messages gracefully without failing JSON parsing.
 */
export async function parseResponseJson(res: Response, defaultErrorMsg: string): Promise<any> {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || defaultErrorMsg);
      }
      return data;
    } catch (e: any) {
      if (!res.ok) {
        throw new Error(e.message || defaultErrorMsg);
      }
      const text = await res.text();
      throw new Error(`Malformed JSON response: ${text.slice(0, 100)}`);
    }
  } else {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || defaultErrorMsg);
    }
    throw new Error(`Expected JSON but received: ${text.slice(0, 100)}`);
  }
}
