/** 로컬 시간대 기준 YYYY-MM-DD (UTC 로 바뀌어 하루 어긋나는 것 방지) */
export function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}
