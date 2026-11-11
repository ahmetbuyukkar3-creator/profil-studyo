// Profil Stüdyo v9 (10 Kas 2026): tavan dışındaki ürünlerin ÇALIŞTIĞI YER geometrisi.
// Ahmet: "bu ürünlerin nerede nasıl çalışması gerektiğini de öğren, uygulanacak yerleri ona göre dizayn et."
// Her ürün gerçek kullanım yerinde kurulur (kaynak: URUN_INCELEME_v9_2026-11-10.md):
//   iç köşe = iki duvarın birleştiği köşede dikey hat · dış köşe = çıkıntılı köşede dikey hat ·
//   gizli Z / Light Craft = alçıpan tavan kenarında gizli ışık (duvarı yıkar) · kartonpiyer = duvar-tavan birleşimi ·
//   süpürgelik = duvar dibi · sıva üstü / sıva altı = raf, banko, mobilya altı · neon = duvarda / zeminde çizgi.
// Koordinat: x = oda eni (sol duvar 0), z = oda boyu (arka duvar 0), y yukarı. Birim metre. Three.js'e bağımlı değil.
// Kesit ölçüleri (mm) veri.js'deki kaynaklardan; (u, v) = (duvardan uzaklık, yükseklik).

export const H = 2.8;
export const CIK = 0.25;          // salon TV duvarı çıkıntısı (dış köşe ürünü için)
const K2 = Math.SQRT1_2;

// ---------------------------------------------------------------- oda ölçüleri (sahne3d.js mobilyası ile ORTAK)
export function salonOlcu(W, D, cikinti = false) {
  const off = cikinti ? CIK : 0;
  const uw = Math.min(2.0, W - 1.2);
  const tvw = Math.min(1.65, uw - 0.2);
  const bw = Math.min(W - 0.8, uw + 0.7);
  return {
    off, uw, tvw, ux0: W / 2 - uw / 2,
    cik: cikinti ? { x0: W / 2 - bw / 2, x1: W / 2 + bw / 2, z1: CIK } : null,
    tv: { x0: W / 2 - tvw / 2, x1: W / 2 + tvw / 2, y0: 0.95, y1: 0.95 + tvw * 0.5625 },
    unite: { x0: W / 2 - uw / 2, x1: W / 2 + uw / 2, yAlt: 0.12, zOn: 0.44 + off },
    kanepeZ: Math.min(D - 0.55, Math.max(2.3, D * 0.72)),
  };
}
export function mutfakOlcu(W, D) {
  const DD = 0.62;
  const boyVar = W >= 3.6;
  const RX1 = boyVar ? W - 1.4 : W;
  const o = { DD, boyVar, RX1, raf: null, ada: null };
  if (RX1 >= 1.4) o.raf = { x0: 0.25, x1: RX1 - 0.25, yAlt: 1.64, z0: 0.02, z1: 0.26 };
  if (W >= 3.4 && D >= 4.4) {
    const AL = Math.min(2.2, W - 2.2), AD = D >= 5 ? 1.0 : 0.9, az0 = DD + 1.05;
    o.ada = { AL, AD, az0, x0: W / 2 - AL / 2, x1: W / 2 + AL / 2, yAlt: 0.89 };
  }
  return o;
}
export function antreOlcu(W) {
  const kw = Math.min(1.0, W - 0.5);
  return { kw, kapi: [W / 2 - kw / 2 - 0.06, W / 2 + kw / 2 + 0.06] };
}

