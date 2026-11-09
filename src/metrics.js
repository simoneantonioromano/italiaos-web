export const metricNames = Object.freeze([
  "home_view",
  "category_view",
  "story_view",
  "source_click",
  "sponsor_view",
  "sponsor_click",
  "rss_view",
]);

const romeDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export async function metric(db, name) {
  if (!db || !metricNames.includes(name)) return false;

  const parts = Object.fromEntries(
    romeDate.formatToParts(new Date()).map(({ type, value }) => [type, value]),
  );
  const day = [parts.year, parts.month, parts.day].join("-");
  await db.prepare(
    `INSERT INTO metrics (day, event, count) VALUES (?1, ?2, 1)
     ON CONFLICT (day, event) DO UPDATE SET count = metrics.count + 1`,
  ).bind(day, name).run();
  return true;
}