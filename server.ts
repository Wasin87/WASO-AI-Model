import dotenv from "dotenv";
dotenv.config();
console.log("GEMINI_API_KEY =", process.env.GEMINI_API_KEY);
import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, LiveServerMessage, ThinkingLevel } from "@google/genai";
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

 
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is missing. API calls may fail until set.');
  }
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const SYSTEM_PERSONA_INSTRUCTION = 
  `You are WASO (Wasin AI Responsive Virtual Intelligence), created by Wasin. You are a Senior Polyglot Software Architect, Lead Systems Developer, Bug Hunting & Problem Analytics Expert. You possess complete expertise across ALL programming languages (C, C++, Rust, Go, Python, Java, JavaScript, TypeScript, C#, Kotlin, Swift, Haskell, PHP, SQL, Shell, Assembly, Dart, Ruby, etc.).

Structure your responses cleanly, systematically, and professionally using Markdown based on these layout rules:
1. Section Headers: Use emoji icon titles (e.g., "🔑 Core Definition", "✅ Question 1 — Statement Coverage", "🎯 Final Summary", "✅ Takeaway", "⚙️ Code Architecture").
2. Tables: For metrics, test cases, coverage results, or structured data, ALWAYS format as a Markdown Table (| Header | Header | ... |).
3. Inline Code: Enclose parameters, conditions, and code syntax in inline backticks (\`marks >= 50\`).
4. Mathematical Formulas & Fractions: For ALL math equations, calculations, percentages, laws, and fractions (e.g. 6/8 * 100 = 75%), ALWAYS format them using KaTeX LaTeX math enclosed in double dollar signs $$ ... $$ for block math or single dollar sign $ ... $ for inline math.
   - Example block fraction formula: $$\\frac{6}{8} \\times 100 = 75\\%$$
   - Example inline fraction: $\\frac{a}{b} \\times 100$
   - ALWAYS format fractions using \\frac{numerator}{denominator} so they render as clean vertical fractions.
5. Lists: Use bullet points and numbered lists with **bold lead terms** (e.g., "1. **marks=60, attendance=80** → Pass (true && true).").
6. Code Blocks: Format code in tagged markdown blocks (\`\`\`c, \`\`\`cpp, \`\`\`py, \`\`\`ts) with syntax clean code.
7. Support both English and Bengali (বাংলা) fluently as requested.`;

 
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', persona: 'WASO by Wasin' });
});

 
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, attachments, model } = req.body;
    const ai = getGenAI();

    // Format contents
    const contents: Array<{ role: string; parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> }> = [];

    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (!m.content && (!m.attachments || m.attachments.length === 0)) continue;
        const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

        // Attachments
        if (Array.isArray(m.attachments)) {
          for (const att of m.attachments) {
            if (att.dataUrl) {
              const base64Data = att.dataUrl.split(',')[1] || att.dataUrl;
              parts.push({
                inlineData: {
                  mimeType: att.mimeType || 'image/png',
                  data: base64Data,
                },
              });
            }
          }
        }

        if (m.content) {
          parts.push({ text: m.content });
        }

        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts,
        });
      }
    }

    // Attach latest uploaded files if sent separately
    if (Array.isArray(attachments) && attachments.length > 0 && contents.length > 0) {
      const lastUserContent = contents[contents.length - 1];
      if (lastUserContent && lastUserContent.role === 'user') {
        for (const att of attachments) {
          if (att.dataUrl) {
            const base64Data = att.dataUrl.split(',')[1] || att.dataUrl;
            lastUserContent.parts.unshift({
              inlineData: {
                mimeType: att.mimeType || 'application/octet-stream',
                data: base64Data,
              },
            });
          }
        }
      }
    }

    // System prompt & instruction
    const systemInstruction = `You are WASO AI, an elite Problem Analytics, Bug Hunting, Problem Fixer, and AI System Architecture Expert created by Wasin.
Always structure your answers cleanly, systematically, and professionally using clear Markdown matching the following guidelines:
1. Use emoji section headers for key parts (e.g. "🔑 Core Definition", "✅ Question 1 — Statement Coverage", "🎯 Final Summary", "✅ Takeaway", "⚙️ Code Architecture").
2. When presenting test cases, condition coverage, metrics, or comparisons, ALWAYS format them inside a clean Markdown Table (| Header 1 | Header 2 | ... |).
3. Use inline code backticks (\`marks >= 50\`) for variable conditions and syntax.
4. Mathematical Formulas & Fractions: For ALL math equations, calculations, percentages, laws, and fractions (e.g. 6/8 * 100 = 75%), ALWAYS format them using KaTeX LaTeX math enclosed in double dollar signs $$ ... $$ for block math or single dollar sign $ ... $ for inline math (e.g., $$\\frac{6}{8} \\times 100 = 75\\%$$).
5. Format bullet points and numbered lists with **bold lead terms** (e.g., "1. **marks=60, attendance=80** → Pass (true && true).").
6. Provide code blocks with explicit language tags (\`\`\`c, \`\`\`cpp, \`\`\`python, \`\`\`ts) with clean, error-free implementation.
7. Support both English and Bengali (বাংলা) fluently as requested.`;

    // Sanitize contents for Gemini API:
    // 1. Merge consecutive turns of the same role
    // 2. Trim trailing 'model' turns so contents ends with a 'user' turn
    let cleanedContents: Array<{ role: string; parts: Array<any> }> = [];
    for (const turn of contents) {
      if (turn.parts.length === 0) continue;
      if (cleanedContents.length > 0 && cleanedContents[cleanedContents.length - 1].role === turn.role) {
        cleanedContents[cleanedContents.length - 1].parts.push(...turn.parts);
      } else {
        cleanedContents.push({ role: turn.role, parts: [...turn.parts] });
      }
    }

    while (cleanedContents.length > 0 && cleanedContents[cleanedContents.length - 1].role !== 'user') {
      cleanedContents.pop();
    }

    if (cleanedContents.length === 0) {
      cleanedContents = [{ role: 'user', parts: [{ text: 'Hello WASO' }] }];
    }

    const candidateModels = Array.from(new Set([
      model,
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
    ].filter(Boolean)));

    const streamRequested = req.body.stream === true;

    if (streamRequested) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Prevent proxy buffering for immediate stream delivery

      let stream: any = null;
      let usedModel = 'gemini-3.6-flash';
      let lastErr: any = null;

      for (const mName of candidateModels) {
        try {
          stream = await ai.models.generateContentStream({
            model: mName,
            contents: cleanedContents,
            config: {
              systemInstruction: SYSTEM_PERSONA_INSTRUCTION,
              thinkingConfig: mName.startsWith('gemini-3') ? { thinkingLevel: ThinkingLevel.LOW } : undefined
            },
          });
          usedModel = mName;
          break;
        } catch (e: any) {
          lastErr = e;
          console.warn(`Streaming attempt for model ${mName} failed:`, e?.message || e);
        }
      }

      if (!stream) {
        res.write(`data: ${JSON.stringify({ error: lastErr?.message || 'Failed to initialize AI stream' })}\n\n`);
        res.end();
        return;
      }

      try {
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text, modelUsed: usedModel })}\n\n`);
          }
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (streamErr: any) {
        console.error('Error during streaming chunks:', streamErr);
        res.write(`data: ${JSON.stringify({ error: streamErr?.message || 'Stream interrupted' })}\n\n`);
        res.end();
      }
      return;
    }

    let response: any = null;
    let usedModel = 'gemini-3.6-flash';
    let lastErr: any = null;
    const startTime = Date.now();

    for (const mName of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: mName,
            contents: cleanedContents,
            config: {
              systemInstruction: SYSTEM_PERSONA_INSTRUCTION,
              thinkingConfig: mName.startsWith('gemini-3') ? { thinkingLevel: ThinkingLevel.LOW } : undefined
            },
          });
          usedModel = mName;
          break;
        } catch (e: any) {
          lastErr = e;
          console.warn(`Model ${mName} attempt ${attempt + 1} failed:`, e?.message || e);
          const msg = String(e?.message || '');
          const status = e?.status || e?.code;
          if ((status === 503 || status === 429 || msg.includes('503') || msg.includes('RESOURCE_EXHAUSTED')) && attempt === 0) {
            await new Promise((res) => setTimeout(res, 1000));
            continue;
          }
          break;
        }
      }
      if (response) break;
    }

    if (!response && lastErr) {
      throw lastErr;
    }

    const duration = Date.now() - startTime;
    res.json({
      text: response?.text || 'No response generated.',
      modelUsed: usedModel,
      thinkingTimeMs: duration,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    res.status(500).json({ error: error.message || 'Internal AI Synthesis Error' });
  }
});

// Helper SVG Fallback Visual Synthesis when Image Quota / API fails
function createFallbackImageSvg(prompt: string): string {
  const safePrompt = String(prompt || 'WASO 8K Visual').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a192f"/>
        <stop offset="50%" stop-color="#030c1b"/>
        <stop offset="100%" stop-color="#000000"/>
      </linearGradient>
      <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#00b4d8"/>
        <stop offset="100%" stop-color="#7b2cbf"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="15" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect width="1024" height="1024" fill="url(#bg)"/>
    <circle cx="512" cy="400" r="260" fill="none" stroke="#00b4d8" stroke-width="2" opacity="0.3" filter="url(#glow)" />
    <circle cx="512" cy="400" r="190" fill="none" stroke="#7b2cbf" stroke-width="3" opacity="0.5" filter="url(#glow)" />
    <circle cx="512" cy="400" r="130" fill="none" stroke="#00b4d8" stroke-width="4" filter="url(#glow)" />
    <polygon points="512,320 580,360 580,440 512,480 444,440 444,360" fill="#0a192f" stroke="#00b4d8" stroke-width="3" filter="url(#glow)"/>
    <text x="512" y="408" font-family="system-ui, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="4">WASO 8K</text>
    <rect x="64" y="720" width="896" height="220" rx="20" fill="rgba(10, 25, 47, 0.85)" stroke="rgba(0,180,216,0.3)" stroke-width="1.5" />
    <text x="96" y="770" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" fill="#00b4d8" letter-spacing="2">WASO VISUAL SYNTHESIS ARCHITECTURE</text>
    <text x="96" y="815" font-family="system-ui, sans-serif" font-size="22" font-weight="600" fill="#ffffff">${safePrompt.slice(0, 70)}${safePrompt.length > 70 ? '...' : ''}</text>
    <text x="96" y="870" font-family="monospace" font-size="14" fill="#94a3b8">RENDER: 8K MASTERPIECE • CREATED BY WASIN (WASO)</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// 2. 8K Visual Image Synthesis Endpoint
app.post('/api/gemini/image', async (req, res) => {
  const { prompt, aspectRatio = '1:1', stylePreset = 'Cinematic 8K', imageSize = '1K' } = req.body;
  const enhancedPrompt = `${stylePreset} style, Masterpiece, 8K resolution, ultra-detailed, highly crisp, ray-traced lighting, professional visual design: ${prompt}`;

  try {
    const ai = getGenAI();
    let imageUrl = '';

    const imageModels = ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image'];

    for (const mName of imageModels) {
      try {
        const response = await ai.models.generateContent({
          model: mName,
          contents: {
            parts: [{ text: enhancedPrompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
              imageSize: imageSize as any,
            },
          },
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              break;
            }
          }
        }
        if (imageUrl) break;
      } catch (e: any) {
        // Quietly failover to fallback models if quota limit (429) or unsupported model occurs
      }
    }

    if (!imageUrl) {
      try {
        const encodedPrompt = encodeURIComponent(`${stylePreset}, ${prompt}`);
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${Math.floor(Math.random() * 100000)}&nologo=true`;
        
        // Fetch image bytes to convert to data URL for client
        const pRes = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(8000) });
        if (pRes.ok) {
          const buffer = await pRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const mimeType = pRes.headers.get('content-type') || 'image/jpeg';
          imageUrl = `data:${mimeType};base64,${base64}`;
        }
      } catch (e: any) {
        console.warn('Pollinations AI image fallback failed or timed out:', e.message || e);
      }
    }

    if (!imageUrl) {
      // Return high-res WASO SVG card as final fallback visual
      imageUrl = createFallbackImageSvg(prompt);
    }

    res.json({ imageUrl, prompt: enhancedPrompt });
  } catch (error: any) {
    console.error('Error in /api/gemini/image, sending fallback SVG visual:', error);
    res.json({ imageUrl: createFallbackImageSvg(prompt), prompt: enhancedPrompt });
  }
});

