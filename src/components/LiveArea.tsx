import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Sparkles,
  Bot,
  Activity,
  Radio,
  Clock,
  MessageSquare
} from 'lucide-react';
import { floatTo16BitPCMBase64, pcmBase64ToAudioBuffer, calculateVolume } from '../utils/audio';
import { LiveTranscriptItem } from '../types';
import { WasoRobotLogo } from './WasoRobotLogo';

export const LiveArea: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [statusMessage, setStatusMessage] = useState('WASO Live Standby');
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcripts, setTranscripts] = useState<LiveTranscriptItem[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  const startLiveSession = async () => {
    try {
      setIsConnecting(true);
      setStatusMessage('Initializing 16kHz Audio Stream...');

      // 1. Microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 2. Setup Input AudioContext (16kHz PCM stream)
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;

      // 3. Setup Output AudioContext (24kHz Gemini Live playback)
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;

      // 4. WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setStatusMessage('WASO Live Duplex Audio Connected');

        // Start duration timer
        timerRef.current = setInterval(() => {
          setSessionDuration((prev) => prev + 1);
        }, 1000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'ready') {
            setStatusMessage('WASO Live Active • Listening...');
          } else if (data.audio) {
            setStatusMessage('WASO Speaking...');
            playAudioChunk(data.audio);
          } else if (data.interrupted) {
            setStatusMessage('Interrupted • Listening...');
          } else if (data.error) {
            setStatusMessage(`Error: ${data.error}`);
          }
        } catch (e) {
          console.error('Failed to parse WS live message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WASO Live WS Error:', err);
        setStatusMessage('Connection Error');
        setIsConnecting(false);
      };

      ws.onclose = () => {
        stopLiveSession();
      };

      // 5. Connect Microphone Audio Processor
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (isMuted || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const volume = calculateVolume(inputData);
        setAudioLevel(volume);

        const base64PCM = floatTo16BitPCMBase64(inputData);
        wsRef.current.send(JSON.stringify({ audio: base64PCM }));
      };
    } catch (err: any) {
      console.error('Failed to start WASO Live Session:', err);
      setStatusMessage(`Mic Permission Denied or Connection Failed: ${err.message}`);
      setIsConnecting(false);
      stopLiveSession();
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    if (!outputAudioCtxRef.current) return;
    const ctx = outputAudioCtxRef.current;

    try {
      const buffer = pcmBase64ToAudioBuffer(base64Audio, ctx, 24000);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      if (nextPlayTimeRef.current < currentTime) {
        nextPlayTimeRef.current = currentTime;
      }

      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += buffer.duration;
    } catch (err) {
      console.error('Failed to play PCM audio chunk:', err);
    }
  };

  const stopLiveSession = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      const ws = wsRef.current;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      } catch (err) {
        console.warn('Silent error during WS close:', err);
      }
      wsRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setAudioLevel(0);
    setStatusMessage('WASO Live Disconnected');
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between gap-1 p-2 sm:p-5 md:p-6 max-w-4xl mx-auto w-full h-full overflow-hidden">
      {/* Custom Styles for Continuous Sound Ripples */}
      <style>
        {`
          @keyframes wasoVoiceRipple {
            0% {
              transform: scale(0.9);
              opacity: 0.95;
            }
            100% {
              transform: scale(1.55);
              opacity: 0;
            }
          }
          .waso-ripple-1 {
            animation: wasoVoiceRipple 2.2s infinite cubic-bezier(0.25, 0.8, 0.25, 1);
          }
          .waso-ripple-2 {
            animation: wasoVoiceRipple 2.2s infinite cubic-bezier(0.25, 0.8, 0.25, 1);
            animation-delay: 0.7s;
          }
          .waso-ripple-3 {
            animation: wasoVoiceRipple 2.2s infinite cubic-bezier(0.25, 0.8, 0.25, 1);
            animation-delay: 1.4s;
          }
        `}
      </style>

      {/* Top Session Bar */}
      <div className="w-full flex items-center justify-between p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <Radio className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${isConnected ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} />
            {isConnected && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 bg-rose-500 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <h3 className="text-[11px] sm:text-sm font-bold text-white flex items-center gap-1 sm:gap-2">
              WASO Live <span className="text-[9px] sm:text-xs text-cyan-400 font-mono font-normal">Voice Mode</span>
            </h3>
            <p className="text-[9px] sm:text-xs text-slate-400 font-mono leading-none sm:leading-normal">{statusMessage}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {isConnected && (
            <div className="flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-slate-900 border border-white/10 text-[9px] sm:text-xs font-mono text-cyan-300">
              <Clock className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
              <span>{formatDuration(sessionDuration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Central Interactive Voice Hub (Avatar & Controls grouped together with perfect tight spacing) */}
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-3 sm:gap-6 md:gap-8 min-h-0">
        
        {/* Holographic Interactive Core Avatar with Animated Circle Waves & Pulsing Eyes */}
        <div className="relative flex flex-col items-center justify-center p-3 sm:p-6 overflow-visible max-w-full shrink-0">
          {/* Animated Expanding Circle Wave Rings during Conversation */}
          {isConnected && (
            <>
              {/* Wave Ripple 1 */}
              <div
                className="absolute rounded-full border-2 border-cyan-400/40 waso-ripple-1 pointer-events-none"
                style={{
                  width: `min(75vw, ${180 + audioLevel * 110}px)`,
                  height: `min(75vw, ${180 + audioLevel * 110}px)`,
                }}
              />
              {/* Wave Ripple 2 */}
              <div
                className="absolute rounded-full border border-sky-400/30 waso-ripple-2 pointer-events-none"
                style={{
                  width: `min(85vw, ${230 + audioLevel * 150}px)`,
                  height: `min(85vw, ${230 + audioLevel * 150}px)`,
                  boxShadow: `0 0 ${20 + audioLevel * 50}px rgba(6,182,212,${0.3 + audioLevel * 0.4})`,
                }}
              />
              {/* Wave Ripple 3 */}
              <div
                className="absolute rounded-full border border-blue-500/20 waso-ripple-3 pointer-events-none"
                style={{
                  width: `min(95vw, ${280 + audioLevel * 190}px)`,
                  height: `min(95vw, ${280 + audioLevel * 190}px)`,
                  boxShadow: `0 0 ${30 + audioLevel * 70}px rgba(59,130,246,${0.2 + audioLevel * 0.3})`,
                }}
              />
            </>
          )}

          {/* Central Core WASO Robot Avatar */}
          <div
            className={`relative z-10 w-28 h-28 xs:w-32 xs:h-32 sm:w-44 sm:h-44 md:w-48 md:h-48 flex flex-col items-center justify-center transition-transform duration-100 ${
              isConnected ? 'scale-105' : 'grayscale-[20%] opacity-90'
            }`}
            style={{
              transform: `scale(${1 + audioLevel * 0.12})`,
            }}
          >
            <WasoRobotLogo
              className="w-full h-full drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]"
              isSpeaking={isConnected && audioLevel > 0.05}
              isPulse={isConnected}
              showCircleBg={true}
            />
          </div>

          {/* Real-time Frequency Pulse Indicator */}
          {isConnected && (
            <div className="mt-2 flex items-center gap-1 sm:gap-1.5">
              {[...Array(14)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-gradient-to-t from-cyan-500 to-sky-300 transition-all duration-75 shadow-[0_0_6px_rgba(6,182,212,0.7)]"
                  style={{
                    height: `${Math.max(4, Math.sin(i * 0.7) * (audioLevel + 0.12) * 36)}px`,
                    opacity: 0.6 + audioLevel * 0.4,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom Controls with Compact Mobile Gap */}
        <div className="w-full flex items-center justify-center gap-3 p-1 shrink-0">
          {!isConnected ? (
            <button
              onClick={startLiveSession}
              disabled={isConnecting}
              className="flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3.5 md:py-4 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm md:text-base shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer border border-cyan-300/30"
            >
              <Mic className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              <span>{isConnecting ? 'Connecting...' : 'Start Voice'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 sm:gap-4">
              {/* Mute Toggle */}
              <button
                onClick={toggleMute}
                className={`p-2.5 sm:p-4 rounded-full border transition cursor-pointer ${
                  isMuted
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                    : 'bg-white/10 border-white/20 text-slate-200 hover:bg-white/20'
                }`}
                title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMuted ? <MicOff className="w-4 h-4 sm:w-6 sm:h-6" /> : <Mic className="w-4 h-4 sm:w-6 sm:h-6" />}
              </button>

              {/* End Session Button */}
              <button
                onClick={stopLiveSession}
                className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] sm:text-xs md:text-sm shadow-[0_0_15px_rgba(239,68,68,0.4)] transition cursor-pointer"
              >
                <PhoneOff className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                <span>End Voice</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
