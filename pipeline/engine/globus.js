// Punkte-Globus: glänzende Kugel, Landmassen als Noppen (Instancing), leuchtende Lichtpunkte,
// Ringe und Lichtstrahlen für „Ereignisse“. Datenbasis: engine/daten/globus-punkte.json.
import * as THREE from "three";

/** Breiten-/Längengrad → Punkt auf der Kugel (lon 0 / lat 0 zeigt nach +z) */
export function latLon(lat, lon, r = 1, ziel = new THREE.Vector3()) {
  const p = (lat * Math.PI) / 180;
  const l = (lon * Math.PI) / 180;
  return ziel.set(r * Math.cos(p) * Math.sin(l), r * Math.sin(p), r * Math.cos(p) * Math.cos(l));
}

const ATMO_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const ATMO_FRAG = /* glsl */ `
uniform vec3 farbe; uniform float staerke; uniform float potenz;
varying vec3 vN; varying vec3 vV;
void main() {
  float f = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), potenz);
  gl_FragColor = vec4(farbe * f * staerke, 1.0);
}`;
const HALO_FRAG = /* glsl */ `
uniform vec3 farbe; uniform float staerke;
varying vec3 vN; varying vec3 vV;
void main() {
  float d = dot(vN, vV);
  float f = pow(clamp(d, 0.0, 1.0), 5.0) * 1.0;
  gl_FragColor = vec4(farbe * f * staerke, 1.0);
}`;

export class PunktGlobus {
  /**
   * @param {{punkte:Array, abstand:number}} daten  aus globus-punkte.json
   */
  constructor(daten, {
    ozean = "#1E50D2", noppe = "#F2F6FF", noppenGroesse = 0.42, atmosphaere = "#6FA8FF",
    segmente = 128,
  } = {}) {
    this.gruppe = new THREE.Group();
    this.punkte = daten.punkte.map(([lat, lon, region], i) => ({ i, lat, lon, region, pos: latLon(lat, lon, 1), n: latLon(lat, lon, 1).normalize() }));
    const abstandRad = (daten.abstand * Math.PI) / 180;

    // Ozean: glänzende Kugel
    this.ozeanMat = new THREE.MeshPhysicalMaterial({ color: ozean, roughness: 0.5, metalness: 0.0, clearcoat: 0.35, clearcoatRoughness: 0.35 });
    this.ozean = new THREE.Mesh(new THREE.SphereGeometry(1, segmente, segmente >> 1), this.ozeanMat);
    this.gruppe.add(this.ozean);

    // Land-Noppen
    const r = abstandRad * noppenGroesse;
    const noppenGeo = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    noppenGeo.scale(r, r * 0.9, r);
    this.noppen = new THREE.InstancedMesh(noppenGeo, new THREE.MeshStandardMaterial({ color: noppe, roughness: 0.45 }), this.punkte.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const oben = new THREE.Vector3(0, 1, 0);
    const eins = new THREE.Vector3(1, 1, 1);
    this.punkte.forEach((p, i) => {
      q.setFromUnitVectors(oben, p.n);
      m4.compose(p.n.clone().multiplyScalar(0.997), q, eins);
      this.noppen.setMatrixAt(i, m4);
    });
    this.noppen.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.punkte.length * 3).fill(1), 3);
    this.gruppe.add(this.noppen);