// 3. Text-to-Speech (TTS) Voice Playback Endpoint ('Charon' voice)
app.post('/api/gemini/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Charon' } = req.body;
    const ai = getGenAI();

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('TTS audio data was not returned from model.');
    }

    res.json({ audio: base64Audio, sampleRate: 24000 });
  } catch (error: any) {
    console.error('Error in /api/gemini/tts:', error);
    res.status(500).json({ error: error.message || 'TTS generation failed' });
  }
});

// Create HTTP Server & WebSocket Server for WASO Live
const server = http.createServer(app);

if (!process.env.VERCEL) {
  const wss = new WebSocketServer({ server, path: '/api/live' });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('WASO Live WebSocket client connected');
    let liveSession: any = null;

    try {
      const ai = getGenAI();
      liveSession = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
          },
          systemInstruction: SYSTEM_PERSONA_INSTRUCTION,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onclose: () => {
            console.log('Gemini Live session closed');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ status: 'closed' }));
            }
          },
          onerror: (err) => {
            console.error('Gemini Live session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ error: err.message }));
            }
          },
        },
      });

      clientWs.send(JSON.stringify({ status: 'ready', message: 'WASO Live Audio Stream Connected' }));

      clientWs.on('message', (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio && liveSession) {
            liveSession.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (parsed.text && liveSession) {
            liveSession.sendRealtimeInput({
              text: parsed.text,
            });
          }
        } catch (e) {
          console.error('Failed to process client audio frame:', e);
        }
      });

      clientWs.on('close', () => {
        console.log('WASO Live client disconnected');
        if (liveSession) {
          try {
            liveSession.close();
          } catch (e) {
            // ignore
          }
        }
      });
    } catch (err: any) {
      console.error('WASO Live Session Setup Error:', err);
      clientWs.send(JSON.stringify({ error: err.message || 'Failed to establish Live Duplex Session' }));
    }
  });
}

// Setup Vite Development Middleware or Production Static Serve
async function start() {
  if (process.env.VERCEL) {
    console.log('Running inside Vercel serverless environment. Skipping port listener.');
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`WASO Server running on http://0.0.0.0:${PORT}`);
  });
}

start();

export default app;
