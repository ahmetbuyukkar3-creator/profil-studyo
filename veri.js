// Profil Stüdyo v9 · ürün verisi (10 Kas 2026: ledprofilleri.com'daki tüm profiller + süpürgelik + kartonpiyer).
// Her ürün ÇALIŞTIĞI YERE göre gruplanır (yer). Ölçü kaynakları (ayrıntı: URUN_INCELEME_v9_2026-11-10.md):
//   Trimless Y6131 15 mm (tedarikçi katalog s.6), Y6279 22 (s.7), Y6211 32 (s.9), Y6280 50 (s.10), Esnek Y6282 15 (s.5),
//   SA 0605 43,5 mm yüz = 11 siyah + 21,5 opal + 11 siyah (GMC katalog s.5),
//   İç köşe Y6245 ışık yüzü 12,7 (s.14), Dış köşe Y6246 12,7 (s.15), Gizli Z Y6273 ışık kanalı 10 (s.21),
//   Light Craft Y2973 100 × 20, kanal 15 (s.25), Kartonpiyer Y6338 75 × 70, kanal 13,4 (s.20),
//   Süpürgelik Y6336 100 × 10 (s.27), Y6231 90 × 14,5, oval 21 (s.28), Y6247 15,54 × 45,8, kanal 12,9 (s.29),
//   Sıva üstü Y6093 18,4 × 12,6 (s.47; ışık yüzü 15,6 GMC SU 0505), ince Y6261 13,04 × 7,6 (s.46),
//   Sıva altı kanatlı Y6094 24,2 × 11,2, kanal 15 (s.36), Neon Y6235 11 × 15 (s.41; açıklık 8,6 GMC N 0518),
//   Neon ince GMC N 0518-İ 7,9 × 13,5, açıklık 5,3.
// Müşteri ekranında katalog kodu / tedarikçi adı GÖSTERİLMEZ; `ic` yalnız iç kayıt içindir.
// boy = satış boyu (m): ledprofilleri.com ürün sayfası ("1 boyu 3 metredir") ya da tedarikçi kataloğu (300 cm); bilinmiyorsa null.

const HEPSI = ['salon', 'mutfak', 'antre'];

export const YERLER = [
  { id: 'tavan', ad: 'Tavanda ışık çizgisi', not: 'Alçıpan tavana gömülür, sadece ışık hattı görünür.' },
  { id: 'gizli', ad: 'Tavan kenarında gizli ışık', not: 'Işık kaynağı görünmez; duvar yumuşak ışıkla yıkanır.' },
  { id: 'kartonpiyer', ad: 'Kartonpiyer', not: 'Duvar ile tavanın birleşiminde ışıklı kartonpiyer.' },
  { id: 'ickose', ad: 'İç köşe', not: 'İki duvarın birleştiği köşede dikey ışık çizgisi.' },
  { id: 'diskose', ad: 'Dış köşe', not: 'Çıkıntılı duvar ve kolon köşesinde ışıklı kenar.' },
  { id: 'mobilya', ad: 'Raf, dolap ve banko altı', not: 'Mobilyanın altında tezgâhı ve zemini aydınlatır.' },
  { id: 'supurgelik', ad: 'Süpürgelik', not: 'Duvar dibinde yol gösteren ışık.' },
  { id: 'neon', ad: 'Neon çizgi', not: 'Duvarda ya da zeminde neon ışık çizgisi.' },
];

