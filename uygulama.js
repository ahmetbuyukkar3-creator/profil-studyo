// Profil Stüdyo v9 (10 Kas 2026): ledprofilleri.com'daki tüm profiller; her ürün ÇALIŞTIĞI YERDE gösterilir.
// Ahmet: "hangi ürün varsa sisteme ekle, bu ürünlerin nerede nasıl çalışması gerektiğini de öğren, uygulanacak yerleri
// ona göre dizayn et ... karmaşıklık olmasın." Akış aynı: 1 Oda · 2 Profil (yerine göre gruplu) · 3 Taslak.
// v8: asıl ekran = gerçekçi görünüm (bulut Cycles renderı); her seçimde aydınlatma hesabı (lümen, W, lüks) + ışık dağılımı.
import { URUNLER, YERLER, taslaklar } from './veri.js';
import { taslakHatlari, metraj, planSvg } from './plan.js';
import { Sahne, ODA_TIPLERI } from './sahne3d.js';
import { aydinlatma, renk, olcekUst, LED, KABUL } from './hesap.js';
import { yerKur, yerMetraj, mutfakOlcu } from './yer.js';
import { aydinlatmaYer, GIZLI_CIKIS } from './hesap_yer.js';
import { yerIkon } from './yer_ikon.js';
import { Pano } from './pano.js';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const durum = { oda: 'salon', W: 5, D: 4, urun: 't15', taslak: 'dikdortgen', sekme: 'render', gorunum: 'oda', kelvin: 3000, adim: 'profil' };
const sahne = new Sahne($('#tuval'));
const sayi = (v, k = 1) => v.toLocaleString('tr-TR', { maximumFractionDigits: k });
const on = v => Math.round(v / 10) * 10;
const urun = () => URUNLER.find(x => x.id === durum.urun);
const taslakListe = () => taslaklar(durum.urun, durum.oda);
const taslak = () => taslakListe().find(x => x.id === durum.taslak);
const odaBilgi = () => ODA_TIPLERI.find(o => o.id === durum.oda);
const tavanda = () => urun().yer === 'tavan';
// Seçim odaya uymuyorsa (ürün bu odada kullanılmıyor / taslak yok) en yakın geçerli seçime çek
function secimDuzelt() {
  if (!urun().odalar.includes(durum.oda)) durum.urun = 't15';
  if (!taslak()) durum.taslak = taslakListe()[0].id;
}
// O anki tasarım: tavan ürünlerinde plan hatları, diğerlerinde yerin 3B hatları (yer.js)
function tasarim(tas = durum.taslak) {
  const u = urun();
  if (u.yer === 'tavan') {
    const h = taslakHatlari(u.id, tas, durum.W, durum.D);
    return { h, metre: metraj(h), plan: h.map(x => x.noktalar), tavanTip: 'kavis' };
  }
  const s = yerKur(u, tas, durum.oda, durum.W, durum.D);
  return { s, metre: yerMetraj(s.yollar), plan: s.yollar.map(y => y.nok.map(o => [o.p[0], o.p[2]])), tavanTip: s.tavan };
}
// Gerçekçi görünüm ölçü kademeleri (bulutta hazır render). Girilen ölçüye EN YAKIN kademenin görüntüsü gelir;
// hesap ve ışık dağılımı her zaman girilen ölçüye göredir. (Ahmet 09 Kas: "gerçekçi görünüm sürekli olmalı")
// v9: yeni ürünlerin görüntüsü şimdilik odanın örnek ölçüsünde (salon 5 × 4, mutfak 4 × 5, antre 2 × 4).
const KADEME = {
  salon: [[4, 3.5], [5, 4], [6, 5], [7, 6]],
  mutfak: [[3.5, 4], [4, 5], [5, 6]],
  antre: [[1.6, 3], [2, 4], [2.4, 5]],
};
const kademe = () => (tavanda() ? KADEME[durum.oda] : [[odaBilgi().en, odaBilgi().boy]])
  .reduce((en, k) => Math.hypot(k[0] - durum.W, k[1] - durum.D) < Math.hypot(en[0] - durum.W, en[1] - durum.D) ? k : en);
const kademede = () => { const [w, d] = kademe(); return w === durum.W && d === durum.D; };

