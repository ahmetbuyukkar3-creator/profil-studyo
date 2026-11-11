// Profil Stüdyo v9 (v8 + ürünün çalıştığı yer: köşe, gizli ışık, kartonpiyer, süpürgelik, mobilya, neon)
// v8: (v7 + gönye köşe + parçalı dışa aktarma) · gerçek zamanlı 3D oda (Three.js r160) + bulut render için dışa aktarma.
// Koordinat: x = oda eni (sol duvar 0), z = oda boyu (arka duvar 0, ön duvar D), y yukarı. Birim metre.
// plan.js'deki plan y'si = buradaki z (arka duvardan uzaklık); taslak geometrisi aynı fonksiyondan gelir.
import * as THREE from 'three';
import { OrbitControls } from './vendor/jsm/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/jsm/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from './vendor/jsm/lights/RectAreaLightUniformsLib.js';
import { RoomEnvironment } from './vendor/jsm/environments/RoomEnvironment.js';
import { KAVIS } from './plan.js';
import { salonOlcu, gonye, CIK } from './yer.js';

export const H = 2.8;
const R = KAVIS.R;
const DOKU = 'assets/3d/doku/';
const MODEL = 'assets/3d/model/';
const KELVIN = { 3000: 0xffc58a, 4000: 0xffe6c4 };
const ISIK_HAVUZ = 20;   // sabit alan ışığı sayısı (değişirse gölgelendirici yeniden derlenir)

RectAreaLightUniformsLib.init();

// ---------------------------------------------------------------- malzemeler
const yukleyici = new THREE.TextureLoader();
const dokuOnbellek = new Map();
function doku(ad, dosya, renkli) {
  const k = ad + dosya;
  if (!dokuOnbellek.has(k)) {
    const t = yukleyici.load(`${DOKU}${ad}/${dosya}`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (renkli) t.colorSpace = THREE.SRGBColorSpace;
    dokuOnbellek.set(k, t);
  }
  return dokuOnbellek.get(k);
}
function dokuMat(ad, tekrarX, tekrarY, ek = {}) {
  const harita = ['diff.jpg', 'nor.jpg', 'rough.jpg'].map((f, i) => {
    const t = doku(ad, f, i === 0).clone();
    t.repeat.set(tekrarX, tekrarY);
    t.needsUpdate = true;
    return t;
  });
  return new THREE.MeshStandardMaterial({ name: ad, map: harita[0], normalMap: harita[1], roughnessMap: harita[2], ...ek });
}
const M = {
  duvar: new THREE.MeshStandardMaterial({ color: 0xe9e4dc, roughness: 0.92 }),
  tavan: new THREE.MeshStandardMaterial({ color: 0xf1efea, roughness: 0.95 }),
  beyazLake: new THREE.MeshStandardMaterial({ color: 0xe8e6e1, roughness: 0.35 }),
  zeytin: new THREE.MeshStandardMaterial({ color: 0x4b5244, roughness: 0.55 }),
  siyah: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }),
  mermer: new THREE.MeshPhysicalMaterial({ color: 0xf2f1ee, roughness: 0.18, clearcoat: 0.4 }),
  celik: new THREE.MeshStandardMaterial({ color: 0xc9c9c7, roughness: 0.25, metalness: 1 }),
  pirinc: new THREE.MeshStandardMaterial({ color: 0xc89a5c, roughness: 0.3, metalness: 1 }),
  camSiyah: new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.05, clearcoat: 1 }),
  cerceve: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.5 }),
  gece: new THREE.MeshBasicMaterial({ color: 0x0d1420 }),
  hali: new THREE.MeshStandardMaterial({ color: 0xb9ad9b, roughness: 1 }),
  kapi: new THREE.MeshStandardMaterial({ color: 0x3b3833, roughness: 0.6 }),
  ayna: new THREE.MeshPhysicalMaterial({ color: 0xb9c2c6, roughness: 0.08, metalness: 0.2, clearcoat: 1 }),
  pervaz: new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.35, metalness: 0.3 }),
  aluminyum: new THREE.MeshStandardMaterial({ color: 0xc4c5c7, roughness: 0.38, metalness: 0.9 }),   // v9: eloksal gövde
  antrasit: new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.5, metalness: 0.4 }),
  kartonpiyer: new THREE.MeshStandardMaterial({ color: 0xf0eeea, roughness: 0.7 }),
};
for (const [ad, m] of Object.entries(M)) m.name = ad;   // bulut render malzemeyi adından tanır
const ciftOnbellek = new Map();
function ciftYuz(m) {   // sürülen kesitler tek katmandır: iki yüzü de görünür olmalı (ad aynı kalır)
  if (!ciftOnbellek.has(m)) { const c = m.clone(); c.name = m.name; c.side = THREE.DoubleSide; ciftOnbellek.set(m, c); }
  return ciftOnbellek.get(m);
}

