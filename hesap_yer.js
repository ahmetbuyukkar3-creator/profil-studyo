// Profil Stüdyo v9 · tavan dışındaki yerler için aydınlatma hesabı (hesap.js ile aynı yöntem ve aynı kaynaklı değerler).
// Fark: ışık hattı 3B'dir (duvarda, köşede, mobilya altında) ve her yerin ışığı odaya farklı ulaşır:
//   genel    : ışık doğrudan odaya yayılır (köşe profilleri) → doğrudan + yansıyan ışık.
//   dolayli  : gizli profil / kartonpiyer. Işık önce duvara ya da kartonpiyerin kavisine vurur, odaya YANSIYARAK gelir.
//              Gizli profilde (Z, Light Craft) ışığın yarısının yuvadan çıktığı kabul edilir (kaynak yarım küresinin
//              duvara bakan yarısı; geometrik kabul, ölçüm değil).
//   tezgah   : raf altı. Hesap düzlemi tezgâh üstü (90 cm); ortalama, tezgâhın rafın altındaki bölümünde alınır.
//              Hedef: IES konut tablosu "Kitchen – Preparing/Cooking" 50-100 fc = 538-1076 lx (aynı kaynak).
//   vurgu    : süpürgelik, banko altı, TV ünitesi altı. Işık masa yüksekliğinin altındadır; odaya yansıyarak katkı verir.
//   neon     : neon LED'in lümen değeri seçilecek neon modeline bağlıdır; kaynaklı değer olmadığı için hesaplanmaz.
import { LED, KABUL, HEDEF } from './hesap.js';

const H = 2.8;
export const TEZGAH_HEDEF = [538, 1076];
export const GIZLI_CIKIS = 0.5;

// yer + taslak → hesap türü
export function amac(urun, taslak) {
  if (urun.neon) return 'neon';
  if (urun.yer === 'gizli' || urun.yer === 'kartonpiyer') return 'dolayli';
  if (urun.yer === 'mobilya') return taslak === 'raf' || taslak === 'ikisi' ? 'tezgah' : 'vurgu';
  if (urun.yer === 'supurgelik') return 'vurgu';
  return 'genel';
}

// yollar: yer.js yerKur().yollar · bolge: [x0, x1, z0, z1] (tezgah) · Dönüş hesap.js aydinlatma() ile aynı alanlar (+ tur, bolgeOrt)
export function aydinlatmaYer(yollar, W, D, oda, urun, taslak, bolge) {
  const tur = amac(urun, taslak);
  const P = [];
  for (const { nok } of yollar) for (let i = 1; i < nok.length; i++) {
    const a = nok[i - 1], b = nok[i];
    const L = Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]);
    const k = Math.max(1, Math.ceil(L / 0.05));
    const n = [a.n[0] + b.n[0], a.n[1] + b.n[1], a.n[2] + b.n[2]], nl = Math.hypot(...n) || 1;
    for (let j = 0; j < k; j++) {
      const t = (j + 0.5) / k;
      P.push({ x: a.p[0] + (b.p[0] - a.p[0]) * t, y: a.p[1] + (b.p[1] - a.p[1]) * t, z: a.p[2] + (b.p[2] - a.p[2]) * t, n: n.map(c => c / nl), dl: L / k });
    }
  }
  const metre = P.reduce((s, p) => s + p.dl, 0);
  const neon = tur === 'neon';
  const lmM = neon ? 0 : LED.lm_m * KABUL.opal;
  const lumen = metre * lmM, watt = neon ? 0 : metre * LED.w_m;
  const yz = tur === 'tezgah' ? 0.9 : KABUL.duzlem;
  const adim = Math.max(0.08, Math.max(W, D) / 48);
  const nx = Math.max(2, Math.round(W / adim)), nz = Math.max(2, Math.round(D / adim));
  const Aw = 2 * (W + D) * H, Ac = W * D;
  const rho = (Ac * KABUL.tavan + Ac * KABUL.zemin + Aw * KABUL.duvar) / (2 * Ac + Aw);
  const izgara = new Float32Array(nx * nz);
  const dogrudanVar = tur !== 'dolayli' && !neon;
  let top = 0;
  if (dogrudanVar) for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const X = (i + 0.5) * W / nx, Z = (j + 0.5) * D / nz;
    let E = 0;
    for (const p of P) {
      const dx = X - p.x, dy = yz - p.y, dz = Z - p.z;
      const r2 = Math.max(dx * dx + dy * dy + dz * dz, 0.0025), r = Math.sqrt(r2);
      const cosK = (dx * p.n[0] + dy * p.n[1] + dz * p.n[2]) / r, cosA = -dy / r;
      if (cosK > 0 && cosA > 0) E += lmM * p.dl / Math.PI * cosK * cosA / r2;
    }
    izgara[j * nx + i] = E; top += E;
  }
  const dogrudan = top / (nx * nz);
  // odaya çıkan akı ve ilk vurduğu yüzeyin yansıtması
  // Kartonpiyer: ışık önce kartonpiyerin kendi beyaz kavisine vurur (yansıtma = tavan kabulü 0,7), sonra odaya dağılır.
  const cikan = lumen * (urun.yer === 'gizli' ? GIZLI_CIKIS : urun.yer === 'kartonpiyer' ? KABUL.tavan : 1);
  const ilk = (tur === 'vurgu' || urun.yer === 'supurgelik') ? KABUL.zemin : KABUL.duvar;
  const fDuzlem = Math.min(cikan, dogrudan * Ac);
  const dolayli = cikan ? (fDuzlem * KABUL.zemin + (cikan - fDuzlem) * ilk) / ((2 * Ac + Aw) * (1 - rho)) : 0;
  let enAz = Infinity, enCok = 0;
  for (let k = 0; k < izgara.length; k++) { izgara[k] += dolayli; enAz = Math.min(enAz, izgara[k]); enCok = Math.max(enCok, izgara[k]); }
  const ort = dogrudan + dolayli;
  let bolgeOrt = null;
  if (bolge) {
    let s = 0, c = 0;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const X = (i + 0.5) * W / nx, Z = (j + 0.5) * D / nz;
      if (X >= bolge[0] && X <= bolge[1] && Z >= bolge[2] && Z <= bolge[3]) { s += izgara[j * nx + i]; c++; }
    }
    bolgeOrt = c ? s / c : null;
  }
  const hedef = tur === 'tezgah' ? TEZGAH_HEDEF : HEDEF[oda];
  const olcut = tur === 'tezgah' && bolgeOrt != null ? bolgeOrt : ort;
  const durum = !hedef || neon ? null : olcut < hedef[0] * 0.9 ? 'az' : olcut > hedef[1] * 1.15 ? 'cok' : 'iyi';
  return { tur, metre, lumen, watt, lmM, ort, enAz, enCok, dolayli, izgara, nx, nz, hedef, durum, alan: Ac, bolgeOrt, duzlem: yz };
}