// ---------------------------------------------------------------- tasarım paneli
const panel = $('#tasarim');
function panelAc(acik) {
  panel.hidden = !acik;
  $('#tasarlaDugme').setAttribute('aria-expanded', acik);
}
$('#tasarlaDugme').addEventListener('click', () => panelAc(panel.hidden));
$('#tasarimKapat').addEventListener('click', () => panelAc(false));
function adimSec(ad) {
  durum.adim = ad;
  $$('.adimlar [data-adim]').forEach(b => b.setAttribute('aria-selected', b.dataset.adim === ad));
  $$('.adim-icerik').forEach(d => { d.hidden = d.dataset.icerik !== ad; });
}
$$('.adimlar [data-adim]').forEach(b => b.addEventListener('click', () => adimSec(b.dataset.adim)));
new ResizeObserver(() => document.documentElement.style.setProperty('--ust-h', `${$('.ust').offsetHeight}px`)).observe($('.ust'));

// ---------------------------------------------------------------- oda + ölçü
function odalariCiz() {
  $('#odalar').innerHTML = ODA_TIPLERI.map(o => `<button class="oda-dugme" role="radio" aria-checked="${o.id === durum.oda}" data-id="${o.id}">${o.ad}</button>`).join('');
}
$('#odalar').addEventListener('click', e => {
  const b = e.target.closest('.oda-dugme'); if (!b) return;
  const o = ODA_TIPLERI.find(x => x.id === b.dataset.id);
  Object.assign(durum, { oda: o.id, W: o.en, D: o.boy });
  secimDuzelt();
  olcuYaz(); odalariCiz(); urunleriCiz(); paketleriCiz(); odaYenile(true);
});
function olcuYaz() {
  $('#odaEn').value = durum.W; $('#odaBoy').value = durum.D;
  $('#alanM2').textContent = `${sayi(durum.W * durum.D)} m²`;
  const [kw, kd] = kademe();
  $('#olcuNot').textContent = kademede()
    ? 'Ölçüyü değiştirdiğinizde görüntü, taslak ve hesap birlikte güncellenir.'
    : `Gerçekçi görüntü ${tavanda() ? 'en yakın' : 'örnek'} oda ölçüsünde (${sayi(kw)} × ${sayi(kd)} m) gösterilir; hesap ve ışık dağılımı sizin ölçünüze (${sayi(durum.W)} × ${sayi(durum.D)} m) göredir.`;
}
let olcuZaman;
function olcuOku() {
  const oku = (s, v) => { const n = parseFloat(String($(s).value).replace(',', '.')); return n >= 1.6 && n <= 15 ? n : v; };
  durum.W = oku('#odaEn', durum.W); durum.D = oku('#odaBoy', durum.D);
  $('#alanM2').textContent = `${sayi(durum.W * durum.D)} m²`;
  paketleriCiz(); hesapCiz(); haritaCiz(); etiketYaz(); olcuYaz(); renderGoster();
  clearTimeout(olcuZaman); olcuZaman = setTimeout(() => odaYenile(false), 350);
}
['#odaEn', '#odaBoy'].forEach(s => $(s).addEventListener('input', olcuOku));

let kurulum = 0;
async function odaYenile(gorunumSifirla) {
  const no = ++kurulum;
  $('#yukleniyor').hidden = false;
  await sahne.odaKur(durum.oda, durum.W, durum.D, tasarim().tavanTip);
  if (no !== kurulum) return;
  hatYenile();
  if (gorunumSifirla || !sahne.gez.acik) sahne.gorunum(durum.gorunum === 'gez' ? 'oda' : durum.gorunum);
  if (durum.gorunum === 'gez') sahne.gezAc();
  $('#yukleniyor').hidden = true;
}

