"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  chatModes,
  DEFAULT_CHAT_MODE,
  getChatMode,
  type ChatMode,
} from "@/lib/chat-modes";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

type Conversations = Record<ChatMode, ChatMessage[]>;

function createInitialConversations(): Conversations {
  return chatModes.reduce((current, mode) => {
    current[mode.id] = [
      {
        id: `welcome-${mode.id}`,
        role: "assistant",
        content: mode.greeting,
      },
    ];
    return current;
  }, {} as Conversations);
}

function formatAssistantText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?;:]|$)/g, "$1$2")
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?;:]|$)/g, "$1$2")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<ChatMode>(DEFAULT_CHAT_MODE);
  const [conversations, setConversations] = useState<Conversations>(
    createInitialConversations,
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const modeConfig = getChatMode(activeMode);
  const ModeIcon = modeConfig.icon;
  const messages = conversations[activeMode];

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const node = scrollRef.current;
    if (!node) return;

    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [open, activeMode, conversations, isLoading]);

  const switchMode = (mode: ChatMode) => {
    if (isLoading || mode === activeMode) return;
    setActiveMode(mode);
    setInput("");
  };

  const resetConversation = () => {
    if (isLoading) return;
    setConversations((current) => ({
      ...current,
      [activeMode]: [
        {
          id: `welcome-${activeMode}-${Date.now()}`,
          role: "assistant",
          content: modeConfig.greeting,
        },
      ],
    }));
    setInput("");
    inputRef.current?.focus();
  };

  const sendMessage = async (override?: string) => {
    const content = (override ?? input).trim();
    if (!content || isLoading) return;

    const modeAtSend = activeMode;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    const history = [...conversations[modeAtSend], userMessage];

    setConversations((current) => ({
      ...current,
      [modeAtSend]: [...current[modeAtSend], userMessage],
    }));
    setInput("");
    setIsLoading(true);

    let failure =
      "I couldn't complete that response. Please try again in a moment.";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: modeAtSend,
          messages: history
            .filter((message) => !message.error)
            .slice(-16)
            .map((message) => ({
              role: message.role,
              content: message.content,
            })),
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        reply?: string;
        error?: string;
      } | null;

      const reply = data?.reply;
      if (!response.ok || !reply) {
        failure = data?.error || failure;
        throw new Error("chat_request_failed");
      }

      setConversations((current) => ({
        ...current,
        [modeAtSend]: [
          ...current[modeAtSend],
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: reply,
          },
        ],
      }));
    } catch {
      setConversations((current) => ({
        ...current,
        [modeAtSend]: [
          ...current[modeAtSend],
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: failure,
            error: true,
          },
        ],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {open ? (
        <div
          id="support-chat"
          role="dialog"
          aria-labelledby="support-chat-title"
          className="fixed bottom-[5.75rem] right-4 z-50 flex h-[min(600px,calc(100dvh-7.5rem))] w-[calc(100vw-2rem)] max-w-[380px] animate-in flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_80px_-24px_rgba(26,26,26,0.4)] fade-in-0 slide-in-from-bottom-3 duration-200 sm:bottom-24 sm:right-6"
        >
          <div className="shrink-0 border-b border-line px-4 pb-3 pt-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
                  <Sparkles className="size-4" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p
                    id="support-chat-title"
                    className="truncate text-[13px] font-semibold text-ink"
                  >
                    SupportSage AI
                  </p>
                  <p className="flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[0.12em] text-subtle">
                    <span
                      className="size-1.5 rounded-full bg-emerald-500"
                      aria-hidden="true"
                    />
                    Groq online
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetConversation}
                  disabled={isLoading}
                  aria-label={`Reset ${modeConfig.label} chat`}
                  className="size-8 rounded-lg text-subtle hover:bg-gray-100 hover:text-ink disabled:opacity-40"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  className="size-8 rounded-lg text-subtle hover:bg-gray-100 hover:text-ink"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div
              role="group"
              aria-label="Chat mode"
              className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-line bg-canvas p-1"
            >
              {chatModes.map((mode) => {
                const Icon = mode.icon;
                const isActive = mode.id === activeMode;

                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => switchMode(mode.id)}
                    aria-pressed={isActive}
                    disabled={isLoading}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50 ${
                      isActive
                        ? "bg-white text-brand shadow-[0_1px_3px_rgba(16,24,40,0.08)] ring-1 ring-line"
                        : "text-subtle hover:text-ink"
                    }`}
                  >
                    <Icon className="size-3.5" strokeWidth={1.8} />
                    {mode.label}
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-[10px] leading-4 text-subtle">
              {modeConfig.description}
            </p>
          </div>

          <div
            ref={scrollRef}
            role="log"
            aria-label={`${modeConfig.label} chat messages`}
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-4"
          >
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-brand px-3.5 py-2.5 text-[12.5px] leading-5 text-white shadow-[0_4px_12px_-8px_rgba(74,28,58,0.8)]">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-brand/[0.07] text-brand ring-1 ring-inset ring-brand/10">
                    <ModeIcon className="size-3.5" strokeWidth={1.8} />
                  </span>
                  <div
                    className={`max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-[12.5px] leading-5 ${
                      message.error
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-line bg-white text-ink shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                    }`}
                  >
                    {message.error ? (
                      <span className="flex items-start gap-1.5">
                        <AlertCircle
                          className="mt-0.5 size-3.5 shrink-0"
                          strokeWidth={1.9}
                        />
                        <span>{message.content}</span>
                      </span>
                    ) : (
                      formatAssistantText(message.content)
                    )}
                  </div>
                </div>
              ),
            )}

            {messages.length === 1 && !isLoading ? (
              <div className="pl-[34px]">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-subtle">
                  Try asking
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {modeConfig.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void sendMessage(suggestion)}
                      className="rounded-full border border-line bg-white px-2.5 py-1.5 text-left text-[10.5px] text-subtle transition-colors hover:border-brand/25 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-brand/[0.07] text-brand ring-1 ring-inset ring-brand/10">
                  <ModeIcon className="size-3.5" strokeWidth={1.8} />
                </span>
                <div className="rounded-2xl rounded-tl-md border border-line bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <span className="flex items-center gap-1" aria-hidden="true">
                    <span className="size-1.5 animate-bounce rounded-full bg-brand/50 [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-brand/50 [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-brand/50" />
                  </span>
                  <span className="sr-only">Sage is thinking</span>
                </div>
              </div>
            ) : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
            className="shrink-0 border-t border-line bg-white p-3"
          >
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={isLoading}
                type="text"
                maxLength={2000}
                placeholder={`Message ${modeConfig.label} mode…`}
                aria-label={`Message SupportSage AI in ${modeConfig.label} mode`}
                className="h-10 flex-1 rounded-lg border-line bg-canvas text-[12.5px] text-ink placeholder:text-subtle focus-visible:border-brand/40 focus-visible:ring-brand/15 disabled:opacity-60"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="size-10 shrink-0 rounded-lg bg-brand text-white disabled:opacity-40"
              >
                <Send className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[9.5px] tracking-wide text-gray-400">
              Powered by Groq · {modeConfig.label} mode · AI can make mistakes
            </p>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="support-chat"
        aria-label={open ? "Close SupportSage chat" : "Open SupportSage chat"}
        className="fixed bottom-5 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-[0_16px_40px_-12px_rgba(74,28,58,0.65)] ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
      >
        {open ? (
          <X className="size-5" strokeWidth={1.9} />
        ) : (
          <>
            <MessageCircle className="size-5" strokeWidth={1.9} />
            <span className="absolute right-1 top-1 size-2.5 rounded-full border-2 border-brand bg-emerald-400" />
          </>
        )}
      </button>
    </>
  );
}
