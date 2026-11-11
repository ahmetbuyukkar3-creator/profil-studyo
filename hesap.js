// Profil Stüdyo v8 · aydınlatma hesabı (DIALux mantığı, yaklaşık).
// Ahmet (09 Kas 2026): tek çeşit LED; LED ve trafo seçimi ekranda YOK. Değerler kaynaklıdır:
//   LED şerit: OSRAM LINEARlight FLEX LF1200S-G5-840 · 24 V · 8,6 W/m · 1200 lm/m · CRI 80
//     (katalog/led_seritler.json → üretici datasheet s.1-5). 3000 K için ayrı lm değeri datasheet'te yok; aynı değer kullanılır.
//   Opal kapak geçirgenliği 0,6 (katalog/kabuller.json, Kastlite malzeme verisi; kapak ölçümü değil).
//   Yüzey yansımaları tavan 0,7 · duvar 0,5 · zemin 0,2; çalışma düzlemi 0,75 m (EN 12464-1:2021 §5.2.2, kabuller.json).
//   Önerilen aydınlık (konut, IES tablosu, fc → lx): salon 10-20 fc (108-215 lx), mutfak genel 20-50 fc (215-538 lx),
//   antre/koridor 5-10 fc (54-108 lx). Kaynak: superbrightleds.com/blog/residential-recommended-lighting-levels.html
// Yöntem: doğrudan ışık = hat 5 cm parçalara bölünür, her parça Lambert (opal yüzey) ışık kaynağı; dolaylı ışık =
// oda küre formülü: ilk yansıyan akı Φ1 = Φ_düzlem·ρ_zemin + Φ_duvar·ρ_duvar, E = Φ1 / (A·(1-ρ̄)). Mobilya gölgesi ve bakım faktörü hesaba katılmaz (yeni montaj değeri).
import { KAVIS } from './plan.js';

export const LED = { w_m: 8.6, lm_m: 1200, cri: 80, volt: 24 };
export const KABUL = { opal: 0.6, tavan: 0.7, duvar: 0.5, zemin: 0.2, duzlem: 0.75 };
export const HEDEF = { salon: [108, 215], mutfak: [215, 538], antre: [54, 108] };
const H = 2.8, R = KAVIS.R;

// Plan hatlarını (x, y=arka duvardan uzaklık) 3B parçalara çevirir; sahne3d.js hatKur ile aynı geometri.
function parcalar(hatlar, kavisli) {
  const out = [];
  const ekle = (a, b, n) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const k = Math.max(1, Math.ceil(L / 0.05));
    for (let i = 0; i < k; i++) {
      const t = (i + 0.5) / k;
      out.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, z: a[2] + (b[2] - a[2]) * t, n, dl: L / k });
    }
  };
  for (const h of hatlar) {
    const p = h.noktalar;
    for (let i = 1; i < p.length; i++) ekle([p[i - 1][0], H, p[i - 1][1]], [p[i][0], H, p[i][1]], [0, -1, 0]);
    if (kavisli) {
      const x = p[0][0];
      let onc = [x, H, R];
      for (let s = 1; s <= 16; s++) {
        const a = (90 - 90 * s / 16) * Math.PI / 180;
        const yeni = [x, H - R + R * Math.sin(a), R - R * Math.cos(a)];
        const am = (90 - 90 * (s - 0.5) / 16) * Math.PI / 180;
        ekle(onc, yeni, [0, -Math.sin(am), Math.cos(am)]);
        onc = yeni;
      }
      ekle(onc, [x, KAVIS.bitis, 0], [0, 0, 1]);
    }
  }
  return out;
}

// hatlar: plan.js taslakHatlari çıktısı. Dönüş: metraj, lümen, watt, ortalama/en az/en çok lüks, ızgara (harita için).
export function aydinlatma(hatlar, kavisli, W, D, oda) {
  const P = parcalar(hatlar, kavisli);
  const metre = P.reduce((s, p) => s + p.dl, 0);
  const lmM = LED.lm_m * KABUL.opal;            // profilden çıkan ışık, lm/m
  const lumen = metre * lmM, watt = metre * LED.w_m;
  const adim = Math.max(0.08, Math.max(W, D) / 48);
  const nx = Math.max(2, Math.round(W / adim)), nz = Math.max(2, Math.round(D / adim));
  const yz = KABUL.duzlem;
  const Aw = 2 * (W + D) * H, Ac = W * D;
  const rho = (Ac * KABUL.tavan + Ac * KABUL.zemin + Aw * KABUL.duvar) / (2 * Ac + Aw);
  const izgara = new Float32Array(nx * nz);
  let top = 0, enAz = Infinity, enCok = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const X = (i + 0.5) * W / nx, Z = (j + 0.5) * D / nz;
    let E = 0;
    for (const p of P) {
      const dx = X - p.x, dy = yz - p.y, dz = Z - p.z;
      const r2 = dx * dx + dy * dy + dz * dz, r = Math.sqrt(r2);
      const cosK = (dx * p.n[0] + dy * p.n[1] + dz * p.n[2]) / r;   // kaynaktan çıkış açısı
      const cosA = -dy / r;                                            // yatay düzleme geliş açısı
      if (cosK > 0 && cosA > 0) E += lmM * p.dl / Math.PI * cosK * cosA / r2;
    }
    izgara[j * nx + i] = E;
    top += E;
  }
  const dogrudan = top / (nx * nz);
  const fDuzlem = Math.min(lumen, dogrudan * Ac);              // çalışma düzlemine doğrudan inen akı
  const dolayli = lumen ? (fDuzlem * KABUL.zemin + (lumen - fDuzlem) * KABUL.duvar) / ((2 * Ac + Aw) * (1 - rho)) : 0;
  for (let k = 0; k < izgara.length; k++) { izgara[k] += dolayli; enAz = Math.min(enAz, izgara[k]); enCok = Math.max(enCok, izgara[k]); }
  const ort = dogrudan + dolayli;
  const hedef = HEDEF[oda];
  const durum = !hedef ? null : ort < hedef[0] * 0.9 ? 'az' : ort > hedef[1] * 1.15 ? 'cok' : 'iyi';
  return { metre, lumen, watt, lmM, ort, enAz, enCok, dolayli, izgara, nx, nz, hedef, durum, alan: W * D };
}

// DIALux tarzı sahte renk ölçeği (düşük lüks koyu mavi → yüksek kırmızı).
const RENKLER = [[0, [20, 30, 90]], [0.2, [30, 90, 200]], [0.4, [40, 180, 200]], [0.6, [90, 200, 80]], [0.8, [245, 210, 50]], [1, [235, 80, 40]]];
export function renk(t) {
  t = Math.min(1, Math.max(0, t));
  for (let k = 1; k < RENKLER.length; k++) {
    const [t1, c1] = RENKLER[k], [t0, c0] = RENKLER[k - 1];
    if (t <= t1) { const u = (t - t0) / (t1 - t0); return c0.map((v, i) => Math.round(v + (c1[i] - v) * u)); }
  }
  return RENKLER.at(-1)[1];
}
// Ölçek üst sınırı: yuvarlak bir sayı (ör. 300, 400, 600 lx), harita odalar arası okunur kalsın.
export function olcekUst(enCok) {
  const adimlar = [100, 150, 200, 300, 400, 500, 600, 800, 1000, 1500, 2000];
  return adimlar.find(a => a >= enCok) || Math.ceil(enCok / 500) * 500;
}
