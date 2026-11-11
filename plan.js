// Akıllı yerleşim: oda ölçüsüne göre hazır taslağın tavan planı ve metrajı.
// Kural (07 Kas 2026): hat her duvardan en az 60 cm içeride durur; taslak bu alanı dolduracak kadar büyür.
// Koordinat: x = oda eni (sol duvar 0), y = oda boyu (arka duvar 0, ön duvar D). Birim metre.

export const PAY = 0.60;
export const KAVIS = { R: 0.5, H: 2.8, bitis: 1.8 };   // tavandan duvara: kavis yarıçapı, tavan yüksekliği, duvarda bitiş

const yay = (cx, cy, rx, ry, a0, a1, n = 64) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });

// Hatlar: [{ noktalar: [[x,y],...], ek_m: duvardaki ek uzunluk }]
export function taslakHatlari(urun, taslak, W, D) {
  const x0 = PAY, x1 = W - PAY, y0 = PAY, y1 = D - PAY;
  const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const hat = (noktalar, ek_m = 0) => ({ noktalar, ek_m });
  if (urun === 'esnek') {
    if (taslak === 'O') return [hat(yay(cx, cy, w / 2, h / 2, 0, 360, 96))];
    if (taslak === 'C') return [hat(yay(cx, cy, w / 2, h / 2, 45, 315, 80))];
    if (taslak === 'U') {
      const ry = Math.min(w / 2, h * 0.6);
      return [hat([[x0, y1], ...yay(cx, y0 + ry, w / 2, ry, 180, 360, 64), [x1, y1]])];
    }
    if (taslak === 'S') {
      if (h >= w) {   // boyuna S: iki yarım elips
        const ry = h / 4, rx = w / 2;
        return [hat([...yay(cx, y0 + ry, rx, ry, 270, 450, 48), ...yay(cx, y0 + 3 * ry, rx, ry, 270, 90, 48).slice(1)])];
      }
      const rx = w / 4, ry = h / 2;   // enine S
      return [hat([...yay(x0 + rx, cy, rx, ry, 180, 360, 48), ...yay(x0 + 3 * rx, cy, rx, ry, 180, 0, 48).slice(1)])];
    }
    if (taslak === 'kavis') {   // tavandan arka duvara kavisle inen çizgiler, aralık ~50 cm
      const n = Math.max(2, Math.min(5, Math.floor(w / 0.5) + 1));
      const ek = Math.PI / 2 * KAVIS.R + (KAVIS.H - KAVIS.R - KAVIS.bitis);
      return Array.from({ length: n }, (_, i) => {
        const x = n === 1 ? cx : x0 + w * i / (n - 1);
        return hat([[x, y1], [x, KAVIS.R]], ek);
      });
    }
  }
  if (taslak === 'duz') return h >= w ? [hat([[cx, y0], [cx, y1]])] : [hat([[x0, cy], [x1, cy]])];
  if (taslak === 'paralel') {   // aralık ~1 m, 2 ile 5 hat arası
    const uzun = h >= w, kisa = uzun ? w : h;
    const n = Math.max(2, Math.min(5, Math.round(kisa / 1.0) + 1));
    return Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      return uzun ? hat([[x0 + w * t, y0], [x0 + w * t, y1]]) : hat([[x0, y0 + h * t], [x1, y0 + h * t]]);
    });
  }
  if (taslak === 'L') return [hat([[x0, y1], [x0, y0], [x1, y0]])];
  if (taslak === '2L') {
    const gx = Math.min(0.6, w * 0.2), gy = Math.min(0.6, h * 0.2);
    return [hat([[x0, cy + gy / 2], [x0, y0], [cx - gx / 2, y0]]), hat([[x1, cy - gy / 2], [x1, y1], [cx + gx / 2, y1]])];
  }
  if (taslak === 'U') return [hat([[x0, y1], [x0, y0], [x1, y0], [x1, y1]])];
  if (taslak === 'kare') {
    const k = Math.min(w, h) / 2;
    return [hat([[cx - k, cy - k], [cx + k, cy - k], [cx + k, cy + k], [cx - k, cy + k], [cx - k, cy - k]])];
  }
  if (taslak === 'dikdortgen') return [hat([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]])];
  return [];
}

