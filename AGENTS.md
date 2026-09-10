# AGENTS.md

## このプロジェクト

西新宿7・8丁目のゴミ収集日を、前日21時ごろに Telegram へリマインドするバッチ。
`story-diary-tracker` /（検査結果管理くん）と同じ **Next.js + Vercel Cron + Telegram Bot**
構成だが、収集日が固定ルールのため **Supabase・スクレイピング・Webhookコマンドは持たない**
（日付計算だけで完結する独立システム）。

## 構成

| ファイル | 役割 |
| --- | --- |
| `vercel.json` | Cron 設定。`0 12 * * *`（UTC）= 21:00 JST に `/api/cron/gomi` を1日1回起動 |
| `src/app/api/cron/gomi/route.ts` | `GET` ハンドラ。`Authorization: Bearer ${CRON_SECRET}` を検証し、翌日分を判定して送信 |
| `src/lib/gomiSchedule.ts` | 収集ルール（`gomiForDate`）、JST基準日、本文組み立て |
| `src/lib/telegramSend.ts` | Telegram Bot API への送信ヘルパー |

## 収集ルール（`src/lib/gomiSchedule.ts` の `gomiForDate`）

- 燃やすごみ … 月・木
- 資源ごみ … 火
- 金属・陶器・ガラスごみ … 第2・第4 水曜
- 曜日は `0=日 … 6=土`。`nthWeekdayOfMonth` はその曜日が月内で何回目か（1〜5）。
- 祝日の振替には未対応。収集日が変われば `gomiForDate` を直す。

## 環境変数

`.env.local.example` を参照。`TELEGRAM_BOT_TOKEN` / `TELEGRAM_GOMI_CHAT_ID` / `CRON_SECRET`
（＋任意で `TELEGRAM_STAFF_ALERT_CHAT_ID`）。Vercel では Project Settings → Environment Variables に設定。

`TELEGRAM_BOT_TOKEN` はこのシステム専用の新規 bot（写メ日記トラッカーとは別）。
webhook を使わない送信専用のため技術的には他システムと bot 共用も可能だが、
トークンのローテーションを独立させる運用上の理由で別 bot にしている。
専用 bot は webhook 未登録なので chat_id は `getUpdates` で取得できる。

## 動作確認

```bash
npm run build        # 型・ビルド
npm run dev
# 別ターミナルで（CRON_SECRET は .env.local の値）
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/gomi?dryRun=1"
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/gomi?date=2026-09-09&dryRun=1"
```

## 既知の制約

Vercel Hobby プランの Cron は指定時刻ちょうどには実行されず、数十分ズレることがある
（`story-diary-tracker` では実測29分遅れ）。日次リマインドの用途では許容する方針。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
