export default function Home() {
  return (
    <main>
      <h1>ゴミ出しリマインダー</h1>
      <p>
        画面はありません。毎日21時ごろ Vercel Cron が <code>/api/cron/gomi</code>{" "}
        を叩き、翌日の収集対象（西新宿7・8丁目）があればTelegramに通知します。
      </p>
    </main>
  );
}