export function metraj(hatlar) {
  let m = 0;
  for (const { noktalar, ek_m } of hatlar) {
    for (let i = 1; i < noktalar.length; i++) m += Math.hypot(noktalar[i][0] - noktalar[i - 1][0], noktalar[i][1] - noktalar[i - 1][1]);
    m += ek_m;
  }
  return m;
}

const sayi = v => v.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

// Tavan planı SVG: oda, 60 cm sınırı, hatlar, ölçüler.
export function planSvg(urun, taslak, W, D, hatlar, cerceve = false) {
  const kenar = 0.75, olcek = 300 / Math.max(W, D);
  const vw = (W + 2 * kenar) * olcek, vh = (D + 2 * kenar) * olcek;
  const X = x => ((x + kenar) * olcek).toFixed(1), Y = y => ((y + kenar) * olcek).toFixed(1);
  const kalin = Math.max(2, 3.2 * (cerceve ? 1.4 : 1));
  // v8: kapalı şekil <polygon> olarak çizilir: başladığı köşede de gönyeyle kapanır (uç uca binme yok).
  const yol = hatlar.map(({ noktalar }) => {
    const n = noktalar.length;
    const kapali = n > 2 && Math.hypot(noktalar[0][0] - noktalar[n - 1][0], noktalar[0][1] - noktalar[n - 1][1]) < 1e-4;
    const p = (kapali ? noktalar.slice(0, -1) : noktalar).map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');
    return kapali ? `<polygon points="${p}"/>` : `<polyline points="${p}"/>`;
  }).join('');
  const kavisli = taslak === 'kavis';
  return `<svg class="plan-svg" viewBox="0 0 ${vw.toFixed(0)} ${vh.toFixed(0)}" role="img" aria-label="Tavan planı">
  <rect class="oda" x="${X(0)}" y="${Y(0)}" width="${(W * olcek).toFixed(1)}" height="${(D * olcek).toFixed(1)}"/>
  ${kavisli ? `<rect class="kavis-bant" x="${X(0)}" y="${Y(0)}" width="${(W * olcek).toFixed(1)}" height="${(KAVIS.R * olcek).toFixed(1)}"/>` : ''}
  <rect class="sinir" x="${X(PAY)}" y="${Y(PAY)}" width="${((W - 2 * PAY) * olcek).toFixed(1)}" height="${((D - 2 * PAY) * olcek).toFixed(1)}"/>
  <g class="hat${cerceve ? ' cerceveli' : ''}" style="stroke-width:${kalin}">${yol}</g>
  <text class="olcu" x="${X(W / 2)}" y="${(kenar * olcek * 0.55).toFixed(1)}" text-anchor="middle">${sayi(W)} m</text>
  <text class="olcu" x="${(kenar * olcek * 0.55).toFixed(1)}" y="${Y(D / 2)}" text-anchor="middle" transform="rotate(-90 ${(kenar * olcek * 0.55).toFixed(1)} ${Y(D / 2)})">${sayi(D)} m</text>
  <line class="pay" x1="${X(0)}" y1="${Y(D - PAY / 2)}" x2="${X(PAY)}" y2="${Y(D - PAY / 2)}"/>
  <text class="pay-yazi" x="${X(PAY / 2)}" y="${Y(D - PAY / 2 - 0.08)}" text-anchor="middle">60 cm</text>
  ${kavisli ? `<text class="pay-yazi" x="${X(W / 2)}" y="${Y(KAVIS.R / 2 + 0.06)}" text-anchor="middle">kavisli geçiş · arka duvar</text>` : ''}
</svg>`;
}