export const URUNLER = [
  { id: 't15', yer: 'tavan', ad: 'Trimless 15 mm', not: 'Tavanda ince, çerçevesiz ışık çizgisi', isik: 15, cerceve: 0, boy: 3, odalar: HEPSI, ic: 'Y6131' },
  { id: 't22', yer: 'tavan', ad: 'Trimless 22 mm', not: 'Biraz daha belirgin çerçevesiz çizgi', isik: 22, cerceve: 0, boy: 3, odalar: HEPSI, ic: 'Y6279' },
  { id: 't32', yer: 'tavan', ad: 'Trimless 32 mm', not: 'Geniş, güçlü ışık bandı', isik: 32, cerceve: 0, boy: 3, odalar: HEPSI, ic: 'Y6211' },
  { id: 't50', yer: 'tavan', ad: 'Trimless 50 mm', not: 'En geniş çerçevesiz ışık bandı', isik: 50, cerceve: 0, boy: 3, odalar: HEPSI, ic: 'Y6280' },
  { id: 'esnek', yer: 'tavan', ad: 'Esnek Trimless', not: 'Kavisli çizgiler: S, U, O, C', isik: 15, cerceve: 0, boy: 3, odalar: HEPSI, ic: 'Y6282' },
  { id: 'sa0605', yer: 'tavan', ad: 'Siyah Kulaklı Sıva Altı', not: 'Siyah pervazlı sıva altı ışık çizgisi', isik: 21.5, cerceve: 11, boy: 3, odalar: HEPSI, ic: 'SA 0605' },

  { id: 'gizliz', yer: 'gizli', ad: 'Gizli Alçıpan Z', not: 'Tavan ile duvar arasında gölge derzi; ışık duvardan süzülür', isik: 10, boy: 3, odalar: HEPSI, ic: 'Y6273' },
  { id: 'lightcraft', yer: 'gizli', ad: 'Light Craft', not: 'Eğimli yuvadan duvara yayılan yumuşak ışık', isik: 15, boy: 3, odalar: HEPSI, ic: 'Y2973' },

  { id: 'kartonpiyer', yer: 'kartonpiyer', ad: 'Kartonpiyer LED Profil', not: 'Işığı kendi kavisinde taşıyan kartonpiyer', isik: 13.4, boy: 3, odalar: HEPSI, ic: 'Y6338' },

  { id: 'ickose', yer: 'ickose', ad: 'İç Köşe Trimless', not: 'Köşenin içinde saklı dikey ışık çizgisi', isik: 12.7, boy: 3, odalar: ['salon', 'antre'], ic: 'Y6245' },
  { id: 'diskose', yer: 'diskose', ad: 'Dış Köşe Trimless', not: 'Duvar çıkıntısının köşesinde ışıklı kenar', isik: 12.7, boy: 3, odalar: ['salon'], ic: 'Y6246' },

  { id: 'sivaustu', yer: 'mobilya', ad: 'Sıva Üstü', not: 'Raf ve dolap altına vidalanır; kanal açmak gerekmez', isik: 15.6, govde: [18.4, 12.6], boy: 3, odalar: ['mutfak', 'salon'], ic: 'Y6093' },
  { id: 'sivaustuince', yer: 'mobilya', ad: 'Sıva Üstü İnce', not: 'İnce gövde; raf ve dolap altında göze batmaz', isik: 11, govde: [13.04, 7.6], boy: 3, odalar: ['mutfak', 'salon'], ic: 'Y6261' },
  { id: 'sivaalti', yer: 'mobilya', ad: 'Sıva Altı', not: 'Mobilyaya gömülür; yüzeyle aynı hizada kalır', isik: 15, cerceve: 4.6, gomme: true, boy: 3, odalar: ['mutfak', 'salon'], ic: 'Y6094 (aday)' },

  { id: 'sup100', yer: 'supurgelik', ad: 'Süpürgelik 100 mm', not: 'Ön yüzünde ince ışık çizgisi', isik: 10, boy: 3, odalar: ['salon', 'antre'], ic: 'Y6336' },
  { id: 'sup90', yer: 'supurgelik', ad: 'Süpürgelik 90 mm Oval', not: 'Oval alt kenarından zemine ışık', isik: 21, boy: 3, odalar: ['salon', 'antre'], ic: 'Y6231' },
  { id: 'sup45', yer: 'supurgelik', ad: 'Sıva Altı Süpürgelik', not: 'Duvar dibinde gizli; zemini yıkar', isik: 12.9, boy: 3, odalar: ['salon', 'antre'], ic: 'Y6247' },

  { id: 'neon8', yer: 'neon', ad: 'Neon Profil 8 mm', not: '8 mm neon LED için kanal', isik: 8.6, boy: 3, neon: true, odalar: ['salon', 'antre'], ic: 'Y6235' },
  { id: 'neon6', yer: 'neon', ad: 'Neon Profil 6 mm', not: 'İnce neon LED için kanal (12 / 24 V)', isik: 5.3, boy: null, neon: true, odalar: ['salon', 'antre'], ic: 'N 0518-İ' },
];