// Kutu: UV'ler yüz ölçüsüne göre (doku metre ölçeğinde, gerilmez).
function kutu(w, h, d, mat, x, y, z, olcek = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const yuz = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    uv.setXY(k, uv.getX(k) * yuz[f][0] / olcek, uv.getY(k) * yuz[f][1] / olcek);
  }
  const m = new THREE.Mesh(g, mat);
  m.position.set(x + w / 2, y + h / 2, z + d / 2);   // (x, y, z) = alt-sol-arka köşe
  return m;
}

// ---------------------------------------------------------------- modeller
const gltf = new GLTFLoader();
const modelOnbellek = new Map();
function modelYukle(ad) {
  if (!modelOnbellek.has(ad)) modelOnbellek.set(ad, new Promise((ok, red) => gltf.load(`${MODEL}${ad}/${ad}.gltf`, g => ok(g.scene), undefined, red)));
  return modelOnbellek.get(ad);
}
// Modeli zemine oturtur; (x, z) taban merkezi, don = derece (0: ön yüzü +z'ye, odanın önüne bakar).
async function model(grup, ad, x, z, don = 0, y = 0) {
  try {
    const kok = (await modelYukle(ad)).clone(true);
    const sar = new THREE.Group();
    sar.add(kok);
    const kutuB = new THREE.Box3().setFromObject(kok);
    const mrk = kutuB.getCenter(new THREE.Vector3());
    kok.position.set(-mrk.x, -kutuB.min.y, -mrk.z);
    sar.position.set(x, y, z);
    sar.rotation.y = THREE.MathUtils.degToRad(don);   // Poly Haven modellerinin ön yüzü +z'ye bakar (ekranda doğrulandı)
    grup.add(sar);
    return sar;
  } catch (e) { console.warn('model yok', ad); return null; }
}

// ---------------------------------------------------------------- odalar
// Her oda tipi: mobilya ölçüye göre yerleşir. Taslak tavanda; mobilya ışık hattını engellemez.
const ODALAR = {
  salon: { ad: 'Salon', en: 5, boy: 4, zemin: 'parke', pencere: 'sol' },
  mutfak: { ad: 'Mutfak', en: 4, boy: 5, zemin: 'parke', pencere: 'sol' },
  antre: { ad: 'Antre', en: 2, boy: 4, zemin: 'tas', pencere: null },
};
export const ODA_TIPLERI = Object.entries(ODALAR).map(([id, o]) => ({ id, ad: o.ad, en: o.en, boy: o.boy }));

async function salonKur(g, W, D, cikinti) {
  // TV duvarı arka duvar; kanepe karşıda, TV'ye bakar. v9: dış köşe ürünü için TV duvarı çıkıntısı (ölçüler yer.js salonOlcu).
  const so = salonOlcu(W, D, cikinti), off = so.off;
  if (so.cik) g.add(kutu(so.cik.x1 - so.cik.x0, H + 0.12, CIK, M.duvar, so.cik.x0, 0, 0));
  const uw = Math.min(2.0, W - 1.2);
  g.add(kutu(uw, 0.42, 0.42, dokuMat('oak_veneer_01', 1, 1), W / 2 - uw / 2, 0.12, 0.02 + off, 0.8));
  g.add(kutu(uw - 0.1, 0.12, 0.36, M.siyah, W / 2 - uw / 2 + 0.05, 0, 0.05 + off));
  const tvw = Math.min(1.65, uw - 0.2);             // duvara asılı ince TV
  g.add(kutu(tvw, tvw * 0.5625, 0.03, M.camSiyah, W / 2 - tvw / 2, 0.95, 0.02 + off));
  g.add(kutu(tvw + 0.012, tvw * 0.5625 + 0.012, 0.025, M.siyah, W / 2 - tvw / 2 - 0.006, 0.944, 0.015 + off));
  const kanepeZ = Math.min(D - 0.55, Math.max(2.3, D * 0.72));
  await model(g, 'sofa_02', W / 2, kanepeZ, 180);
  g.add(kutu(Math.min(2.4, W - 1.4), 0.008, Math.min(1.7, kanepeZ - 0.9), M.hali, W / 2 - Math.min(2.4, W - 1.4) / 2, 0, kanepeZ - 0.45 - Math.min(1.7, kanepeZ - 0.9)));
  await model(g, 'modern_coffee_table_01', W / 2, kanepeZ - 1.05, 0);
  if (W >= 4) await model(g, 'modern_arm_chair_01', W - 0.65, kanepeZ - 1.1, -90);
  if (W >= 3.5) await model(g, 'side_table_01', W / 2 + 1.35, kanepeZ, 0);
  await model(g, 'potted_plant_02', W - 0.4, 0.4, 0);
}

