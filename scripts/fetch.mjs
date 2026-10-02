// ดึงข้อมูลน้ำท่วมปทุมธานีอัตโนมัติ (รันโดย GitHub Actions ทุก 2 ชม.)
// เขียน data/latest.json (ค่าล่าสุด) และต่อท้าย data/history/YYYY-MM.json (ประวัติ)
// กฎ: ไม่เดาตัวเลข — ดึงไม่ได้ก็ไม่ใส่ · ค่าเก่ากว่า 6 ชม. ไม่แสดง · ถนนที่ cleared/เก่ากว่า 12 ชม. ไม่ใส่
import fs from 'node:fs';

const UA = { 'user-agent': 'pathum-flood-dashboard (GitHub Actions; non-commercial public info)' };
const NOW = Date.now();
const MAX_AGE_ST = 6 * 3600e3, MAX_AGE_RD = 12 * 3600e3;
const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const bkk = ms => new Date(ms + 7 * 3600e3); // ใช้ getUTC* = เวลาไทย
const p2 = n => String(n).padStart(2, '0');
const thTime = ms => { const d = bkk(ms); return `${d.getUTCDate()} ${TH_M[d.getUTCMonth()]} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
const thFull = ms => { const d = bkk(ms); return `${d.getUTCDate()} ${TH_M[d.getUTCMonth()]} ${d.getUTCFullYear() + 543} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
const parseLocal = s => s ? Date.parse(s.replace(' ', 'T') + ':00+07:00') : NaN; // "2026-10-03 03:50"
const f2 = v => Number(v).toFixed(2);
const log = [];

async function J(url, opt = {}) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { ...opt, headers: { ...UA, ...(opt.headers || {}) }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { if (i == 2) { log.push(`FAIL ${url}: ${e.message}`); return null; } await new Promise(r => setTimeout(r, 4000)); }
  }
}
const arrOf = x => !x ? [] : Array.isArray(x) ? x : (x.data || x.stations || x.items || Object.values(x).find(Array.isArray) || []);

// ---- สถานี (ชื่อ/พิกัด/ตลิ่ง คงที่) ----
const TW = { // สสน. ThaiWater: code -> [name, lat, lon, bank]
  BKK002: ['คลองเปรมประชากร หลักหก', 13.96562, 100.60262, 1.29],
  BKK020: ['คลองลาดพร้าว ปากคลองสองสายใต้ (กทม.)', 13.93183, 100.63952, 1.97],
  BKK001: ['คลองลาดพร้าว ท้าย ปตร.คลอง 2 (กทม.)', 13.92245, 100.63438, 2.56],
  BKK015: ['คลองหกวา ลำลูกกา คลอง 8', 13.9416, 100.77499, 2.71],
  CAN001: ['คลองระพีพัฒน์แยกตก (คลองเจ็ด)', 14.20612, 100.74476, 4.56],
  BKK013: ['คลองระพีพัฒน์แยกใต้ หนองเสือ', 14.2206, 100.89168, 3.96],
  CPY014: ['เจ้าพระยา · สะพานนวลฉวี (นนทบุรี)', 13.94749, 100.53507, 2.50],
};
const GATES = { ATG08: ['ปตร.พระธรรมราชา', 14.077689, 100.89208, 'เหนือ/ท้ายประตู', 'เหนือประตู', 'ท้ายประตู', ' ถ้าต่างกันมาก มักหมายถึงประตูกำลังกั้นน้ำไว้'],
  ATG101: ['ปตร.จุฬาลงกรณ์ (ปากคลองรังสิตฯ)', 13.98135, 100.6057, 'ฝั่งคลอง/ฝั่งแม่น้ำ', 'ฝั่งคลองรังสิตฯ', 'ฝั่งแม่น้ำเจ้าพระยา', ''] };
const RID = { 'C.38': ['เจ้าพระยา · เมืองปทุมธานี'], 'C.29B': ['เจ้าพระยา · สามโคก'] };

