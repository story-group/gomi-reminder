import "server-only";

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendTelegramMessage(
  chatId: number,
  text: string
): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "bot_not_configured" };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      return { ok: false, error: data.description ?? "send_failed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "network_error" };
  }
}