async function mutfakKur(g, W, D) {
  const DD = 0.62, YD = DD;           // dolap derinliği, ön yüz z
  const boyVar = W >= 3.6;
  const RX1 = boyVar ? W - 1.4 : W;
  g.add(kutu(RX1, 0.1, DD - 0.06, M.siyah, 0, 0, 0));
  g.add(kutu(RX1, 0.76, DD - 0.02, M.zeytin, 0, 0.1, 0));
  const nKol = Math.max(1, Math.round(RX1 / 0.6)), kol = RX1 / nKol;
  for (let i = 0; i < nKol; i++) {
    g.add(kutu(kol - 0.006, 0.345, 0.02, M.zeytin, i * kol + 0.003, 0.103, DD - 0.02));
    g.add(kutu(kol - 0.006, 0.345, 0.02, M.zeytin, i * kol + 0.003, 0.453, DD - 0.02));
  }
  g.add(kutu(RX1, 0.04, DD + 0.02, M.mermer, 0, 0.86, 0));
  g.add(kutu(RX1, 0.62, 0.02, M.mermer, 0, 0.9, 0));
  if (RX1 >= 1.5) {
    const ex = (Math.floor(nKol / 2) + 0.5) * kol;
    g.add(kutu(0.6, 0.006, 0.42, M.celik, ex - 0.3, 0.9, 0.12));
    const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 16), M.pirinc);
    bat.position.set(ex, 1.07, 0.06); g.add(bat);
    const kol2 = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.22, 16), M.pirinc);
    kol2.rotation.x = Math.PI / 2; kol2.position.set(ex, 1.24, 0.17); g.add(kol2);
  }
  if (RX1 >= 1.4) {
    g.add(kutu(RX1 - 0.5, 0.04, 0.24, dokuMat('oak_veneer_01', 1, 1), 0.25, 1.64, 0.02, 0.8));
    await model(g, 'ceramic_vase_02', 0.25 + (RX1 - 0.5) * 0.2, 0.14, 0, 1.68);
    await model(g, 'ceramic_vase_03', 0.25 + (RX1 - 0.5) * 0.8, 0.14, 0, 1.68);
  }
  if (boyVar) {
    const oak = dokuMat('oak_veneer_01', 1, 1);
    g.add(kutu(1.4, 2.2, DD, oak, W - 1.4, 0.1, 0, 0.8));
    g.add(kutu(1.4, 0.1, DD - 0.06, M.siyah, W - 1.4, 0, 0));
    g.add(kutu(0.62, 0.58, 0.02, M.camSiyah, W - 0.67, 0.9, DD));
  }
  if (W >= 3.4 && D >= 4.4) {          // ada: arkada 1,05 m geçiş
    const AL = Math.min(2.2, W - 2.2), AD = D >= 5 ? 1.0 : 0.9;
    const az0 = DD + 1.05;
    g.add(kutu(AL - 0.06, 0.79, AD - 0.3, dokuMat('oak_veneer_01', 1, 1), W / 2 - AL / 2 + 0.03, 0.1, az0 + 0.02, 0.8));
    g.add(kutu(AL, 0.04, AD, M.mermer, W / 2 - AL / 2, 0.89, az0));
    g.add(kutu(0.03, 0.89, AD, M.mermer, W / 2 - AL / 2, 0, az0));
    g.add(kutu(0.03, 0.89, AD, M.mermer, W / 2 + AL / 2 - 0.03, 0, az0));
    g.add(kutu(0.6, 0.004, 0.45, M.camSiyah, W / 2 + AL / 2 - 0.85, 0.93, az0 + 0.1));
    const n = Math.max(1, Math.floor(AL / 0.6));
    for (let i = 0; i < n; i++) await model(g, 'bar_chair_round_01', W / 2 - AL / 2 + AL * (i + 0.5) / n, az0 + AD + 0.3, 180);
  }
}

async function antreKur(g, W, D) {
  // Giriş kapısı arka duvarda; sol duvarda konsol + ayna, sağda ayakkabılık.
  const kw = Math.min(1.0, W - 0.5);
  g.add(kutu(kw + 0.12, 2.16, 0.04, M.cerceve, W / 2 - kw / 2 - 0.06, 0, 0));
  g.add(kutu(kw, 2.1, 0.05, M.kapi, W / 2 - kw / 2, 0, 0.01));
  const tutamak = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 16), M.pirinc);
  tutamak.position.set(W / 2 + kw / 2 - 0.12, 1.05, 0.09); g.add(tutamak);
  if (W >= 1.6) {
    await model(g, 'ClassicConsole_01', 0.24, D * 0.55, 0);   // bu modelin uzun kenarı z ekseninde
    const ayna = new THREE.Mesh(new THREE.CircleGeometry(0.4, 48), M.ayna);
    ayna.rotation.y = Math.PI / 2; ayna.position.set(0.012, 1.45, D * 0.55); g.add(ayna);
    await model(g, 'potted_plant_04', 0.3, D - 0.4, 0);
  }
  if (W >= 1.9) {
    const oak = dokuMat('oak_veneer_01', 1, 1);
    g.add(kutu(0.36, 0.9, Math.min(1.4, D * 0.35), oak, W - 0.36, 0.08, 0.6, 0.8));
    g.add(kutu(0.34, 0.08, Math.min(1.4, D * 0.35) - 0.04, M.siyah, W - 0.35, 0, 0.62));
    await model(g, 'standing_picture_frame_01', W - 0.18, 0.6 + Math.min(1.4, D * 0.35) / 2, -90, 0.98);
  }
}