// ---------------------------------------------------------------- profil + taslak
// v9: profiller çalıştıkları yere göre gruplanır; sadece seçili odada kullanılanlar görünür.
// (10 Kas, Ahmet: "hem profesyonel şekilde gösterilmeli hem de net anlaşılmalı hangi ürünün nerede kullanıldığı")
// Önce KULLANIM YERİ seçilir (simgeli: odanın kesitinde profilin durduğu yer), altında yalnız o yerin profilleri görünür.
const yerdekiler = yer => URUNLER.filter(u => u.yer === yer && u.odalar.includes(durum.oda));
const yerBilgi = () => YERLER.find(y => y.id === urun().yer);
function urunleriCiz() {
  const secili = urun().yer;
  $('#yerler').innerHTML = YERLER.filter(y => yerdekiler(y.id).length).map(y => `
    <button class="yer" role="radio" aria-checked="${y.id === secili}" data-id="${y.id}">${yerIkon(y.id)}<span>${y.ad}</span></button>`).join('');
  $('#yerNot').textContent = yerBilgi().not;
  $('#urunler').innerHTML = yerdekiler(secili).map(u => `
    <button class="urun" role="radio" aria-checked="${u.id === durum.urun}" data-id="${u.id}">
      <img src="assets/urun/${u.id}.jpg" alt="" loading="lazy"><span><b>${u.ad}</b><small>${u.not}</small></span>
    </button>`).join('');
  $('#yerler [aria-checked="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
$('#yerler').addEventListener('click', e => {
  const b = e.target.closest('.yer'); if (!b || b.dataset.id === urun().yer) return;
  durum.urun = yerdekiler(b.dataset.id)[0].id;      // yer seçilince o yerin ilk profili odada hemen görünür
  secimDuzelt();
  urunleriCiz(); paketleriCiz(); olcuYaz(); hatYenile();
});
$('#urunler').addEventListener('click', e => {
  const b = e.target.closest('.urun'); if (!b) return;
  durum.urun = b.dataset.id;
  secimDuzelt();
  urunleriCiz(); paketleriCiz(); olcuYaz(); hatYenile(); adimSec('taslak');
});
function paketleriCiz() {
  const u = urun(), o = odaBilgi();
  $('#paketler').innerHTML = taslakListe().map(t => {
    const ts = tasarim(t.id);
    // Tavan ürünlerinde tavan planı; diğerlerinde taslağın uygulanmış oda görüntüsü
    const mini = ts.h
      ? planSvg(durum.urun, t.id, durum.W, durum.D, ts.h, !!u.cerceve)
      : `<img class="mini-foto" src="assets/render/v8/${o.id}-${o.en}x${o.boy}_${u.id}_${t.id}_${durum.kelvin}.jpg" alt="" loading="lazy" onerror="this.remove()">`;
    return `<button class="paket" role="radio" aria-checked="${t.id === durum.taslak}" data-id="${t.id}">
      <span class="mini">${mini}</span>
      <span class="paket-yazi"><b>${t.ad}</b><small>${sayi(ts.metre)} m${u.boy ? ` · ${Math.ceil(ts.metre / u.boy - 1e-6)} boy` : ''}</small></span>
    </button>`;
  }).join('');
  $('#taslakNot').textContent = tavanda()
    ? 'Taslak oda ölçüsüne göre otomatik büyür; hat her duvardan en az 60 cm içeride durur.'
    : `${YERLER.find(y => y.id === u.yer).not} Taslak oda ölçüsüne göre otomatik uzar.`;
}
$('#paketler').addEventListener('click', e => {
  const b = e.target.closest('.paket'); if (!b) return;
  durum.taslak = b.dataset.id; paketleriCiz(); hatYenile();
});
function hatYenile() {
  const u = urun(), ts = tasarim();
  if (ts.tavanTip !== sahne.tavanTip) { odaYenile(false); return; }   // oda bu ürünün yerine göre yeniden kurulur
  if (ts.h) sahne.hatKur(ts.h, u.isik / 1000, u.cerceve / 1000, durum.taslak === 'kavis');
  else sahne.yerKur(ts.s);
  hesapCiz(); haritaCiz(); etiketYaz(); renderGoster();
}

// ---------------------------------------------------------------- aydınlatma hesabı
let sonHesap = null;
function hesapla() {
  const u = urun(), ts = tasarim();
  if (ts.h) sonHesap = { tur: 'genel', duzlem: KABUL.duzlem, plan: ts.plan, ...aydinlatma(ts.h, durum.taslak === 'kavis', durum.W, durum.D, durum.oda) };
  else {
    const m = durum.oda === 'mutfak' ? mutfakOlcu(durum.W, durum.D) : null;
    const bolge = m?.raf ? [m.raf.x0, m.raf.x1, 0, m.DD + 0.02] : null;
    sonHesap = { plan: ts.plan, ...aydinlatmaYer(ts.s.yollar, durum.W, durum.D, durum.oda, u, durum.taslak, bolge) };
  }
  return sonHesap;
}
function hesapCiz() {
  const r = hesapla(), u = urun();
  const odaAd = odaBilgi().ad;
  const [h0, h1] = r.hedef;
  const aralik = `${on(h0)}–${sayi(on(h1), 0)} lx`;
  const tezgah = r.tur === 'tezgah' && r.bolgeOrt != null;
  const deger = tezgah ? r.bolgeOrt : r.ort;
  const ust = Math.max(deger * 1.25, h1 * 1.35);
  const yuzde = v => `${Math.min(100, v / ust * 100).toFixed(1)}%`;
  const bar = `<div class="bar" aria-hidden="true"><span class="hedef" style="left:${yuzde(h0)};width:calc(${yuzde(h1)} - ${yuzde(h0)})"></span><span class="isaret" style="left:${yuzde(deger)}"></span></div>`;
  const lx = v => `<b>${sayi(Math.round(v), 0)}<i>lx</i></b>`;
  let lux, nasilEk = '';
  if (r.tur === 'neon') {
    lux = `<div class="lux"><div class="lux-durum">Neon çizgi dekoratif bir ışıktır. Işık değeri, kanala takılacak neon LED modeline göre değişir; bu yüzden burada lüks hesabı verilmez.</div></div>`;
  } else if (r.tur === 'vurgu') {
    lux = `<div class="lux"><div class="lux-ust"><small>Odanın genel aydınlığına<br>katkısı (yansıyan ışık)</small>${lx(r.ort)}</div>
      <div class="lux-durum"><b>Vurgu ışığı.</b> Mekâna derinlik ve yön verir; ışık zemine yakın kalır. ${odaAd} için önerilen genel aydınlık ${aralik}: tavan profiliyle birlikte kullanın.</div></div>`;
    nasilEk = '<p>Bu profilde ışık masa yüksekliğinin altında kalır; odaya zeminden ve duvarlardan yansıyarak ulaşır. Gösterilen değer bu yansıyan ışığın ortalamasıdır.</p>';
  } else if (tezgah) {
    const yorum = {
      iyi: `<b class="iyi">✓ Uygun.</b> Yemek hazırlama için önerilen ${aralik} aralığında.`,
      az: `<b class="az">Tezgâhta yumuşak ışık.</b> Yemek hazırlama için önerilen ${aralik}; raf altı ışığı tavan aydınlatmasıyla birlikte bu değere ulaşır.`,
      cok: `<b class="cok">Çok aydınlık.</b> Yemek hazırlama için önerilen ${aralik}; bu tasarım bunun üstünde.`,
    }[r.durum];
    lux = `<div class="lux"><div class="lux-ust"><small>Tezgâh üstü<br>ortalama aydınlık</small>${lx(deger)}</div>${bar}<div class="lux-durum">${yorum}</div></div>`;
    nasilEk = '<p>Raf altı ışığında hesap düzlemi tezgâh üstüdür (90 cm); ortalama, tezgâhın rafın altında kalan bölümünde alınır. Önerilen değer: IES konut tablosu, yemek hazırlama 538–1.076 lx.</p>';
  } else {
    const dolayli = r.tur === 'dolayli';
    const yorum = {
      iyi: `<b class="iyi">✓ Uygun.</b> ${odaAd} için önerilen ${aralik} aralığında.`,
      az: dolayli
        ? `<b class="az">Yumuşak ortam ışığı.</b> Işık kaynağı görünmez, göz almaz. ${odaAd} için önerilen genel aydınlık ${aralik}: tavan profiliyle birlikte kullanın.`
        : `<b class="az">Loş.</b> ${odaAd} için önerilen ${aralik}. ${tavanda() ? 'Daha çok hat içeren bir taslak daha aydınlık olur.' : 'Bu profil vurgu ışığı verir; genel aydınlatma için tavan profiliyle birlikte kullanın.'}`,
      cok: `<b class="cok">Çok aydınlık.</b> ${odaAd} için önerilen ${aralik}; bu tasarım bunun üstünde, güçlü bir genel aydınlatma verir.`,
    }[r.durum];
    lux = `<div class="lux"><div class="lux-ust"><small>Ortalama aydınlık<br>(${dolayli ? 'yansıyan ışık, ' : ''}masa yüksekliğinde)</small>${lx(deger)}</div>${bar}<div class="lux-durum">${yorum}</div></div>`;
    if (dolayli) nasilEk = u.yer === 'gizli'
      ? `<p>Gizli profilde ışık doğrudan odaya değil duvara verilir ve odaya yansıyarak ulaşır. Işığın yaklaşık %${GIZLI_CIKIS * 100}'sinin yuvadan çıktığı kabul edilir.</p>`
      : `<p>Kartonpiyerde ışık önce kartonpiyerin kendi beyaz kavisine vurur (yansıtma %${KABUL.tavan * 100} kabul edilir), odaya buradan yansıyarak ulaşır.</p>`;
  }
  $('#hesapKisa').textContent = r.tur === 'neon' ? `${sayi(r.metre)} m` : `${sayi(Math.round(deger), 0)} lx · ${sayi(Math.round(r.lumen), 0)} lm`;
  $('#hesapGovde').innerHTML = `
    <p class="hesap-urun"><b>${u.ad}</b> · ${taslak().ad} · ${odaAd} ${sayi(durum.W)} × ${sayi(durum.D)} m</p>
    <dl class="satirlar">
      <dt>Profil uzunluğu</dt><dd>${sayi(r.metre)} m${u.boy ? ` · ${Math.ceil(r.metre / u.boy - 1e-6)} boy` : ''}</dd>
      ${r.tur === 'neon' ? '' : `<dt>Metre başına ışık</dt><dd>${sayi(r.lmM, 0)} lm/m</dd>
      <dt>Toplam ışık</dt><dd>${sayi(Math.round(r.lumen), 0)} lm</dd>
      <dt>Toplam güç</dt><dd>${sayi(Math.round(r.watt), 0)} W</dd>`}
    </dl>
    ${lux}
    ${r.tur === 'neon' ? '' : `<button class="mini-harita" data-git="plan" aria-label="Işık dağılımını büyüt"><canvas id="miniHarita"></canvas><span>Işık dağılımı (${sayi(r.duzlem * 100, 0)} cm) · büyütmek için dokunun</span></button>
    <details><summary>Hesap nasıl yapıldı?</summary>
      <p>LED şerit ${LED.volt} V · ${sayi(LED.w_m)} W/m · ${sayi(LED.lm_m, 0)} lm/m · CRI ${LED.cri}. Opal kapaktan çıkan ışık %${KABUL.opal * 100} kabul edilir: ${sayi(r.lmM, 0)} lm/m.</p>
      <p>Aydınlık, ${sayi(r.duzlem * 100, 0)} cm yükseklikte her noktaya gelen doğrudan ışık ile tavan, duvar ve zeminden yansıyan ışığın (%${KABUL.tavan * 100} / %${KABUL.duvar * 100} / %${KABUL.zemin * 100}) toplamıdır. Bu, DIALux'un varsayılan yansıma değerleriyle yapılan yaklaşık bir hesaptır; mobilya gölgesi dahil değildir.</p>
      ${nasilEk}
      <p>Önerilen değerler: IES konut aydınlatma tablosu (salon 108–215 lx, mutfak genel 215–538 lx, antre 54–108 lx).</p>
    </details>`}`;
}
// Küçük ışık dağılımı haritası (hesap kartında, gerçekçi görüntünün üstünde sürekli görünür)
function cizgiler(g, plan, sx, sz) {
  for (const noktalar of plan) {
    const n = noktalar.length;
    const boy = Math.hypot(noktalar[0][0] - noktalar[n - 1][0], noktalar[0][1] - noktalar[n - 1][1]);
    g.beginPath();
    if (n === 2 && boy < 1e-4) { g.arc(noktalar[0][0] * sx, noktalar[0][1] * sz, 3, 0, 2 * Math.PI); g.fillStyle = '#fff6e0'; g.fill(); continue; }   // dikey hat: nokta
    noktalar.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, x * sx, y * sz));
    if (n > 2 && boy < 1e-4) g.closePath();
    g.stroke();
  }
}
function miniHarita() {
  const c = $('#miniHarita'); if (!c || !sonHesap) return;
  const r = sonHesap, ust = olcekUst(r.enCok);
  const genis = 300, yuks = Math.round(genis * durum.D / durum.W);
  c.width = genis; c.height = Math.min(220, yuks);
  const sx = c.width / durum.W, sz = c.height / durum.D;
  const ara = document.createElement('canvas'); ara.width = r.nx; ara.height = r.nz;
  const ag = ara.getContext('2d'), img = ag.createImageData(r.nx, r.nz);
  for (let k = 0; k < r.izgara.length; k++) img.data.set([...renk(r.izgara[k] / ust), 255], k * 4);
  ag.putImageData(img, 0, 0);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.drawImage(ara, 0, 0, c.width, c.height);
  g.strokeStyle = '#fff6e0'; g.lineWidth = 2; g.lineJoin = 'miter';
  cizgiler(g, r.plan, sx, sz);
}
$('#hesapBas').addEventListener('click', () => {
  const acik = $('#hesapBas').getAttribute('aria-expanded') !== 'true';
  $('#hesapBas').setAttribute('aria-expanded', acik); $('#hesapGovde').hidden = !acik;
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-git]'); if (!b) return;
  if (b.dataset.git === 'plan') haritaAc(true); else sekmeSec(b.dataset.git);
});
// Büyük ışık dağılımı: gerçekçi görüntünün üstünde açılır, kapatınca görüntü aynen yerinde
let haritaAcik = false;
function haritaAc(acik) { haritaAcik = acik; $('#alanPlan').hidden = !acik; haritaCiz(); }
$('#haritaKapat').addEventListener('click', () => haritaAc(false));

