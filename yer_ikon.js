// Profil Stüdyo v9 · kullanım yeri simgeleri (Ahmet 10 Kas: "net anlaşılmalı hangi ürünün nerede kullanıldığı").
// Her simge odanın kesitidir (gri çizgi = tavan, duvarlar, zemin); sarı = profilin durduğu yer, soluk sarı = ışığın düştüğü yön.
const ODA = '<path class="oda-c" d="M7 7H41V31H7Z"/>';
const KOSE = (ic) => ic
  ? '<path class="oda-c" d="M24 9 6 4M24 9 42 4M24 29 6 34M24 29 42 34"/>'      // iç köşe: duvarlar bize doğru açılır
  : '<path class="oda-c" d="M24 5 6 10M24 5 42 10M24 33 6 28M24 33 42 28"/>';   // dış köşe: duvarlar geriye kaçar
const CIZIM = {
  tavan: `${ODA}<path class="isik" d="M15 8 11 20H37L33 8Z"/><path class="hat" d="M15 7H33"/>`,
  gizli: `${ODA}<path class="oda-c" d="M12 11H36"/><path class="isik" d="M7 9H12L10 22H7ZM41 9H36L38 22H41Z"/><path class="hat" d="M8.5 10.5H11.5M36.5 10.5H39.5"/>`,
  kartonpiyer: `${ODA}<path class="isik" d="M13 8H35L31 15H17Z"/><path class="hat dolu" d="M7 7H14Q8 8 7 14ZM41 7H34Q40 8 41 14Z"/>`,
  ickose: `${KOSE(true)}<path class="isik" d="M24 9 18 12V26L24 29 30 26V12Z"/><path class="hat" d="M24 9V29"/>`,
  diskose: `${KOSE(false)}<path class="isik" d="M24 5 17 9V29L24 33 31 29V9Z"/><path class="hat" d="M24 5V33"/>`,
  mobilya: `${ODA}<path class="oda-c" d="M7 12H21V16H7ZM7 24H23V31"/><path class="isik" d="M9 17H20L22 24H7Z"/><path class="hat" d="M9 17H20"/>`,
  supurgelik: `${ODA}<path class="isik" d="M8 26 20 31H8ZM40 26 28 31H40Z"/><path class="hat" d="M8.5 25.5V30.5M39.5 25.5V30.5"/>`,
  neon: `${ODA}<rect class="hat" x="16" y="13" width="16" height="10" rx="1"/>`,
};
export function yerIkon(id) {
  return `<svg class="yer-ikon" viewBox="0 0 48 38" aria-hidden="true">${CIZIM[id] || ODA}</svg>`;
}
