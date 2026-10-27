import { getSettings, recordNotification } from "@/lib/db";
import type { Notification } from "@/lib/types";

type TelegramInput = {
  text: string;
  chatId?: string;
  relatedType?: Notification["relatedType"];
  relatedId?: string;
};

type TelegramResult = {
  status: Notification["status"];
  notification: Notification;
};

function maskChatId(chatId?: string) {
  if (!chatId) return "";
  if (chatId.length <= 6) return chatId;
  return `${chatId.slice(0, 3)}•••${chatId.slice(-3)}`;
}

export function getTelegramConfig() {
  const settings = getSettings();
  const token = settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = settings.telegramChatId || process.env.TELEGRAM_CHAT_ID || "";

  return {
    token,
    chatId,
    connected: Boolean(token && chatId),
    maskedChatId: maskChatId(chatId),
    source: settings.telegramBotToken
      ? ("dashboard" as const)
      : token
        ? ("environment" as const)
        : ("none" as const),
  };
}

export async function sendTelegramNotification({
  text,
  chatId,
  relatedType,
  relatedId,
}: TelegramInput): Promise<TelegramResult> {
  const config = getTelegramConfig();
  const recipient = chatId || config.chatId;

  if (!config.token || !recipient) {
    return {
      status: "queued",
      notification: recordNotification({
        channel: "telegram",
        recipient: recipient || "not-configured",
        message: text,
        status: "queued",
        error:
          "Telegram bot token or chat ID is not configured. Add it in Dashboard → Integrations.",
        relatedType,
        relatedId,
      }),
    };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: recipient,
          text: text.slice(0, 4000),
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[telegram] send failed (${response.status}): ${detail.slice(0, 200)}`,
      );
      return {
        status: "failed",
        notification: recordNotification({
          channel: "telegram",
          recipient,
          message: text,
          status: "failed",
          error: `Telegram returned ${response.status}. Check the bot token and chat ID.`,
          relatedType,
          relatedId,
        }),
      };
    }

    return {
      status: "sent",
      notification: recordNotification({
        channel: "telegram",
        recipient,
        message: text,
        status: "sent",
        relatedType,
        relatedId,
      }),
    };
  } catch (error) {
    console.error("[telegram] request error", error);
    return {
      status: "failed",
      notification: recordNotification({
        channel: "telegram",
        recipient,
        message: text,
        status: "failed",
        error: "Could not reach Telegram. Check the network and try again.",
        relatedType,
        relatedId,
      }),
    };
  }
}
