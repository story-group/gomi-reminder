# ゴミ出しリマインダー（西新宿7・8丁目）

翌日の資源ごみ・燃やすごみ・金属陶器ガラスごみを、**前日21時ごろに Telegram へ通知**する
バッチシステム。収集対象が無い日は何も送りません。

`therapist_management_system`（検査結果管理くん）/ `story-diary-tracker`（写メ日記トラッカー）と
同じ **Next.js + Vercel Cron + Telegram Bot** 構成です。ただし収集日は固定ルールなので、
Supabase・スクレイピング・Webhookコマンドは持たず、日付計算だけで完結します。

| ゴミ | 収集 | 通知が飛ぶ日（前日21時ごろ） |
| --- | --- | --- |
| 燃やすごみ | 月・木 | 日曜・水曜 |
| 資源ごみ | 火 | 月曜 |
| 金属・陶器・ガラスごみ | 第2・第4 水曜 | 第2・第4 火曜 |

## セットアップ

### 1. Telegram Bot を作る

このシステム専用の bot を新規に作る（写メ日記トラッカーとは別 bot）。

1. Telegram で **@BotFather** → `/newbot` → 名前とユーザー名を決める
2. 発行された **トークン**（`123456789:AA...`）を控える
3. 送信先を用意する:
   - 個人チャットに送るなら、その bot に何か1通送信
   - 専用グループに送るなら、その bot をグループに招待して何か発言
4. chat_id を調べる（専用 bot は webhook 未登録なので `getUpdates` が使える）:
   ```bash
   curl "https://api.telegram.org/bot<token>/getUpdates"
   ```
   レスポンスの `result[].message.chat.id` が送信先（グループは `-100...`）

### 2. 環境変数

```bash
cp .env.local.example .env.local
```

| 変数 | 説明 |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | このシステム専用 bot のトークン |
| `TELEGRAM_GOMI_CHAT_ID` | リマインドの送信先 chat_id（自分との個人チャット or グループ） |
| `TELEGRAM_STAFF_ALERT_CHAT_ID` | 送信失敗時のアラート先（任意） |
| `CRON_SECRET` | `/api/cron/gomi` を Vercel Cron 以外から叩かれないための秘密文字列（任意の長い文字列） |

### 3. ローカル動作確認

```bash
npm install
npm run dev
```

別ターミナルで（`<secret>` は `.env.local` の `CRON_SECRET`）:

```bash
# 明日の判定（送信せず本文だけ）
curl -H "Authorization: Bearer <secret>" "http://localhost:3000/api/cron/gomi?dryRun=1"

# 日付を固定してロジック確認
curl -H "Authorization: Bearer <secret>" "http://localhost:3000/api/cron/gomi?date=2026-09-08&dryRun=1"

# 実際に Telegram へ送る
curl -H "Authorization: Bearer <secret>" "http://localhost:3000/api/cron/gomi?date=2026-09-08"
```

### 4. Vercel へデプロイ

```bash
npm i -g vercel   # 未導入なら
vercel            # プロジェクト作成
vercel --prod
```

1. Vercel ダッシュボード → プロジェクト → **Settings → Environment Variables** に
   `TELEGRAM_BOT_TOKEN` / `TELEGRAM_GOMI_CHAT_ID` / `CRON_SECRET`（＋任意で
   `TELEGRAM_STAFF_ALERT_CHAT_ID`）を登録
2. もう一度 `vercel --prod` で反映
3. `vercel.json` の Cron（`0 12 * * *` = 21:00 JST）が自動登録される。
   ダッシュボードの **Settings → Cron Jobs** で確認できる

## 運用スケジュール

- Vercel Cron が毎日 **12:00 UTC（= 21:00 JST）** に `/api/cron/gomi` を1回叩く
- ルートは常に「JSTの翌日」を基準日とし、収集があれば通知、無ければ 200 で `reason: "no-collection"` を返す
- **Vercel Hobby プランの Cron は指定時刻ちょうどには実行されず、数十分程度ズレることがある**
  （`story-diary-tracker` で実測29分遅れ）。日次リマインドの用途では許容する方針。
  正確な時刻が要るなら Pro プラン、または外部 Cron（cron-job.org 等）から
  `Authorization` ヘッダ付きで `/api/cron/gomi` を叩く構成に切り替える

## 収集日が変わったら

`src/lib/gomiSchedule.ts` の `gomiForDate()` を編集。曜日は `0=日 … 6=土`、
`nthWeekdayOfMonth()` はその曜日が月内で何回目か（1〜5）を返す。祝日の振替には未対応。