// ---------------------------------------------------------------- ışık dağılımı haritası
function haritaCiz() {
  miniHarita();
  if (!haritaAcik || !sonHesap) return;
  if (sonHesap.tur === 'neon') { haritaAc(false); return; }
  const r = sonHesap, u = urun();
  const ust = olcekUst(r.enCok);
  const c = $('#haritaTuval');
  c.width = r.nx; c.height = r.nz;
  const g = c.getContext('2d'), img = g.createImageData(r.nx, r.nz);
  for (let k = 0; k < r.izgara.length; k++) {
    const [R, G, B] = renk(r.izgara[k] / ust);
    img.data.set([R, G, B, 255], k * 4);
  }
  g.putImageData(img, 0, 0);
  $('#haritaPlan').innerHTML = planSvg(durum.urun, tavanda() ? durum.taslak : '', durum.W, durum.D, r.plan.map(noktalar => ({ noktalar, ek_m: 0 })), !!u.cerceve && tavanda());
  const kenar = 0.75, TW = durum.W + 2 * kenar, TD = durum.D + 2 * kenar;
  Object.assign(c.style, { left: `${kenar / TW * 100}%`, width: `${durum.W / TW * 100}%`, top: `${kenar / TD * 100}%`, height: `${durum.D / TD * 100}%` });
  const durak = Array.from({ length: 11 }, (_, i) => `rgb(${renk(i / 10).join(',')}) ${i * 10}%`).join(',');
  $('#haritaNot').textContent = `Renkler ${sayi(r.duzlem * 100, 0)} cm yükseklikte ölçülen aydınlığı gösterir. Kırmızıya yakın = daha aydınlık.`;
  $('#olcek').innerHTML = `<div class="serit" style="background:linear-gradient(90deg,${durak})"></div>
    <div class="yazi">${[0, 0.25, 0.5, 0.75, 1].map(t => `<span>${sayi(ust * t, 0)} lx</span>`).join('')}</div>
    <div class="degerler"><span>En az <b>${sayi(Math.round(r.enAz), 0)} lx</b></span><span>Ortalama <b>${sayi(Math.round(r.ort), 0)} lx</b></span><span>En çok <b>${sayi(Math.round(r.enCok), 0)} lx</b></span></div>`;
}