// ---------------------------------------------------------------- sahne
export class Sahne {
  constructor(tuval) {
    this.r = new THREE.WebGLRenderer({ canvas: tuval, antialias: true, preserveDrawingBuffer: true });
    this.r.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.r.toneMapping = THREE.AgXToneMapping ?? THREE.ACESFilmicToneMapping;
    this.sc = new THREE.Scene();
    this.sc.background = new THREE.Color(0x0b0b0c);
    const pm = new THREE.PMREMGenerator(this.r);
    this.sc.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.kam = new THREE.PerspectiveCamera(55, 1, 0.05, 80);
    this.kontrol = new OrbitControls(this.kam, tuval);
    this.kontrol.enableDamping = true;
    this.kontrol.maxPolarAngle = Math.PI * 0.95;
    this.oda = new THREE.Group(); this.sc.add(this.oda);
    this.hat = new THREE.Group(); this.sc.add(this.hat);
    this.amb = new THREE.HemisphereLight(0xfff6ea, 0x9a9184, 0.5); this.sc.add(this.amb);
    this.havuz = Array.from({ length: ISIK_HAVUZ }, () => { const l = new THREE.RectAreaLight(0xffffff, 0, 0.1, 0.02); l.userData.L = 0; this.sc.add(l); return l; });
    // Yansıyan ışık yaklaşımı: LED akısı zeminden/duvarlardan sekip tavanı ve gölgeleri aydınlatır.
    this.sekme = new THREE.HemisphereLight(0x6d665d, 0xfff1e0, 0); this.sc.add(this.sekme);
    this.isiklarAcik = true; this.kelvin = 3000;
    this.gez = { acik: false, yaw: 0, pitch: 0, tus: new Set() };
    this._gezOlaylari(tuval);
    this.duvarlar = {};
    new ResizeObserver(() => this.boyut()).observe(tuval.parentElement);
    this.boyut();
    let onceki = performance.now();
    const dongu = t => {
      const dt = Math.min(0.05, (t - onceki) / 1000); onceki = t;
      if (!this.durdu) {   // v8: 3D sekmesi görünmüyorsa çizme (zayıf bilgisayar / telefon)
        if (this.gez.acik) this._gezAdim(dt); else this.kontrol.update();
        this._duvarGizle();
        this.r.render(this.sc, this.kam);
      }
      requestAnimationFrame(dongu);
    };
    requestAnimationFrame(dongu);
  }

