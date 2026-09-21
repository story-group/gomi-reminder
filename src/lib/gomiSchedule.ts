import "server-only";

export const AREA = "西新宿7・8丁目";

/**
 * VercelランタイムはUTCで動くため、「今日 / 明日」の判定はJSTの壁時計に合わせる。
 * toLocaleString で JST の日時文字列を作り、それをサーバーローカルとして解釈し直すことで、
 * 以降の getDate() / getDay() が JST のカレンダー値を返すようにする。
 */
export function jstNow(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

/**
 * 毎日21時ごろに実行し「翌日」の収集を通知する運用のため、基準日は常に(JSTでの)翌日。
 */
export function jstTomorrow(): Date {
  const d = jstNow();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

/** "YYYY-MM-DD" をタイムゾーン非依存でカレンダー日付としてパースする(テスト用)。 */
export function parseCivilDate(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const WD = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** その曜日が月内で何回目か(1〜5)。 */
function nthWeekdayOfMonth(d: Date): number {
  return Math.floor((d.getDate() - 1) / 7) + 1;
}

/**
 * 指定日に出せるゴミの種類(西新宿7・8丁目)。
 *   資源ごみ           … 週1回 / 火曜
 *   燃やすごみ         … 週2回 / 月・木曜
 *   金属・陶器・ガラス … 月2回 / 第2・第4 水曜
 * 収集日が変わったらここを編集する。祝日の振替には未対応。
 */
export function gomiForDate(d: Date): string[] {
  const dow = d.getDay(); // 0=日 … 6=土
  const items: string[] = [];
  if (dow === 1 || dow === 4) items.push("燃やすごみ");
  if (dow === 2) items.push("資源ごみ");
  if (dow === 3 && (nthWeekdayOfMonth(d) === 2 || nthWeekdayOfMonth(d) === 4)) {
    items.push("金属・陶器・ガラスごみ");
  }
  return items;
}

/** 対象日に収集があれば通知本文を、無ければ null を返す。 */
export function buildGomiMessage(target: Date): string | null {
  const items = gomiForDate(target);
  if (items.length === 0) return null;
  const head = `🗑 あすのゴミ出し(${target.getMonth() + 1}/${target.getDate()} ${WD[target.getDay()]})`;
  const body = items.map((x) => `・${x}`).join("\n");
  return `${head}\n\n${body}\n\n朝8時までに出してください`;
}