// ---------------------------------------------------------------- gerçekçi görünüm (bulut renderı)
function renderAnahtar() { const [w, d] = kademe(); return `${durum.oda}-${w}x${d}_${durum.urun}_${durum.taslak}_${durum.kelvin}`; }
// 360° görüntü (10 Kas, Ahmet: "gerçekçi görünümde gezemiyor muyuz içeride"): tavan dışı ürünlerde, odanın örnek ölçüsünde,
// ürünün ilk taslağıyla ve 3000K'da tek tam küre render. Düğme yalnız dosyası olan seçimde görünür.
const pano = new Pano($('#panoTuval'));
let panoAcik = false, panoVar = '';
const panoYol = () => { const o = odaBilgi(); return tavanda() ? '' : `assets/pano/${o.id}-${o.en}x${o.boy}_${durum.urun}_3000.jpg`; };
function panoGuncelle() {
  const yol = panoYol(), dugme = $('#panoDugme'), tuval = $('#panoTuval'), not_ = $('#panoNot');
  const goster = () => {
    const var_ = panoVar === yol && !!yol, acik = var_ && panoAcik && durum.sekme === 'render';
    dugme.hidden = !var_;
    dugme.textContent = acik ? 'Oda görünümüne dön' : 'Etrafına bak · 360°';
    dugme.setAttribute('aria-pressed', acik);
    tuval.hidden = !acik; not_.hidden = !acik;
    if (acik) {
      const o = odaBilgi();
      not_.textContent = `Sürükleyerek etrafınıza bakın. 360° görüntü: ${o.ad} ${sayi(o.en)} × ${sayi(o.boy)} m · ${taslakListe()[0].ad} · 3000K`;
      pano.yukle(yol, () => pano.ciz());
    }
  };
  if (!yol) { panoVar = ''; goster(); return; }
  if (panoVar === yol) { goster(); return; }
  dugme.hidden = true; tuval.hidden = true; not_.hidden = true;
  const dene = new Image();
  dene.onload = () => { if (panoYol() === yol) { panoVar = yol; goster(); } };
  dene.src = yol;
}
$('#panoDugme').addEventListener('click', () => { panoAcik = !panoAcik; panoGuncelle(); });
function renderGoster() {
  if (durum.sekme !== 'render') return;
  panoGuncelle();
  const img = $('#renderResim'), yol = `assets/render/v8/${renderAnahtar()}.jpg`;
  if (img.dataset.yol === yol) return;
  img.dataset.yol = yol;
  img.classList.add('yukluyor');
  const yeni = new Image();
  yeni.onload = () => { if (img.dataset.yol !== yol) return; img.src = yol; img.hidden = false; $('#renderYok').hidden = true; img.classList.remove('yukluyor'); };
  yeni.onerror = () => { if (img.dataset.yol !== yol) return; img.hidden = true; $('#renderYok').hidden = false; img.classList.remove('yukluyor'); };
  yeni.src = yol;
}