// ---------------------------------------------------------------- duvar boyunca yol
// Plan yolu (x, z): duvar çizgisinin kendisi. İçeri yön = yön × yukarı. Köşede gönye (45°).
function duvarYollari(tas, W, D) {
  const A = [0, 0], B = [W, 0], C = [W, D], E = [0, D];
  if (tas === 'cevre') return [[A, B, C, E, A]];
  if (tas === 'arka') return [[A, B]];
  if (tas === 'karsi') return [[E, A], [B, C]];
  if (tas === 'L') return [[E, A, B]];
  return [];
}
// Her nokta için gönyeli içeri vektörü: { x, z, ix, iz, k }
export function gonye(yol) {
  const N = yol.length;
  const kapali = N > 2 && Math.hypot(yol[0][0] - yol[N - 1][0], yol[0][1] - yol[N - 1][1]) < 1e-6;
  const ic = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1; return [-dz / L, dx / L]; };
  return yol.map((p, i) => {
    const ia = i > 0 ? i - 1 : (kapali ? N - 2 : -1), ib = i < N - 1 ? i + 1 : (kapali ? 1 : -1);
    const g = ia >= 0 ? ic(yol[ia], p) : null, c = ib >= 0 ? ic(p, yol[ib]) : null;
    let v = g && c ? [g[0] + c[0], g[1] + c[1]] : (g || c);
    const L = Math.hypot(v[0], v[1]) || 1; v = [v[0] / L, v[1] / L];
    const k = g && c ? 1 / Math.max(0.25, v[0] * g[0] + v[1] * g[1]) : 1;
    return { x: p[0], z: p[1], ix: v[0], iz: v[1], k };
  });
}
// Duvar yolunda (u, v) konumunda, (nu, nv) yönüne bakan ışık hattı
function hatUV(yol, u, v, nu, nv) {
  return gonye(yol).map(g => {
    const n = [g.ix * nu, nv, g.iz * nu], L = Math.hypot(...n) || 1;
    return { p: [g.x + g.ix * g.k * u, v, g.z + g.iz * g.k * u], n: n.map(c => c / L) };
  });
}
const yay = (cx, cy, r, a0, a1, n = 10) => Array.from({ length: n + 1 }, (_, i) => {
  const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
});

// Alçıpan tavan levhası (12,5 mm): yuva = { duvar: [a, b] } → o duvar boyunca a..b arası açıklık
function levha(W, D, yuva = {}) {
  const T = 0.0125, k = [];
  const b = d => (yuva[d] ? yuva[d][1] : 0), a = d => (yuva[d] ? yuva[d][0] : 0);
  const kutu = (x0, x1, z0, z1) => { if (x1 - x0 > 1e-4 && z1 - z0 > 1e-4) k.push({ tip: 'kutu', mat: 'tavan', tavan: true, x: x0, y: H, z: z0, w: x1 - x0, h: T, d: z1 - z0 }); };
  kutu(b('sol'), W - b('sag'), b('arka'), D - b('on'));
  if (a('sol')) kutu(0, a('sol'), 0, D);
  if (a('sag')) kutu(W - a('sag'), W, 0, D);
  if (a('arka')) kutu(a('sol'), W - a('sag'), 0, a('arka'));
  if (a('on')) kutu(a('sol'), W - a('sag'), D - a('on'), D);
  return k;
}
const DUVARLAR = { cevre: ['arka', 'sol', 'sag', 'on'], arka: ['arka'], karsi: ['sol', 'sag'], L: ['arka', 'sol'] };

