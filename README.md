# แดชบอร์ดน้ำท่วมปทุมธานี 2569

- หน้าเว็บ: `index.html` (GitHub Pages)
- `scripts/fetch.mjs` ดึงข้อมูลทุก 2 ชม. ผ่าน GitHub Actions (`.github/workflows/fetch.yml`) แล้วเขียน `data/latest.json` และ `data/history/YYYY-MM.json`
- แหล่ง: กรมชลประทาน / สสน. ThaiWater / กรมทรัพยากรน้ำ (ผ่าน faonam.com), Floodboard (รายงานประชาชน), สำนักการระบายน้ำ กทม.
- กฎ: ไม่เดาตัวเลข · ค่าเก่ากว่า 6 ชม. ไม่แสดง · ถนนที่น้ำลดแล้วหรือรายงานเก่ากว่า 12 ชม. ไม่แสดง
- ข้อมูลที่ยังอ่านมือ (เซ็นเซอร์สะพานฟ้า, กล้องเจ้าพระยา, ขนาดบานประตู, ข่าว/ประกาศ) อัปเดตในไฟล์ index.html
- กดดึงทันที: แท็บ Actions → fetch-flood-data → Run workflow
