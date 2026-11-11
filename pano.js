// Profil Stüdyo v9 · 360° gerçekçi görüntü (10 Kas 2026, Ahmet: "gerçekçi görünümde gezemiyor muyuz içeride").
// Bulutta odanın ortasından alınan tam küre render, kürenin içinden izlenir: sürükleyerek bakış, tekerlek / iki parmakla yakınlaşma.
// Yürüme yoktur (her adım ayrı render ister); kalite gerçekçi görünümle aynıdır.
import * as THREE from 'three';

export class Pano {
  constructor(tuval) {
    this.tuval = tuval;
    this.r = null; this.yol = null;
    this.yatay = 0; this.dikey = 0.06;       // radyan; 0 = arka (TV) duvara bakış
    const parmak = new Map(); let aralik = 0;
    tuval.addEventListener('pointerdown', e => { tuval.setPointerCapture(e.pointerId); parmak.set(e.pointerId, [e.clientX, e.clientY]); });
    tuval.addEventListener('pointermove', e => {
      const o = parmak.get(e.pointerId); if (!o) return;
      if (parmak.size === 1) {
        const k = this.kam.fov / 72 * 0.0045;
        this.yatay -= (e.clientX - o[0]) * k;
        this.dikey = Math.max(-1.35, Math.min(1.35, this.dikey + (e.clientY - o[1]) * k));
      }
      parmak.set(e.pointerId, [e.clientX, e.clientY]);
      if (parmak.size === 2) {
        const [p, q] = [...parmak.values()], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (aralik) this.yakin(aralik / d);
        aralik = d;
      }
      this.ciz();
    });
    const birak = e => { parmak.delete(e.pointerId); aralik = 0; };
    tuval.addEventListener('pointerup', birak); tuval.addEventListener('pointercancel', birak);
    tuval.addEventListener('wheel', e => { e.preventDefault(); this.yakin(e.deltaY > 0 ? 1.08 : 0.93); }, { passive: false });
    addEventListener('resize', () => this.ciz());
  }
  kur() {                                    // ilk açılışta (ekran kartı belleği gereksiz yere tutulmasın)
    if (this.r) return;
    this.r = new THREE.WebGLRenderer({ canvas: this.tuval, antialias: true });
    this.r.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.sahne = new THREE.Scene();
    this.kam = new THREE.PerspectiveCamera(72, 1, 0.1, 100);
    const kure = new THREE.SphereGeometry(10, 64, 40); kure.scale(-1, 1, 1);
    this.mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.sahne.add(new THREE.Mesh(kure, this.mat));
  }
  // Görüntüyü yükler; hazır olunca tamam(true), dosya yoksa tamam(false)
  yukle(yol, tamam) {
    this.kur();
    if (this.yol === yol && this.mat.map) { tamam(true); this.ciz(); return; }
    this.yol = yol;
    new THREE.TextureLoader().load(yol, doku => {
      if (this.yol !== yol) { doku.dispose(); return; }
      doku.colorSpace = THREE.SRGBColorSpace;
      doku.anisotropy = this.r.capabilities.getMaxAnisotropy();
      this.mat.map?.dispose();
      this.mat.map = doku; this.mat.color.set(0xffffff); this.mat.needsUpdate = true;
      tamam(true); this.ciz();
    }, undefined, () => { if (this.yol === yol) tamam(false); });
  }
  yakin(carpan) { this.kam.fov = Math.max(28, Math.min(88, this.kam.fov * carpan)); this.kam.updateProjectionMatrix(); this.ciz(); }
  ciz() {
    if (!this.r || this.tuval.hidden) return;
    const w = this.tuval.clientWidth, h = this.tuval.clientHeight, pr = this.r.getPixelRatio();
    if (!w || !h) return;
    if (this.tuval.width !== Math.round(w * pr) || this.tuval.height !== Math.round(h * pr)) { this.r.setSize(w, h, false); this.kam.aspect = w / h; this.kam.updateProjectionMatrix(); }
    const a = this.yatay + Math.PI;          // dokunun ortası kürede -x yönüne düşer
    this.kam.lookAt(Math.cos(this.dikey) * Math.cos(a), Math.sin(this.dikey), Math.cos(this.dikey) * Math.sin(a));
    this.r.render(this.sahne, this.kam);
  }
}
