import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegramSend";
import {
  AREA,
  buildGomiMessage,
  gomiForDate,
  jstTomorrow,
  parseCivilDate,
  ymd,
} from "@/lib/gomiSchedule";

/**
 * 日次バッチ(Vercel Cron から毎日21時ごろ = 12:00 UTC に呼び出し)。
 * 「前日夜に翌日分を通知する」運用のため、基準日は常に(JSTでの)翌日を使う。
 * 収集対象があれば TELEGRAM_GOMI_CHAT_ID 宛にリマインドを送り、無ければ何もしない。
 *
 * therapist_management_system / story-diary-tracker と同じ
 * Next.js + Vercel Cron + Telegram Bot の構成。収集日は固定ルールのため
 * スクレイピングやDBは持たず、日付計算だけで完結する。
 *
 * テスト用クエリ:
 *   ?date=YYYY-MM-DD … 対象日を固定
 *   ?dryRun=1        … 送信せず判定結果と本文だけ返す
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const dryRun = searchParams.get("dryRun") === "1";

  let target: Date;
  if (dateParam) {
    const parsed = parseCivilDate(dateParam);
    if (!parsed) {
      return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400 });
    }
    target = parsed;
  } else {
    target = jstTomorrow();
  }

  const items = gomiForDate(target);
  const message = buildGomiMessage(target);
  const base = { area: AREA, date: ymd(target), items };

  if (!message) {
    return NextResponse.json({ ok: true, ...base, sent: false, reason: "no-collection" });
  }

  if (dryRun) {
    return NextResponse.json({ ok: true, ...base, sent: false, reason: "dry-run", message });
  }

  const chatId = process.env.TELEGRAM_GOMI_CHAT_ID;
  if (!chatId) {
    return NextResponse.json({ ok: false, error: "chat_not_configured" }, { status: 500 });
  }

  const result = await sendTelegramMessage(Number(chatId), message);
  if (!result.ok) {
    await notifyStaffError(`gomi_send_failed:${result.error}`);
    return NextResponse.json({ ok: false, ...base, error: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, ...base, sent: true });
}

async function notifyStaffError(message: string): Promise<void> {
  const staffChatId = process.env.TELEGRAM_STAFF_ALERT_CHAT_ID;
  if (!staffChatId) return;
  await sendTelegramMessage(
    Number(staffChatId),
    `⚠️ ゴミ出しリマインダーでエラーが発生しました\n${message}`
  );
}