  boyut() {
    const e = this.r.domElement.parentElement;
    const w = e.clientWidth, h = e.clientHeight;
    if (!w || !h) return;
    // v8: sahne tam ekran oldu; zayıf ekran kartında akıcı kalsın diye çizim en fazla ~1,1 milyon piksel
    this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1.1e6 / (w * h))));
    this.r.setSize(w, h, false);
    this.kam.aspect = w / h; this.kam.updateProjectionMatrix();
  }

  // v9: tavanTip 'kavis' (v8 odası: arka duvarda kavisli geçiş) | 'duz' (düz köşeli oda; alçıpan tavan levhası ürünle
  // birlikte gelir, üstünde 12 cm boşluk) | 'cik' (düz + salon TV duvarı çıkıntısı).
  async odaKur(tip, W, D, tavanTip = 'kavis') {
    this.W = W; this.D = D; this.tip = tip; this.tavanTip = tavanTip;
    const duz = tavanTip !== 'kavis', HT = duz ? H + 0.12 : H;
    const yeni = new THREE.Group();
    const o = ODALAR[tip];
    // zemin
    const zm = o.zemin === 'tas' ? dokuMat('marble_01', W / 1.2, D / 1.2, { roughness: 0.3 }) : dokuMat('herringbone_parquet', W / 1.8, D / 1.8);
    const zemin = new THREE.Mesh(new THREE.PlaneGeometry(W, D), zm);
    zemin.rotation.x = -Math.PI / 2; zemin.position.set(W / 2, 0, D / 2); yeni.add(zemin);
    // duvarlar (her biri ayrı grup: kamera dışarıdaysa gizlenir)
    const dGrup = ad => { const gg = new THREE.Group(); gg.name = ad; yeni.add(gg); return gg; };
    const T = 0.12;
    const arka = dGrup('arka'); arka.add(kutu(W + 2 * T, duz ? HT : H - R, T, M.duvar, -T, 0, -T));
    const on = dGrup('on'); on.add(kutu(W + 2 * T, HT, T, M.duvar, -T, 0, D));
    const sag = dGrup('sag'); sag.add(kutu(T, HT, D, M.duvar, W, 0, 0));
    const sol = dGrup('sol');
    if (o.pencere === 'sol' && D >= 3) {
      const p0 = Math.max(0.6, D * 0.35), p1 = Math.min(D - 0.5, p0 + Math.min(1.8, D * 0.4));
      sol.add(kutu(T, HT, p0, M.duvar, -T, 0, 0));
      sol.add(kutu(T, HT, D - p1, M.duvar, -T, 0, p1));
      sol.add(kutu(T, 0.95, p1 - p0, M.duvar, -T, 0, p0));
      sol.add(kutu(T, HT - 2.3, p1 - p0, M.duvar, -T, 2.3, p0));
      for (const [y0, hh] of [[0.95, 0.04], [2.26, 0.04]]) sol.add(kutu(0.06, hh, p1 - p0, M.cerceve, -0.06, y0, p0));
      sol.add(kutu(0.06, 1.35, 0.04, M.cerceve, -0.06, 0.95, p0));
      sol.add(kutu(0.06, 1.35, 0.04, M.cerceve, -0.06, 0.95, p1 - 0.04));
      sol.add(kutu(0.06, 1.35, 0.04, M.cerceve, -0.06, 0.95, (p0 + p1) / 2 - 0.02));
      this.pencere = [p0, p1];
      const dis = new THREE.Mesh(new THREE.PlaneGeometry(p1 - p0, 1.35), M.gece);
      dis.rotation.y = Math.PI / 2; dis.position.set(-0.5, 1.625, (p0 + p1) / 2); sol.add(dis);
    } else { sol.add(kutu(T, HT, D, M.duvar, -T, 0, 0)); this.pencere = null; }
    // tavan + arka duvar-tavan kavisi (esnek "tavandan duvara" için)
    const tavan = dGrup('tavan');
    if (duz) tavan.add(kutu(W, 0.06, D, M.tavan, 0, HT, 0));
    else {
    tavan.add(kutu(W, 0.06, D - R, M.tavan, 0, H, R));
    const kv = new THREE.CylinderGeometry(R, R, W, 40, 1, true, 0, Math.PI / 2);
    const kavis = new THREE.Mesh(kv, new THREE.MeshStandardMaterial({ name: 'tavan', color: 0xf1efea, roughness: 0.95, side: THREE.BackSide }));
    kavis.rotation.set(0, Math.PI, Math.PI / 2);   // çeyrek: arka duvar üstü (z=0, y=H-R) ile tavan (z=R, y=H) arası
    kavis.position.set(W / 2, H - R, R);
    tavan.add(kavis);
    }
    // süpürgelik
    if (!duz) yeni.add(kutu(W, 0.07, 0.012, M.beyazLake, 0, 0, D - 0.012));
    // mobilya
    if (tip === 'salon') await salonKur(yeni, W, D, tavanTip === 'cik');
    if (tip === 'mutfak') await mutfakKur(yeni, W, D);
    if (tip === 'antre') await antreKur(yeni, W, D);
    this.sc.remove(this.oda); this.oda.traverse(m => m.geometry?.dispose());
    this.oda = yeni; this.sc.add(yeni);
    this.duvarlar = { arka, on, sag, sol, tavan };
  }

  // Taslak hatları (tavan ürünleri): [{noktalar:[[x, z], ...], ek_m}] (plan.js); isik/cerceve metre.
  hatKur(hatlar, isik, cerceve, kavisli) {
    const yollar = [];
    for (const h of hatlar) {
      const p = h.noktalar.map(([x, z]) => ({ p: new THREE.Vector3(x, H - 0.0015, z), n: new THREE.Vector3(0, -1, 0) }));
      if (kavisli) {   // tavandan kavisle arka duvara iner: plan noktası z=R'de biter
        const x = h.noktalar[0][0];
        for (let k = 1; k <= 16; k++) {
          const a = (90 - 90 * k / 16) * Math.PI / 180;
          p.push({ p: new THREE.Vector3(x, H - R + R * Math.sin(a) - 0.0015 * Math.sin(a), R - R * Math.cos(a) + 0.0015 * Math.cos(a)), n: new THREE.Vector3(0, -Math.sin(a), Math.cos(a)) });
        }
        p.push({ p: new THREE.Vector3(x, KAVIS.bitis, 0.0015), n: new THREE.Vector3(0, 0, 1) });
      }
      yollar.push({ nok: p, gen: isik, cerceve });
    }
    this._kur(yollar, [], {});
  }

  // v9: tavan dışındaki yerler (yer.js yerKur çıktısı): ışık hatları + ürünün gövdesi / alçıpan levha gibi ek parçalar.
  yerKur(s) {
    const V = a => new THREE.Vector3(a[0], a[1], a[2]);
    this._kur(s.yollar.map(y => ({ ...y, nok: y.nok.map(o => ({ p: V(o.p), n: V(o.n) })) })), s.ekler, s);
  }

  _ek(e) {
    if (e.tip === 'kutu') return kutu(e.w, e.h, e.d, M[e.mat], e.x, e.y, e.z);
    // 'sur': kesit (u = duvardan uzaklık, v = yükseklik) duvar yolu boyunca sürülür; köşede gönye
    const G = gonye(e.yol), K = e.kesit, n = K.length, poz = [], idx = [];
    for (const g of G) for (const [u, v] of K) poz.push(g.x + g.ix * g.k * u, v, g.z + g.iz * g.k * u);
    for (let i = 1; i < G.length; i++) for (let j = 1; j < n; j++) {
      const a = (i - 1) * n + j - 1, c = i * n + j - 1;
      idx.push(a, c, c + 1, a, c + 1, a + 1);
    }
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
    g.setIndex(idx);
    g = g.toNonIndexed(); g.computeVertexNormals();   // keskin kenarlar düz gölgelensin
    return new THREE.Mesh(g, ciftYuz(M[e.mat]));
  }

  _kur(yollar, ekler, s) {
    this.sc.remove(this.hat);
    this.hat.traverse(m => { m.geometry?.dispose(); });
    this.hat = new THREE.Group();
    this.hatTavan = new THREE.Group(); this.hat.add(this.hatTavan);   // alçıpan levha: kamera tavanın üstündeyken gizlenir
    this.isikMat = new THREE.MeshBasicMaterial({ name: 'LED_ISIK', color: 0xffffff, side: THREE.DoubleSide });
    this.yollar = yollar.map(y => y.nok); this.genler = yollar.map(y => y.gen);
    this.hatBilgi = { isik: yollar[0]?.gen ?? 0, cerceve: yollar[0]?.cerceve ?? 0, kam: s.kam || 'ust', poz: s.poz || 0 };
    // v7: hat çevresindeki yapay hale kaldırıldı (Ahmet: "ürünün gerçek ışık çizgisini görelim, birebir montajlanmış hali").
    // Görünen tek şey ürünün kendi opal yüzü (+ SA 0605'te kendi siyah pervazı, sıva altında kendi kanadı).
    this.haleMat = null;
    for (const e of ekler) (e.tavan ? this.hatTavan : this.hat).add(this._ek(e));
    for (const y of yollar) {
      this.hat.add(this._serit(y.nok, y.gen, 0, this.isikMat));
      if (y.cerceve) for (const sg of [-1, 1]) this.hat.add(this._serit(y.nok, y.cerceve, sg * (y.gen + y.cerceve) / 2, M[y.cerMat || 'pervaz'], 0.0003));
    }
    // Işık: SABİT sayıda alan ışığı (havuz). Sayı değişirse ekran kartı tüm malzemeleri yeniden derler ve
    // ekran saniyelerce donar; bu yüzden ışıklar bir kez kurulur, kullanılmayanın gücü 0 olur.
    let toplam = 0;
    for (const { nok } of yollar) for (let i = 1; i < nok.length; i++) toplam += nok[i].p.distanceTo(nok[i - 1].p);
    let parcalar = [], adim = Math.max(0.3, toplam / ISIK_HAVUZ);
    for (let deneme = 0; deneme < 8; deneme++, adim *= 1.35) {
      parcalar = [];
      for (const { nok: yol, gen } of yollar) {
        let bas = 0, birikim = 0;
        for (let i = 1; i < yol.length; i++) {
          birikim += yol[i].p.distanceTo(yol[i - 1].p);
          const kose = i < yol.length - 1 && new THREE.Vector3().subVectors(yol[i].p, yol[i - 1].p).normalize()
            .dot(new THREE.Vector3().subVectors(yol[i + 1].p, yol[i].p).normalize()) < 0.9;   // keskin köşe (>25°)
          if (birikim >= adim || i === yol.length - 1 || kose) { parcalar.push([yol[bas], yol[i], gen]); bas = i; birikim = 0; }
        }
      }
      if (parcalar.length <= ISIK_HAVUZ) break;
    }
    this.havuz.forEach((isik_, k) => {
      const pr = parcalar[k];
      if (!pr) { isik_.userData.L = 0; return; }
      const [a, b, isik] = pr;
      const L = a.p.distanceTo(b.p);
      const X = new THREE.Vector3().subVectors(b.p, a.p).normalize();
      const n = a.n.clone().add(b.n).normalize();
      n.addScaledVector(X, -n.dot(X)).normalize();   // v9: ışık parçası kendi doğrultusuna dik bakar (köşe çaprazı çarpıtmasın)
      const Z = n.clone().negate();                    // alan ışığı -Z yönüne yayar
      const Y = new THREE.Vector3().crossVectors(Z, X).normalize();
      isik_.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
      isik_.position.copy(a.p).add(b.p).multiplyScalar(0.5).addScaledVector(n, 0.004);
      isik_.width = Math.max(L, 0.02); isik_.height = Math.max(isik, 0.02);
      isik_.userData.L = L; isik_.userData.isik = isik;
    });
    this.alanIsiklari = this.havuz;
    this.sc.add(this.hat);
    this.isikUygula();
  }

  // v8: köşeler GÖNYE (45°) birleşir: köşede genişlik daralmaz, kapalı şekil (kare, dikdörtgen, O) başladığı
  // köşede tek parça kapanır, üst üste binme/çaprazlık olmaz. SA 0605 pervazları da aynı gönyeyle döner.
  _serit(yol, gen, kay, mat, dy = 0) {
    const poz = [], idx = [];
    const N = yol.length;
    const kapali = N > 2 && yol[0].p.distanceTo(yol[N - 1].p) < 1e-4;
    const yanVek = (a, b, n) => new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(b, a).normalize(), n).normalize();
    yol.forEach((o, i) => {
      const ia = i > 0 ? i - 1 : (kapali ? N - 2 : -1);
      const ib = i < N - 1 ? i + 1 : (kapali ? 1 : -1);
      const sGir = ia >= 0 ? yanVek(yol[ia].p, o.p, o.n) : null;
      const sCik = ib >= 0 ? yanVek(o.p, yol[ib].p, o.n) : null;
      let yan, k = 1;
      if (sGir && sCik) {
        yan = sGir.clone().add(sCik);
        if (yan.lengthSq() < 1e-8) yan = sGir.clone(); else yan.normalize();
        k = 1 / Math.max(0.25, yan.dot(sGir));          // gönye boyu: köşede bant aynı genişlikte kalır
      } else yan = sGir || sCik;
      const m = o.p.clone().addScaledVector(yan, kay * k).addScaledVector(o.n, dy);
      const a = m.clone().addScaledVector(yan, -gen / 2 * k), b = m.clone().addScaledVector(yan, gen / 2 * k);
      poz.push(a.x, a.y, a.z, b.x, b.y, b.z);
      if (i) { const k = 2 * i; idx.push(k - 2, k - 1, k + 1, k - 2, k + 1, k); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
    g.setIndex(idx);
    return new THREE.Mesh(g, mat);
  }

  isikUygula() {
    const acik = this.isiklarAcik;
    const renk = new THREE.Color(KELVIN[this.kelvin]);
    // Görsel kalibrasyon: hat başına ışık akısı (lm/m) — ekranda sayı olarak gösterilmez.
    const LM_M = 75;
    let toplam = 0;
    for (const l of this.alanIsiklari || []) {
      l.color.copy(renk);
      l.power = acik && l.userData.L ? LM_M * l.userData.L * Math.sqrt(l.userData.isik / 0.015) : 0;
      toplam += l.power;
    }
    this.sekme.groundColor.copy(renk).lerp(new THREE.Color(0xffffff), 0.6);
    this.sekme.intensity = acik ? Math.min(1.6, 0.9 * toplam / (this.W * this.D) / 40) : 0;
    if (this.haleMat) { this.haleMat.visible = acik; this.haleMat.color.copy(renk); }
    if (this.isikMat) this.isikMat.color.copy(acik ? renk.clone().lerp(new THREE.Color(0xffffff), 0.75).multiplyScalar(2.2) : new THREE.Color(0x9a9a98));
    this.amb.intensity = acik ? 0.06 : 0.9;
    this.r.toneMappingExposure = acik ? 1.0 : 0.9;
  }

  gorunum(ad) {
    const W = this.W, D = this.D;
    this.gezKapat();
    const hedef = new THREE.Vector3(W / 2, 1.25, D / 2);
    if (ad === 'oda') this.kam.position.set(W / 2, 1.5, D + 0.35 + Math.max(W, D) * 0.42);
    if (ad === 'perspektif') this.kam.position.set(W + Math.max(0.9, W * 0.25), 2.0, D + Math.max(1.2, D * 0.4));
    if (ad === 'detay') { this.kam.position.set(W * 0.62, 1.45, D * 0.78); hedef.set(W * 0.42, H, D * 0.38); }
    if (ad === 'ustten') { this.kam.position.set(W / 2, Math.max(W, D) * 1.6 + 3, D / 2 + 0.01); hedef.set(W / 2, 0, D / 2); }
    this.kontrol.target.copy(hedef);
    this.kam.lookAt(hedef);
    this.kontrol.update();
  }

  // ---------------------------------------------------------------- gezinti (birinci şahıs)
  gezAc() {
    this.gez.acik = true; this.kontrol.enabled = false;
    this.kam.position.set(this.W / 2, 1.6, this.D - 0.5);
    this.gez.yaw = 0; this.gez.pitch = 0.12;
  }
  gezKapat() { this.gez.acik = false; this.kontrol.enabled = true; }
  _gezOlaylari(tuval) {
    let surukle = null;
    tuval.addEventListener('pointerdown', e => { if (this.gez.acik) { surukle = [e.clientX, e.clientY]; tuval.setPointerCapture(e.pointerId); } });
    tuval.addEventListener('pointermove', e => {
      if (!this.gez.acik || !surukle) return;
      this.gez.yaw += (e.clientX - surukle[0]) * 0.004;
      this.gez.pitch = THREE.MathUtils.clamp(this.gez.pitch + (e.clientY - surukle[1]) * 0.004, -1.2, 1.35);
      surukle = [e.clientX, e.clientY];
    });
    tuval.addEventListener('pointerup', () => { surukle = null; });
    tuval.addEventListener('wheel', e => { if (this.gez.acik) { e.preventDefault(); this._yuru(-Math.sign(e.deltaY) * 0.25, 0); } }, { passive: false });
    addEventListener('keydown', e => { if (this.gez.acik && /^(Arrow|Key[WASD])/.test(e.code)) { this.gez.tus.add(e.code); e.preventDefault(); } });
    addEventListener('keyup', e => this.gez.tus.delete(e.code));
  }
  gezTus(kod, basili) { basili ? this.gez.tus.add(kod) : this.gez.tus.delete(kod); }
  _yuru(ileri, yana) {
    const y = this.gez.yaw;
    const p = this.kam.position;
    p.x = THREE.MathUtils.clamp(p.x + Math.sin(y) * ileri + Math.cos(y) * yana, 0.3, this.W - 0.3);
    p.z = THREE.MathUtils.clamp(p.z - Math.cos(y) * ileri + Math.sin(y) * yana, 0.3, this.D - 0.3);
  }
  _gezAdim(dt) {
    const t = this.gez.tus, v = 1.4 * dt;
    const ileri = (t.has('KeyW') || t.has('ArrowUp') ? 1 : 0) - (t.has('KeyS') || t.has('ArrowDown') ? 1 : 0);
    const yana = (t.has('KeyD') ? 1 : 0) - (t.has('KeyA') ? 1 : 0);
    const don = (t.has('ArrowRight') ? 1 : 0) - (t.has('ArrowLeft') ? 1 : 0);
    this.gez.yaw += don * 1.6 * dt;
    if (ileri || yana) this._yuru(ileri * v, yana * v);
    const yon = new THREE.Vector3(Math.sin(this.gez.yaw) * Math.cos(this.gez.pitch), Math.sin(this.gez.pitch), -Math.cos(this.gez.yaw) * Math.cos(this.gez.pitch));
    this.kam.lookAt(this.kam.position.clone().add(yon));
  }

  // Kamera odanın dışındaysa aradaki duvarı gizle (bebek evi görünümü).
  _duvarGizle() {
    const p = this.kam.position, d = this.duvarlar;
    if (!d.on) return;
    d.on.visible = p.z < this.D;
    d.arka.visible = p.z > 0;
    d.sol.visible = p.x > 0;
    d.sag.visible = p.x < this.W;
    d.tavan.visible = p.y < H;
    if (this.hatTavan) this.hatTavan.visible = p.y < H;
  }

  png() { return this.r.domElement.toDataURL('image/png'); }

  // v7: bulut render için sahnenin birebir kopyası (GLB) + kamera + LED hatları. Ekranda hiçbir şey değişmez.
  // Kameradan gizlenen duvarlar da aktarılır (adında _GIZLI): bulutta kameraya görünmez ama ışığı odada tutar.
  // v8: parca = 'hepsi' | 'oda' (sadece oda, bir kez) | 'hat' (sadece LED hattı, her seçim için birkaç KB).
  async disaAktar(parca = 'hepsi') {
    const { GLTFExporter } = await import('./vendor/jsm/exporters/GLTFExporter.js');
    const acilan = [];
    for (const [ad, g] of Object.entries(this.duvarlar)) {
      g.name = g.visible ? `duvar_${ad}` : `duvar_${ad}_GIZLI`;
      if (!g.visible) { g.visible = true; acilan.push(g); }
    }
    const nesneler = parca === 'oda' ? [this.oda] : parca === 'hat' ? [this.hat] : [this.oda, this.hat];
    let glb;
    if (this.hatTavan) this.hatTavan.visible = true;
    try { glb = await new GLTFExporter().parseAsync(nesneler, { binary: true, onlyVisible: true }); }
    finally { acilan.forEach(g => { g.visible = false; }); }
    const b = new Uint8Array(glb);
    let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    const yon = new THREE.Vector3(); this.kam.getWorldDirection(yon);
    const yukari = new THREE.Vector3(0, 1, 0).applyQuaternion(this.kam.quaternion);
    return {
      glb: btoa(s),
      bilgi: {
        tip: this.tip, W: this.W, D: this.D, H, pencere: this.pencere, tavan: this.tavanTip,
        genler: this.genler || [], kam: this.hatBilgi?.kam ?? 'ust', poz: this.hatBilgi?.poz ?? 0,
        kamera: { konum: this.kam.position.toArray(), yon: yon.toArray(), yukari: yukari.toArray(), fov: this.kam.fov, oran: this.kam.aspect },
        acik: this.isiklarAcik, kelvin: this.kelvin, isik: this.hatBilgi?.isik ?? 0, cerceve: this.hatBilgi?.cerceve ?? 0,
        yollar: (this.yollar || []).map(y => y.map(o => ({ p: o.p.toArray(), n: o.n.toArray() }))),
      },
    };
  }
}