const st = [], hist = [];
// row: [code,name,lat,lon,big,status,color,detail,time,source,atMs]
function push(row, at, v) { if (!isFinite(at) || NOW - at > MAX_AGE_ST) { log.push(`stale/skip ${row[0]} ${isFinite(at) ? thTime(at) : '?'}`); return; } row[8] = thTime(at); row[10] = at; st.push(row); if (v != null) hist.push({ c: row[0], t: at, v: +v }); }
function bankTxt(level, bank) { const d = level - bank; return d > 0 ? ['ล้นตลิ่ง ' + f2(d) + ' ม.', true] : ['ต่ำกว่าตลิ่ง ' + f2(-d) + ' ม.', false]; }

// 1) กรมชลประทาน C.38 / C.29B
const rid = arrOf(await J('https://faonam.com/api/rid/lower-chaophraya'));
for (const x of rid) if (RID[x.code] && x.level != null) {
  const [bt, over] = bankTxt(x.level, x.bank);
  const ch = x.change24h != null ? ` · ${x.change24h >= 0 ? 'ขึ้น' : 'ลง'} ${f2(Math.abs(x.change24h))} ม. ใน 24 ชม.` : '';
  const q = x.discharge ? ` · ไหลผ่าน ${Math.round(x.discharge).toLocaleString('en-US')} ลบ.ม./วิ.` : '';
  push([x.code, RID[x.code][0], x.latitude, x.longitude, f2(x.level), bt, over ? 'r' : 'g', `ระดับ ${f2(x.level)} ม.รทก. · ตลิ่ง ${f2(x.bank)}${ch}${q}`, '', 'กรมชลประทาน'], x.at, x.level);
}
// 2) กรมทรัพยากรน้ำ TA100219
for (const x of arrOf(await J('https://faonam.com/api/dwr/stations'))) if (x.code == 'TA100219' && x.level != null) {
  const cap = x.capacity;
  push(['TA100219', 'เจ้าพระยา · สะพานปทุมธานี 1', x.latitude, x.longitude, f2(x.level), cap != null ? `ความจุลำน้ำ ${Math.round(cap)}%${cap >= 100 ? ' (ถึงตลิ่ง)' : ''}` : '', cap >= 100 ? 'r' : 'b',
    `ระดับ ${f2(x.level)} ม.รทก.${cap != null ? ` · ความจุลำน้ำ ${cap}% (100% = ถึงตลิ่ง)` : ''}${x.flow ? ` · น้ำไหลผ่าน ${Math.round(x.flow).toLocaleString('en-US')} ลบ.ม./วิ.` : ''}`, '', 'กรมทรัพยากรน้ำ'], x.at, x.level);
}
// 3) โทรมาตร TC.55
for (const x of arrOf(await J('https://faonam.com/api/local/stations'))) if (/TC\.55/.test(x.name || '') && x.level != null) {
  const s = x.level >= x.critical ? ['วิกฤต', 'r'] : x.level >= x.warning ? ['เฝ้าระวัง', 'b'] : ['ปกติ', 'g'];
  push(['TC.55', 'เจ้าพระยา · อ.เมืองปทุมฯ (โทรมาตร)', x.latitude, x.longitude, f2(x.level), s[0], s[1], `ระดับ ${f2(x.level)} ม.รทก. · เฝ้าระวังที่ ${f2(x.warning)} · วิกฤตที่ ${f2(x.critical)}`, '', 'กรมชลประทาน (โทรมาตร)'], x.at, x.level);
}
// 4) สสน. ThaiWater
const wl = await J('https://faonam.com/api/tw/public/waterlevel_load');
for (const x of arrOf(wl && wl.waterlevel_data)) {
  const c = x.station && x.station.tele_station_oldcode; if (!TW[c] || x.waterlevel_msl == null) continue;
  const [nm, la, lo, bank] = TW[c]; const v = +x.waterlevel_msl; const [bt, over] = bankTxt(v, bank);
  push([c, nm, la, lo, f2(v), bt, over ? 'r' : 'b', `ระดับ ${f2(v)} ม.รทก. · ตลิ่ง ${f2(bank)}`, '', 'สสน. (ThaiWater)'], parseLocal(x.waterlevel_datetime), v);
}
const wg = await J('https://faonam.com/api/tw/public/watergate_load?province_code=13');
for (const x of arrOf(wg && wg.watergate_data)) {
  const c = x.station && x.station.tele_station_oldcode; if (!GATES[c] || x.watergate_in == null || x.watergate_out == null) continue;
  const g = GATES[c], a = +x.watergate_in, b = +x.watergate_out;
  push([c, g[0], g[1], g[2], `${f2(a)} | ${f2(b)}`, `${g[3]} ต่างกัน ${f2(Math.abs(a - b))} ม.`, 'w', `${g[4]} ${f2(a)} ม. · ${g[5]} ${f2(b)} ม. (ม.รทก.)${g[6]}`, '', 'สสน. (ThaiWater)'], parseLocal(x.watergate_datetime_in), null);
  if (isFinite(parseLocal(x.watergate_datetime_in))) hist.push({ c: c + '_in', t: parseLocal(x.watergate_datetime_in), v: a }, { c: c + '_out', t: parseLocal(x.watergate_datetime_in), v: b });
}
// 5) C.38 รายชั่วโมง (เก็บประวัติครบทุกชั่วโมง)
const c38 = await J('https://faonam.com/api/rid/station/C.38');
for (const h of (c38 && c38.hourly) || []) if (h.level != null && h.level > 0 && h.level < 6) hist.push({ c: 'C.38', t: h.at, v: h.level });

