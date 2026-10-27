"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { handleAction } from "@/lib/mock-api";

export function ChatWidget() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {open ? (
        <div
          id="support-chat"
          role="dialog"
          aria-labelledby="support-chat-title"
          className="fixed bottom-[5.75rem] right-4 z-50 w-[calc(100vw-2rem)] max-w-[360px] animate-in overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_80px_-24px_rgba(26,26,26,0.4)] fade-in-0 slide-in-from-bottom-3 duration-200 sm:right-6 sm:bottom-24"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
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
                    className="size-1.5 rounded-full bg-brand/70"
                    aria-hidden="true"
                  />
                  Backend pending
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="size-8 shrink-0 rounded-lg text-subtle hover:bg-gray-100 hover:text-ink"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="bg-canvas px-4 py-5">
            <div className="max-w-[95%] rounded-xl rounded-tl-sm border border-line bg-white p-3.5 text-[12.5px] leading-5 text-ink shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              SupportSage AI Backend connection pending.
            </div>
            <p className="mt-2 pl-1 text-[10.5px] leading-4 text-subtle">
              Chat, voice, and action APIs will stream here. Human handoff is
              ready at launch.
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleAction("Send chat message");
            }}
            className="border-t border-line bg-white p-3"
          >
            <div className="flex items-center gap-2">
              <Input
                disabled
                type="text"
                placeholder="Type your message…"
                aria-label="Message SupportSage AI (disabled until the backend is connected)"
                className="h-10 flex-1 rounded-lg border-line bg-canvas text-[12.5px] text-ink placeholder:text-subtle disabled:bg-canvas disabled:opacity-100"
              />
              <Button
                type="submit"
                size="icon"
                disabled
                aria-label="Send message (disabled until the backend is connected)"
                className="size-10 shrink-0 rounded-lg bg-brand text-white disabled:opacity-40"
              >
                <Send className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[9.5px] tracking-wide text-gray-400">
              API integration pending · No message is sent
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
          <MessageCircle className="size-5" strokeWidth={1.9} />
        )}
      </button>
    </>
  );
}