// ---------------------------------------------------------------- yer kurucuları
// Dönüş: { tavan: 'duz' | 'cik', kam: 'ust' | 'alt', poz, yollar: [{ nok: [{p, n}], gen, cerceve?, cerMat? }], ekler: [...] }
export function yerKur(urun, tas, oda, W, D) {
  const y = urun.yer, mm = v => v / 1000;
  const s = { tavan: 'duz', kam: 'ust', poz: 0, yollar: [], ekler: [] };
  const hat = (nok, gen, ek = {}) => s.yollar.push({ nok, gen, ...ek });

  if (y === 'ickose') {            // iki duvarın birleştiği köşede, köşenin içinde 45° bakan dikey çizgi
    s.ekler.push(...levha(W, D)); s.poz = oda === 'antre' ? (tas === 'k4' ? -0.4 : 0) : 0.4;   // dört köşe dar antrede fazla parlak
    const hepsi = [[0, 0], [W, 0], [0, D], [W, D]];
    for (const [cx, cz] of tas === 'k1' ? hepsi.slice(0, 1) : tas === 'k2' ? hepsi.slice(0, 2) : hepsi) {
      const sx = cx === 0 ? 1 : -1, sz = cz === 0 ? 1 : -1;
      const x = cx + sx * 0.0045, z = cz + sz * 0.0045, n = [sx * K2, 0, sz * K2];
      hat([{ p: [x, 0, z], n }, { p: [x, H, z], n }], mm(urun.isik));
    }
  }

  if (y === 'diskose') {           // çıkıntılı köşede (TV duvarı çıkıntısı) dikey ışıklı kenar
    s.tavan = 'cik'; s.poz = 0.4;
    s.ekler.push(...levha(W, D));
    const c = salonOlcu(W, D, true).cik;
    for (const [cx, sx] of [[c.x0, -1], [c.x1, 1]]) {
      const n = [sx * K2, 0, K2], x = cx + n[0] * 0.001, z = c.z1 + n[2] * 0.001;
      hat([{ p: [x, 0, z], n }, { p: [x, H, z], n }], mm(urun.isik));
    }
  }

  if (y === 'gizli') {             // alçıpan tavan kenarında gizli ışık: kaynak görünmez, duvar aydınlanır
    const duvarlar = DUVARLAR[tas] || [];
    const z_ = urun.id === 'gizliz';
    s.poz = oda === 'antre' ? (tas === 'arka' ? 1.3 : 0.3) : 1.1;   // dar antrede aynı ışık daha parlak: poz kısalır
    const yuva = z_ ? [0, 0.015] : [0.03, 0.085];       // Z: duvar dibinde 15 mm gölge derzi · Light Craft: 55 mm eğimli yuva
    s.ekler.push(...levha(W, D, Object.fromEntries(duvarlar.map(d => [d, yuva]))));
    for (const yol of duvarYollari(tas, W, D)) {
      if (z_) hat(hatUV(yol, 0.0075, H + 0.0152, 0, -1), mm(urun.isik));
      else {
        const kesit = Array.from({ length: 9 }, (_, i) => { const t = i / 8; return [0.03 + 0.055 * t, H + 0.02 * t * t]; });
        s.ekler.push({ tip: 'sur', mat: 'tavan', tavan: true, yol, kesit });
        hat(hatUV(yol, 0.0848, H + 0.0115, -1, 0), mm(urun.isik));
      }
    }
  }

  if (y === 'kartonpiyer') {       // duvar-tavan birleşiminde ışıklı kartonpiyer (75 × 70 mm)
    s.poz = oda === 'antre' ? (tas === 'arka' ? 1.3 : 0.3) : 1.0;   // tek kısa duvar: az ışık, poz uzar
    s.ekler.push(...levha(W, D));
    const kesit = [[0, H - 0.070], [0.0308, H - 0.070], [0.0308, H - 0.058], [0.0174, H - 0.058],
      ...yay(0.0586, H - 0.058, 0.0412, 180, 90, 12).slice(1), [0.075, H - 0.0164], [0.075, H]];
    for (const yol of duvarYollari(tas, W, D)) {
      s.ekler.push({ tip: 'sur', mat: 'kartonpiyer', yol, kesit });
      hat(hatUV(yol, 0.0241, H - 0.0577, 0, 1), mm(urun.isik));
    }
  }

  if (y === 'supurgelik') {        // duvar dibinde ışıklı süpürgelik
    s.kam = 'alt'; s.poz = urun.id === 'sup100' ? 0.8 : 1.8;
    s.ekler.push(...levha(W, D));
    let yollar = duvarYollari(tas, W, D);
    if (oda === 'antre' && tas === 'cevre') { const [k0, k1] = antreOlcu(W).kapi; yollar = [[[k1, 0], [W, 0], [W, D], [0, D], [0, 0], [k0, 0]]]; }
    for (const yol of yollar) {
      if (urun.id === 'sup100') {          // 100 × 10 mm gövde, ön yüzde ince ışık çizgisi
        s.ekler.push({ tip: 'sur', mat: 'antrasit', yol, kesit: [[0, 0.1], [0.01, 0.1], [0.01, 0]] });
        hat(hatUV(yol, 0.0103, 0.027, 1, 0), mm(urun.isik));
      } else if (urun.id === 'sup90') {    // 90 × 14,5 mm gövde, alt kısmı oval ışıklı
        s.ekler.push({ tip: 'sur', mat: 'aluminyum', yol, kesit: [[0, 0.09], [0.0145, 0.09], [0.0145, 0.021], [0.002, 0.021]] });
        hat(hatUV(yol, 0.0095, 0.0105, 0.6, -0.8), mm(urun.isik));
      } else {                             // sıva altı 15 × 45 mm: duvar dibinde gizli, zemini yıkar
        s.ekler.push({ tip: 'sur', mat: 'duvar', yol, kesit: [[0, 0.075], [0.0155, 0.075], [0.0155, 0.062], [0, 0.062]] });
        hat(hatUV(yol, 0.0078, 0.0615, 0, -1), mm(urun.isik));
      }
    }
  }

  if (y === 'mobilya') {           // raf altı, banko altı, TV ünitesi altı
    s.ekler.push(...levha(W, D)); s.poz = 1.3;
    const alt = (x0, x1, yAlt, z) => {     // mobilyanın alt yüzünde x boyunca hat
      if (x1 - x0 < 0.3) return;
      const n = [0, -1, 0];
      if (urun.gomme) hat([{ p: [x0, yAlt - 0.0006, z], n }, { p: [x1, yAlt - 0.0006, z], n }], mm(urun.isik), { cerceve: mm(urun.cerceve), cerMat: 'aluminyum' });
      else {
        const ww = mm(urun.govde[0]), hh = mm(urun.govde[1]);
        s.ekler.push({ tip: 'kutu', mat: 'aluminyum', x: x0, y: yAlt - hh, z: z - ww / 2, w: x1 - x0, h: hh, d: ww });
        hat([{ p: [x0 + 0.003, yAlt - hh - 0.0005, z], n }, { p: [x1 - 0.003, yAlt - hh - 0.0005, z], n }], mm(urun.isik));
      }
    };
    if (oda === 'mutfak') {
      const m = mutfakOlcu(W, D);
      if (m.raf && tas !== 'banko') alt(m.raf.x0 + 0.02, m.raf.x1 - 0.02, m.raf.yAlt, m.raf.z1 - 0.06);
      if (m.ada && tas !== 'raf') alt(m.ada.x0 + 0.05, m.ada.x1 - 0.05, m.ada.yAlt, m.ada.az0 + m.ada.AD - 0.10);
      if (tas === 'banko') { s.kam = 'alt'; s.poz = 2.0; }
    }
    if (oda === 'salon') { const u = salonOlcu(W, D).unite; alt(u.x0 + 0.02, u.x1 - 0.02, u.yAlt, u.zOn - 0.015); s.kam = 'alt'; s.poz = 2.2; }
  }

  if (y === 'neon') {              // duvarda / zeminde neon çizgi
    s.ekler.push(...levha(W, D)); s.poz = 0.3;
    const g = mm(urun.isik);
    if (oda === 'salon') {
      const t = salonOlcu(W, D).tv, n = [0, 0, 1], z = 0.0015;
      if (tas === 'cerceve') {
        const x0 = Math.max(0.3, t.x0 - 0.22), x1 = Math.min(W - 0.3, t.x1 + 0.22), y0 = t.y0 - 0.22, y1 = t.y1 + 0.22;
        hat([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]].map(([x, yy]) => ({ p: [x, yy, z], n })), g);
      } else for (const yon of [-1, 1]) for (let i = 0; i < 3; i++) {
        const x = W / 2 + yon * ((t.x1 - t.x0) / 2 + 0.35 + i * 0.18);
        if (x > 0.2 && x < W - 0.2) hat([{ p: [x, 0, z], n }, { p: [x, H, z], n }], g);
      }
    } else {                       // zeminde yol hattı
      s.kam = 'alt'; s.poz = 0.8;
      hat([{ p: [W / 2, 0.0012, 0.4], n: [0, 1, 0] }, { p: [W / 2, 0.0012, D - 0.3], n: [0, 1, 0] }], g);
    }
  }
  return s;
}

export function yerMetraj(yollar) {
  let m = 0;
  for (const { nok } of yollar) for (let i = 1; i < nok.length; i++) m += Math.hypot(nok[i].p[0] - nok[i - 1].p[0], nok[i].p[1] - nok[i - 1].p[1], nok[i].p[2] - nok[i - 1].p[2]);
  return m;
}
