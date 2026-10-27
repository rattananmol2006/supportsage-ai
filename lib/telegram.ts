import https from "node:https";

import { getSettings, recordNotification } from "@/lib/db";
import type { Notification } from "@/lib/types";

type TelegramHttpResponse = {
  status: number;
  body: string;
};

/**
 * Send the request over IPv4 explicitly. Some Windows/Node environments resolve
 * api.telegram.org to IPv6 first and hang even though IPv4 works.
 */
function postTelegram(
  url: string,
  payload: string,
  timeoutMs = 12_000,
): Promise<TelegramHttpResponse> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method: "POST",
        family: 4,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: timeoutMs,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error("Telegram request timed out."));
    });
    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

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
    const response = await postTelegram(
      `https://api.telegram.org/bot${config.token}/sendMessage`,
      JSON.stringify({
        chat_id: recipient,
        text: text.slice(0, 4000),
        disable_web_page_preview: true,
      }),
    );

    if (response.status < 200 || response.status >= 300) {
      console.error(
        `[telegram] send failed (${response.status}): ${response.body.slice(0, 200)}`,
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
