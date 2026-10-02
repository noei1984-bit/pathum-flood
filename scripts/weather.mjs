// พยากรณ์อากาศรายชั่วโมง หมู่บ้านชมฟ้าวรางกูล คลอง 2 (รันทุกวัน 00:05 น. เวลาไทย)
// แหล่ง: Open-Meteo (แบบจำลอง ไม่ใช่ค่าทางการ) ช่วง 00:00–23:00 ของวันนั้น
import fs from 'node:fs';
const LAT = 13.9927, LON = 100.6602;
const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FBangkok&forecast_days=1`;
let d;
for (let i = 0; i < 3; i++) {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error('HTTP ' + r.status); d = await r.json(); break; }
  catch (e) { console.log('retry', e.message); await new Promise(r => setTimeout(r, 5000)); }
}
if (!d || !d.hourly) { console.error('ดึงพยากรณ์ไม่ได้'); process.exit(1); }
const h = d.hourly;
const hours = h.time.map((t, i) => [t.slice(11, 16), h.temperature_2m[i], h.apparent_temperature[i], h.precipitation_probability[i], h.precipitation[i], h.weather_code[i], h.wind_speed_10m[i]]);
const now = Date.now(), b = new Date(now + 7 * 3600e3), p2 = n => String(n).padStart(2, '0');
const out = { date: h.time[0].slice(0, 10), generatedAt: now, generatedTH: `${b.getUTCDate()}/${b.getUTCMonth() + 1}/${b.getUTCFullYear() + 543} ${p2(b.getUTCHours())}:${p2(b.getUTCMinutes())}`, lat: LAT, lon: LON, source: 'Open-Meteo', hours };
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/weather.json', JSON.stringify(out));
console.log('weather', out.date, hours.length, 'hours');