// ---------------------------------------------------------------- sekmeler, ışık
function etiketYaz() {
  const [kw, kd] = kademe();
  const ek = durum.sekme === 'render' && !kademede() ? ` (görüntü ${sayi(kw)} × ${sayi(kd)} m)` : '';
  const y = yerBilgi();
  $('#etiket').textContent = `${odaBilgi().ad} ${sayi(durum.W)} × ${sayi(durum.D)} m${ek} · ${urun().ad} · ${taslak().ad} · ${durum.kelvin}K`;
  // Rozet SAĞ üstte tek kutu (sol tarafta görünüm düğmeleri + hesap kartı var; üst üste yığılmasın): yer + ürün + seçim özeti
  $('#yerRozet').innerHTML = `${yerIkon(y.id)}<span><small>Kullanım yeri</small><b>${y.ad}</b><i>${y.not}</i><em>${$('#etiket').textContent}</em></span>`;
}
function sekmeSec(ad) {
  durum.sekme = ad;
  $$('[data-sekme]').forEach(x => x.setAttribute('aria-selected', x.dataset.sekme === ad));
  $('#alanRender').hidden = ad !== 'render'; $('#alan3d').hidden = ad !== '3d';
  $('.sahne').dataset.sekme = ad;
  sahne.durdu = ad !== '3d';
  olcuYaz(); etiketYaz(); hesapCiz(); haritaCiz(); renderGoster();
  if (ad === '3d') { sahne.boyut(); ilk3d(); }
}
// 3D ilk açılışta ekran kartı gölgelendiricileri derler (zayıf bilgisayarda birkaç saniye): o sırada
// "hazırlanıyor" yazısı görünür; gerçekçi görünüm sekmesi bu yüzden hiç donmaz.
let derlendi = false;
function ilk3d() {
  if (derlendi) return;
  derlendi = true;
  const y = $('#yukleniyor'), onceki = y.hidden;
  y.textContent = '3D oda hazırlanıyor…'; y.hidden = false;
  setTimeout(() => { sahne.r.compile(sahne.sc, sahne.kam); y.hidden = onceki; y.textContent = 'Oda hazırlanıyor…'; }, 60);
}
$$('[data-sekme]').forEach(b => b.addEventListener('click', () => sekmeSec(b.dataset.sekme)));
$('#kelvinGrup').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  durum.kelvin = +b.dataset.k; sahne.kelvin = durum.kelvin; sahne.isikUygula();
  $$('#kelvinGrup button').forEach(x => x.setAttribute('aria-pressed', x === b));
  etiketYaz(); renderGoster(); if (!tavanda()) paketleriCiz();
});
$('#isikGrup').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  sahne.isiklarAcik = b.dataset.isik === '1'; sahne.isikUygula();
  $$('#isikGrup button').forEach(x => x.setAttribute('aria-pressed', x === b));
});
$('#gorunumler').addEventListener('click', e => {
  const b = e.target.closest('[data-g]'); if (!b) return;
  durum.gorunum = b.dataset.g;
  $$('#gorunumler [data-g]').forEach(x => x.setAttribute('aria-pressed', x === b));
  const gez = durum.gorunum === 'gez';
  $('#gezTuslar').hidden = !gez;
  $('#ipucu').textContent = gez ? 'Sürükleyerek etrafa bakın; W A S D / ok tuşları ya da ekrandaki tuşlarla yürüyün.' : 'Sürükleyerek döndürün, tekerlekle yaklaşın.';
  if (gez) sahne.gezAc(); else sahne.gorunum(durum.gorunum);
});
$$('#gezTuslar [data-tus]').forEach(b => {
  const bas = e => { e.preventDefault(); sahne.gezTus(b.dataset.tus, true); };
  const birak = () => sahne.gezTus(b.dataset.tus, false);
  b.addEventListener('pointerdown', bas); b.addEventListener('pointerup', birak); b.addEventListener('pointerleave', birak);
});

