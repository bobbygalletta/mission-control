import { useEffect, useRef, useState, useCallback } from 'react';
import type { Agent } from '../types';
import { sendChatMessage } from '../lib/gateway';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface MessageModalProps {
  agent: Agent | null;
  onClose: () => void;
}

// Dean (agentId "main") gets the full chat interface
const DEAN_ID = 'main';
const DEAN_SESSION_KEY = 'agent:main:telegram:direct:8212808444';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const MessageModal = ({ agent, onClose }: MessageModalProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (agent) {
      textareaRef.current?.focus();
    }
  }, [agent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || !agent) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(
        DEAN_ID,
        input.trim(),
        DEAN_SESSION_KEY
      );

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Failed to get a response. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }, [input, isLoading, agent]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!agent) return null;

  // ── Other agents: "coming soon" state ─────────────────────────────────────
  if (agent.id !== DEAN_ID) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div
          className="
            relative w-full max-w-md
            backdrop-blur-xl bg-white/[0.10] border border-white/[0.14] rounded-2xl
            shadow-[0_25px_50px_rgba(0,0,0,0.5),0_0_80px_rgba(88,28,135,0.15),inset_0_1px_0_rgba(255,255,255,0.08)]
            flex flex-col gap-5 p-7
          "
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{agent.emoji}</span>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">{agent.name}</h2>
                <p className="text-xs text-slate-400">{agent.role}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="h-px bg-white/10" />

          {/* Coming soon */}
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="text-5xl">{agent.emoji}</div>
            <div>
              <p className="text-slate-200 font-medium">Chat coming soon for {agent.name}</p>
              <p className="text-slate-500 text-sm mt-1">
                Direct messaging for {agent.name} is in the works. Hang tight!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="
              w-full py-3 rounded-xl font-semibold text-sm
              bg-white/10 hover:bg-white/15 text-slate-300
              border border-white/10 transition-colors
            "
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  // ── Dean: Full chat interface ──────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Chat container */}
      <div
        className="
          relative w-full max-w-lg h-[640px] max-h-[85vh]
          backdrop-blur-xl bg-white/[0.10] border border-white/[0.14] rounded-2xl
          shadow-[0_25px_50px_rgba(0,0,0,0.5),0_0_80px_rgba(88,28,135,0.15),inset_0_1px_0_rgba(255,255,255,0.08)]
          flex flex-col overflow-hidden
        "
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{agent.emoji}</span>
            <div>
              <h2 className="text-base font-semibold text-slate-100">{agent.name}</h2>
              <p className="text-xs text-slate-400">Direct chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <span className="text-4xl">{agent.emoji}</span>
              <p className="text-slate-400 text-sm">
                Chat with Dean — powered by your AI team
              </p>
            </div>
          )}

          {messages.map((msg) =>
            msg.role === 'user' ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[80%]">
                  <div
                    className="
                      rounded-2xl rounded-tr-sm px-4 py-2.5
                      bg-gradient-to-r from-accent-indigo to-accent-violet
                      text-white text-sm leading-relaxed
                      shadow-[0_4px_16px_rgba(129,140,248,0.35)]
                    "
                  >
                    {msg.content}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1 text-right pr-1">
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[80%]">
                  <div
                    className="
                      rounded-2xl rounded-tl-sm px-4 py-2.5
                      bg-white/[0.09] border border-white/[0.12]
                      text-slate-200 text-sm leading-relaxed
                      backdrop-blur-sm
                    "
                  >
                    <span className="mr-1.5">🤖</span>
                    {msg.content}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 text-left pl-1">
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            )
          )}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%]">
                <div
                  className="
                    rounded-2xl rounded-tl-sm px-4 py-3
                    bg-white/[0.09] border border-white/[0.12]
                    backdrop-blur-sm
                  "
                >
                  <div className="flex items-center gap-1.5">
                    <span className="mr-1.5 text-sm">🤖</span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '160ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '320ms' }} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="shrink-0 px-4 pb-4 pt-2 border-t border-white/10">
          <div
            className="
              flex items-end gap-2
              backdrop-blur-md bg-white/[0.09] border border-white/[0.14]
              rounded-2xl px-3 py-2
            "
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={`Message ${agent.name}...`}
              rows={1}
              className="
                flex-1 bg-transparent text-slate-200 placeholder-slate-500
                text-sm leading-relaxed resize-none outline-none
                py-1 max-h-32 overflow-y-auto
              "
              style={{ minHeight: '24px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="
                shrink-0 w-8 h-8 flex items-center justify-center
                rounded-xl
                bg-gradient-to-r from-accent-indigo to-accent-violet
                text-white text-sm
                disabled:opacity-30 disabled:cursor-not-allowed
                hover:shadow-[0_4px_16px_rgba(129,140,248,0.5)]
                transition-all duration-150
              "
              aria-label="Send"
            >
              ↑
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-1.5 text-center">
            Press{' '}
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-500 font-mono">⌘</kbd>{' '}
            or{' '}
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-500 font-mono">↵</kbd>{' '}
            to send
          </p>
        </div>
      </div>
    </div>
  );
};
