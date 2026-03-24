import type { Agent } from '../types';
import { useEffect, useRef, useState } from 'react';

interface MessageModalProps {
  agent: Agent | null;
  onClose: () => void;
  onSend: (message: string) => Promise<void>;
}

export const MessageModal = ({ agent, onClose, onSend }: MessageModalProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await onSend(message.trim());
      setMessage('');
      onClose();
    } catch {
      setSending(false);
    }
  };

  useEffect(() => {
    if (agent && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [agent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [message, sending, onClose]);

  if (!agent) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="
          relative w-full max-w-md
          backdrop-blur-xl bg-white/[0.06] border border-white/15 rounded-2xl
          shadow-[0_25px_50px_rgba(0,0,0,0.6),0_0_80px_rgba(129,140,248,0.1)]
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

        {/* Divider */}
        <div className="h-px bg-white/10" />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={`Message ${agent.name} via Telegram...`}
          rows={4}
          className="
            w-full bg-white/5 border border-white/10 rounded-xl p-4
            text-slate-200 placeholder-slate-500 text-sm leading-relaxed
            resize-none outline-none
            focus:border-accent-indigo/50 focus:bg-white/[0.07]
            transition-colors
          "
        />

        {/* Hint */}
        <p className="text-xs text-slate-500 -mt-2">
          Press{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-400 font-mono text-[10px]">⌘</kbd>{' '}
          +{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-400 font-mono text-[10px]">Enter</kbd>{' '}
          to send
        </p>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="
            w-full py-3.5 rounded-xl font-semibold text-sm
            bg-gradient-to-r from-accent-indigo to-accent-violet
            text-white shadow-[0_4px_20px_rgba(129,140,248,0.4)]
            hover:shadow-[0_4px_30px_rgba(129,140,248,0.6)]
            disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
            transition-all duration-200
          "
        >
          {sending ? 'Sending...' : 'Send via Telegram'}
        </button>
      </div>
    </div>
  );
};