// ---------------------------------------------------------------- başlangıç
if (matchMedia('(max-width: 760px)').matches) {   // telefonda hesap kartı tek satır başlar (dokununca açılır)
  $('#hesapBas').setAttribute('aria-expanded', 'false'); $('#hesapGovde').hidden = true; panelAc(false);
}
odalariCiz(); urunleriCiz(); paketleriCiz(); adimSec('profil');
sekmeSec('render');
odaYenile(true);
// test/dışa aktarma için: seçimi doğrudan kur (oda ya da ürünün yeri değişirse oda yeniden kurulur)
async function sec(s) {
  if (s.oda && s.oda !== durum.oda) { const o = ODA_TIPLERI.find(x => x.id === s.oda); Object.assign(durum, { oda: o.id, W: o.en, D: o.boy }); }
  if (s.W && s.D) Object.assign(durum, { W: s.W, D: s.D });
  if (s.urun) durum.urun = s.urun;
  if (s.taslak) durum.taslak = s.taslak;
  secimDuzelt();
  odalariCiz(); olcuYaz(); urunleriCiz(); paketleriCiz();
  if (sahne.tip !== durum.oda || sahne.W !== durum.W || sahne.D !== durum.D || sahne.tavanTip !== tasarim().tavanTip) await odaYenile(true);
  else hatYenile();
}
window.__studyo = { durum, sahne, sec, sekmeSec, hesap: () => sonHesap };
