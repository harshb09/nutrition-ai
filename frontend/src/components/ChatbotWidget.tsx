import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  X,
  Send,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  AlertCircle
} from "lucide-react";
import { api } from "../api/client";
import { ChatMessage } from "../api/types";

interface ChatbotWidgetProps {
  initialPrompt?: string;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  initialPrompt,
  isOpenExternal,
  onCloseExternal
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "assistant",
      text: "Hello! I am your Nutrition Atlas assistant. Ask me about any Indian district (NFHS-5), global country profiles, or nutritional indicators in English or Hindi (हिन्दी).",
      citations: ["NFHS-5 (2019–2021) & UN JME (2024)"]
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync external open state if provided
  useEffect(() => {
    if (isOpenExternal !== undefined) {
      setIsOpen(isOpenExternal);
    }
  }, [isOpenExternal]);

  // Handle initial prompt if passed
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setIsOpen(true);
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = { sender: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const resp = await api.sendChatMessage(q);
      const botMsg: ChatMessage = {
        sender: "assistant",
        text: resp.reply,
        citations: resp.citations,
        district_id: resp.district_id,
        state: resp.state,
        district: resp.district
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: "I am having trouble accessing the nutrition database right now. Please check your connection or try again in a few moments."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleReset = () => {
    setMessages([
      {
        sender: "assistant",
        text: "Conversation cleared. How can I assist you with district or country nutrition data?",
        citations: ["NFHS-5 (2019-21)"]
      }
    ]);
  };

  const suggestionChips = [
    "Show Varanasi district profile",
    "What is child stunting?",
    "बच्चे में सूखापन (Wasting) क्या है?",
    "Compare Patna and Gaya"
  ];

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
          }}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 focus:outline-none"
          aria-label="Open Nutrition AI Assistant"
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span className="font-semibold text-xs tracking-wide">Ask Assistant</span>
        </button>
      )}

      {/* Chat Window Modal */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[92vw] sm:w-[420px] h-[550px] max-h-[85vh] bg-brand-surface border border-brand-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-brand-raised/90 border-b border-brand-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-brand-text leading-tight">
                  Nutrition Assistant
                </h3>
                <span className="text-[10px] text-brand-muted flex items-center gap-1">
                  <span>English & हिन्दी</span>
                  <span>•</span>
                  <span>Grounded in NFHS-5</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-1.5 text-brand-muted hover:text-brand-text rounded-md hover:bg-brand-surface transition-colors"
                title="Restart chat"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onCloseExternal) onCloseExternal();
                }}
                className="p-1.5 text-brand-muted hover:text-brand-text rounded-md hover:bg-brand-surface transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-brand-bg/40">
            {messages.map((m, idx) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] p-3 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                      isUser
                        ? "bg-brand-accent text-white rounded-br-none"
                        : "bg-brand-surface border border-brand-border text-brand-text rounded-bl-none shadow-sm"
                    }`}
                  >
                    {m.text}

                    {/* Direct District Profile Link */}
                    {m.state && m.district && (
                      <div className="mt-2.5 pt-2 border-t border-brand-border/60">
                        <Link
                          to={`/district/${encodeURIComponent(m.state)}/${encodeURIComponent(m.district)}`}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-accent hover:underline"
                        >
                          <span>Open {m.district} District Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Message footer & citations */}
                  {!isUser && (
                    <div className="mt-1 flex items-center gap-2 px-1 text-[10px] text-brand-muted">
                      {m.citations && m.citations.length > 0 && (
                        <span className="truncate max-w-[240px]">
                          📚 {m.citations[0]}
                        </span>
                      )}
                      <button
                        onClick={() => handleCopy(m.text, idx)}
                        className="hover:text-brand-text transition-colors flex items-center gap-0.5 ml-auto"
                        title="Copy answer"
                      >
                        {copiedIdx === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-brand-muted text-xs p-2">
                <span className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />
                <span>Consulting NFHS-5 factsheets...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-brand-surface border-t border-brand-border/60 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
              {suggestionChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(chip)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-brand-raised hover:bg-brand-accent/15 hover:text-brand-accent text-brand-muted border border-brand-border transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input & Disclaimer */}
          <div className="p-3 bg-brand-surface border-t border-brand-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                maxLength={500}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a district, indicator, or country..."
                className="flex-1 bg-brand-raised border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text placeholder-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-accent"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl bg-brand-accent text-white disabled:opacity-40 hover:bg-brand-accent/90 transition-colors focus:outline-none"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[10px] text-brand-muted">
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500/80" />
                <span>Not medical advice. NFHS-5 survey statistics.</span>
              </span>
              <span>{input.length}/500</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
