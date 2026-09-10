import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ゴミ出しリマインダー",
  description: "西新宿7・8丁目のゴミ収集日を前日夜にTelegramへ通知するバッチ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