    // Atmosphäre (Rand-Leuchten hinter der Kugel) und weicher Glanz vorne
    this.atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 96, 48),
      new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        uniforms: { farbe: { value: new THREE.Color(atmosphaere) }, staerke: { value: 1.25 }, potenz: { value: 3.2 } },
        side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      })
    );
    this.rand = new THREE.Mesh(
      new THREE.SphereGeometry(1.004, 96, 48),
      new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        uniforms: { farbe: { value: new THREE.Color(atmosphaere) }, staerke: { value: 0.45 }, potenz: { value: 3.5 } },
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      })
    );
    this.halo = this.atmo; // Außenring wird nicht mitgedreht (Kugel ist symmetrisch)

    // Lichtpunkte, Ringe, Strahlen (Instancing, Anzahl je Bild)
    const max = this.punkte.length;
    const lichtGeo = new THREE.SphereGeometry(1, 12, 8);
    this.lichter = new THREE.InstancedMesh(lichtGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), max);
    this.lichter.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.lichter.count = 0;
    this.lichter.frustumCulled = false;

    const ringGeo = new THREE.RingGeometry(0.72, 1, 40);
    this.ringe = new THREE.InstancedMesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), max);
    this.ringe.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.ringe.count = 0;
    this.ringe.frustumCulled = false;

    const strahlGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
    strahlGeo.translate(0, 0.5, 0);
    const farben = [];
    const pos = strahlGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const f = 1 - pos.getY(i);
      farben.push(f, f, f);
    }
    strahlGeo.setAttribute("color", new THREE.Float32BufferAttribute(farben, 3));
    this.strahlen = new THREE.InstancedMesh(strahlGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }), max);
    this.strahlen.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.strahlen.count = 0;
    this.strahlen.frustumCulled = false;

    this.gruppe.add(this.lichter, this.ringe, this.strahlen, this.rand);
    this.wurzel = new THREE.Group();
    this.wurzel.add(this.gruppe, this.atmo);
    this._m4 = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this._p = new THREE.Vector3();
    this._c = new THREE.Color();
    this._oben = new THREE.Vector3(0, 1, 0);
    this._vorne = new THREE.Vector3(0, 0, 1);
  }

  /** Drehung, die (lat, lon) zur Kamera (+z) zeigt */
  drehungZu(lat, lon) {
    return { x: (lat * Math.PI) / 180, y: (-lon * Math.PI) / 180 };
  }
  setzeDrehung(x, y) {
    this.gruppe.rotation.set(x, y, 0, "XYZ");
  }

  /**
   * Lichter für dieses Bild setzen.
   * liste: [{ i: Punktindex, groesse: 0..∞, farbe: THREE.Color (HDR), ring: 0..1 Fortschritt|undefined, ringFarbe, strahl: 0..1|undefined }]
   */
  setzeLichter(liste, { lichtGroesse = 0.0165, ringGroesse = 0.085, strahlHoehe = 0.22, strahlBreite = 0.0035 } = {}) {
    let a = 0, b = 0, c = 0;
    const m4 = this._m4, q = this._q, s = this._s, p = this._p;
    for (const l of liste) {
      const pt = this.punkte[l.i];
      if (l.groesse > 0.001) {
        p.copy(pt.n).multiplyScalar(1.006);
        s.setScalar(lichtGroesse * l.groesse);
        q.identity();
        m4.compose(p, q, s);
        this.lichter.setMatrixAt(a, m4);
        this.lichter.setColorAt(a, l.farbe);
        a++;
      }
      if (l.ring !== undefined && l.ring > 0 && l.ring < 1) {
        p.copy(pt.n).multiplyScalar(1.004);
        q.setFromUnitVectors(this._vorne, pt.n);
        const g = ringGroesse * (0.2 + 0.8 * Math.sqrt(l.ring));
        s.set(g, g, g);
        m4.compose(p, q, s);
        this.ringe.setMatrixAt(b, m4);
        this._c.copy(l.ringFarbe || l.farbe).multiplyScalar((1 - l.ring) ** 1.5 * 0.9);
        this.ringe.setColorAt(b, this._c);
        b++;
      }
      if (l.strahl !== undefined && l.strahl > 0) {
        p.copy(pt.n).multiplyScalar(1.0);
        q.setFromUnitVectors(this._oben, pt.n);
        s.set(strahlBreite, strahlHoehe * l.strahl, strahlBreite);
        m4.compose(p, q, s);
        this.strahlen.setMatrixAt(c, m4);
        this._c.copy(l.strahlFarbe || l.farbe).multiplyScalar(0.55 * (l.strahlHell ?? 1));
        this.strahlen.setColorAt(c, this._c);
        c++;
      }
    }
    for (const [mesh, n] of [[this.lichter, a], [this.ringe, b], [this.strahlen, c]]) {
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
}