// Hazır taslaklar ürüne ve odaya göre açılır.
const DUZ = [
  { id: 'duz', ad: 'Düz' },
  { id: 'paralel', ad: '3 paralel' },
  { id: 'L', ad: 'L' },
  { id: '2L', ad: '2 L' },
  { id: 'U', ad: 'U' },
  { id: 'kare', ad: 'Kare' },
  { id: 'dikdortgen', ad: 'Dikdörtgen' },
];
const TAVAN = {
  t15: DUZ, t22: DUZ, t32: DUZ, t50: DUZ,
  esnek: [
    { id: 'S', ad: 'S' },
    { id: 'U', ad: 'U' },
    { id: 'O', ad: 'O' },
    { id: 'C', ad: 'C (yarım ay)' },
    { id: 'kavis', ad: 'Tavandan duvara' },
  ],
  sa0605: DUZ.filter(t => ['duz', 'paralel', 'L', 'kare', 'dikdortgen'].includes(t.id)),
};
const CEVRE = [
  { id: 'cevre', ad: 'Tüm çevre' },
  { id: 'arka', ad: 'Tek duvar' },
  { id: 'karsi', ad: 'Karşılıklı iki duvar' },
  { id: 'L', ad: 'Köşe (iki duvar)' },
];
const YER_TASLAK = {
  gizli: () => CEVRE,
  kartonpiyer: () => CEVRE,
  ickose: () => [{ id: 'k2', ad: 'İki köşe' }, { id: 'k4', ad: 'Dört köşe' }, { id: 'k1', ad: 'Tek köşe' }],
  diskose: () => [{ id: 'tv', ad: 'TV duvarı çıkıntısı' }],
  mobilya: oda => oda === 'mutfak'
    ? [{ id: 'raf', ad: 'Raf altı' }, { id: 'banko', ad: 'Banko altı' }, { id: 'ikisi', ad: 'Raf + banko' }]
    : [{ id: 'tvalt', ad: 'TV ünitesi altı' }],
  supurgelik: oda => oda === 'antre'
    ? [{ id: 'cevre', ad: 'Tüm çevre' }, { id: 'karsi', ad: 'İki uzun duvar' }]
    : [{ id: 'cevre', ad: 'Tüm çevre' }, { id: 'L', ad: 'Köşe (iki duvar)' }],
  neon: oda => oda === 'salon'
    ? [{ id: 'cerceve', ad: 'TV çerçevesi' }, { id: 'dikey', ad: 'Dikey çizgiler' }]
    : [{ id: 'zemin', ad: 'Zeminde yol hattı' }],
};
export function taslaklar(urunId, oda) {
  const u = URUNLER.find(x => x.id === urunId);
  return u.yer === 'tavan' ? TAVAN[urunId] : YER_TASLAK[u.yer](oda);
}
// Bulut renderı için: [oda, urun, taslak] üçlüleri (tavan dışı ürünler)
export function yerIsleri() {
  const out = [];
  for (const u of URUNLER) if (u.yer !== 'tavan') for (const oda of u.odalar) for (const t of taslaklar(u.id, oda)) out.push([oda, u.id, t.id]);
  return out;
}