// 6) Floodboard ถนนน้ำท่วม (เฉพาะปทุมฯ)
const roads = []; let cleared = 0;
const fb = await J('https://floodboard.org/api/state');
for (const f of (fb && fb.segments && fb.segments.features) || []) {
  const p = f.properties, g = f.geometry; const cs = g.type == 'LineString' ? [g.coordinates] : g.coordinates; const pts = cs.flat();
  if (!pts.some(([x, y]) => y >= 13.955 && y <= 14.30 && x >= 100.30 && x <= 100.95)) continue;
  if (p.cleared) { cleared++; continue; }
  if (p.conf < 0.4 || NOW - p.updated > MAX_AGE_RD) continue;
  const v = p.verdict || {};
  roads.push([p.depthCm ?? null, p.closedAll ? 1 : 0, Math.round(p.conf * 100), thTime(p.updated),
    ['motorbike', 'sedan', 'pickup', 'truck'].map(k => (v[k] || '-')[0]).join(''), (p.name || '').replace(/[<>|=?&]/g, ''),
    (p.sources || []).map(s => s[0]).join(''), pts.map(([x, y]) => [+y.toFixed(5), +x.toFixed(5)])]);
}

// 7) อัตราการไหลประตูน้ำ กทม. (บันทึกไว้ ถ้าดึงได้)
const gatesBMA = {};
const fl = await J('https://weather.bangkok.go.th/flow/PageMap/GetData', { method: 'POST' });
for (const x of arrOf(fl && (fl.dtTableWl || fl))) if ([10, 11, 13].includes(+x.flow_id)) gatesBMA[x.flow_shortname || x.flow_id] = { flow: x.flow, at: x.site_timestampTH };

// ---- เขียนไฟล์ ----
fs.mkdirSync('data/history', { recursive: true });
const latest = { generatedAt: NOW, generatedTH: thFull(NOW), stations: st, roads: fb ? roads : null, roadsCleared: cleared, gatesBMA, log };
fs.writeFileSync('data/latest.json', JSON.stringify(latest));
// ประวัติรายเดือน (กันซ้ำด้วย code+เวลา)
const byMonth = {};
for (const h of hist) { const d = bkk(h.t); const k = `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}`; (byMonth[k] = byMonth[k] || []).push(h); }
for (const [k, arr] of Object.entries(byMonth)) {
  const fn = `data/history/${k}.json`; let old = [];
  try { old = JSON.parse(fs.readFileSync(fn, 'utf8')); } catch { }
  const seen = new Set(old.map(h => h.c + '@' + h.t));
  for (const h of arr) if (!seen.has(h.c + '@' + h.t)) { old.push(h); seen.add(h.c + '@' + h.t); }
  old.sort((a, b) => a.t - b.t || (a.c < b.c ? -1 : 1));
  fs.writeFileSync(fn, JSON.stringify(old));
}
console.log(`stations ${st.length} · roads ${roads.length} (cleared ${cleared}) · history +${hist.length}`);
for (const l of log) console.log(l);
if (!st.length && !roads.length) { console.error('ไม่ได้ข้อมูลเลย — ทุกแหล่งล้มเหลว'); process.exit(1); }
