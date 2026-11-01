// Gemeinsame GLSL-Funktionen für weiche Szenenwechsel (kern.js und iso.js):
//   wolken     Kamera fliegt durch eine Wolkenwand: Wolken ziehen zu, A wird groß, B taucht aus den Wolken auf
//   blasen     Blasen steigen von unten auf, wachsen zusammen und geben B frei (heller Rand, Glanzpunkt)
//   zoomwisch  A zoomt mit Zoom-Unschärfe ins Bild, eine weiche Lichtkante wischt B mit Bewegungsunschärfe herein
// Vor dem Einbinden muss die Einbettung UE_LIES(tex, uv) → vec3 (Bild im sRGB-Raum) und UE_FARBE(c) definieren.
// Alles hängt nur von p (0..1) ab: deterministisch.

/** Namen → Nummer im Shader (gemeinsam für beide Bühnen) */
export const UEBERGANG_NR = { wolken: 10, blasen: 11, zoomwisch: 12 };

export const UEBERGANG_GLSL = /* glsl */ `
float ue_h21(vec2 q) { q = fract(q * vec2(123.34, 456.21)); q += dot(q, q + 45.32); return fract(q.x * q.y); }
float ue_rausch(vec2 q) {
  vec2 i = floor(q), f = fract(q); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(ue_h21(i), ue_h21(i + vec2(1.0, 0.0)), u.x), mix(ue_h21(i + vec2(0.0, 1.0)), ue_h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float ue_fbm(vec2 q) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * ue_rausch(q); q = q * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }

// Wolken: p 0..0.5 ziehen zu (A zoomt hinein), ab 0.5 lösen sie sich auf (B kommt aus 1.12 → 1.0)
vec3 ue_wolken(sampler2D tA, sampler2D tB, vec2 uv, float p, float aspekt, vec2 mitte, vec3 hell, vec3 schatten) {
  float e = p * p * (3.0 - 2.0 * p);
  vec2 q = (uv - 0.5) * vec2(aspekt, 1.0);
  float zuA = 1.0 + e * 0.45;
  float zuB = 1.12 - 0.12 * e;
  vec3 a = UE_LIES(tA, mitte + (uv - mitte) / zuA);
  vec3 b = UE_LIES(tB, mitte + (uv - mitte) / zuB);
  vec3 bild = p < 0.5 ? a : b;
  // zwei Wolkenebenen mit Parallaxe (vorne schneller und größer)
  float n1 = ue_fbm(q * 2.2 + vec2(0.0, -p * 1.4));
  float n2 = ue_fbm(q * 3.6 + vec2(4.0, -p * 2.6));
  float n = mix(n1, n2, 0.45);
  float rand = 0.32 * length(q * vec2(1.0, 0.8)); // Ränder zuerst zu
  float bedeckung = 1.0 - abs(p - 0.5) * 2.0;   // 0 → 1 → 0
  float schwelle = 1.08 - bedeckung * 1.35 - rand * (1.0 - bedeckung);
  float m = smoothstep(schwelle - 0.10, schwelle + 0.06, n + rand * 0.25);
  m = max(m, smoothstep(0.82, 1.0, bedeckung));
  float licht = smoothstep(0.25, 0.85, ue_fbm(q * 4.4 + vec2(9.0, -p * 1.8)) + (0.5 - uv.y) * 0.25);
  vec3 wolke = mix(UE_FARBE(schatten), UE_FARBE(hell), licht);
  // feiner heller Saum an der Wolkenkante
  float saum = smoothstep(0.0, 0.5, m) * (1.0 - smoothstep(0.5, 1.0, m));
  return mix(bild, wolke, m) + saum * 0.12;
}

// Blasen: Raster aus Blasen, die von unten nach oben (mit Zufallsversatz) wachsen; innen B, außen A
vec3 ue_blasen(sampler2D tA, sampler2D tB, vec2 uv, float p, float aspekt, vec3 randFarbe) {
  vec2 q = vec2(uv.x * aspekt, uv.y) * 7.0; // ca. 4 × 7 Zellen
  vec2 zelle = floor(q);
  float innen = 0.0, ring = 0.0, glanz = 0.0;
  vec2 verzug = vec2(0.0);
  for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
    vec2 z = zelle + vec2(float(dx), float(dy));
    vec2 m = z + 0.25 + 0.5 * vec2(ue_h21(z), ue_h21(z + 7.1));
    float start = (z.y / 7.0) * 0.45 + ue_h21(z + 3.3) * 0.2; // unten zuerst
    float k = clamp((p - start) / 0.38, 0.0, 1.0);
    float r = (1.0 - pow(1.0 - k, 3.0)) * (0.95 + 0.35 * ue_h21(z + 1.9));
    m.y += k * 0.6;                                       // steigen auf
    float d = length(q - m);
    innen = max(innen, smoothstep(r, r - 0.06, d));
    ring = max(ring, smoothstep(0.09, 0.0, abs(d - r + 0.04)) * step(0.001, r) * (1.0 - k * 0.6));
    vec2 g = m + vec2(-0.32, 0.32) * r;
    glanz = max(glanz, smoothstep(0.16 * r + 0.01, 0.0, length(q - g)) * step(0.05, r));
    verzug += (q - m) * smoothstep(r + 0.4, r, d) * 0.012 * (1.0 - k);
  }
  vec3 a = UE_LIES(tA, uv + verzug * vec2(1.0 / aspekt, 1.0) * 0.15);
  vec3 b = UE_LIES(tB, 0.5 + (uv - 0.5) * (1.0 - 0.06 * (1.0 - p)));
  vec3 col = mix(a, b, innen);
  col = mix(col, UE_FARBE(randFarbe), ring * 0.85);
  col += glanz * 0.55;
  return col;
}

// Zoom-Wisch: A stürzt zur Mitte (Zoom-Unschärfe), eine schräge Lichtkante bringt B mit Bewegungsunschärfe
vec3 ue_zoomwisch(sampler2D tA, sampler2D tB, vec2 uv, float p, float aspekt, vec2 mitte, vec2 richtung, vec3 licht) {
  vec2 dir = normalize(richtung);
  vec2 q = (uv - 0.5) * vec2(aspekt, 1.0);
  float s = dot(q, dir) + 0.22 * dot(q, vec2(-dir.y, dir.x));
  float front = mix(-1.0, 1.0, p);
  float x = front - s;
  float zA = p * 0.9;
  vec3 a = vec3(0.0);
  for (int i = 0; i < 10; i++) { float f = 1.0 - zA * 0.06 * float(i); a += UE_LIES(tA, mitte + (uv - mitte) * f / (1.0 + p * 0.6)); }
  a /= 10.0;
  vec3 b = vec3(0.0);
  float schmier = (1.0 - p) * 0.08;
  vec2 d = dir * vec2(1.0 / aspekt, 1.0);
  for (int i = 0; i < 8; i++) { b += UE_LIES(tB, uv - d * schmier * float(i) / 7.0); }
  b /= 8.0;
  float m = smoothstep(-0.02, 0.06, x);
  vec3 col = mix(a, b, m);
  float kante = exp(-pow(x / 0.05, 2.0)) * (1.0 - smoothstep(0.85, 1.0, p));
  return col + UE_FARBE(licht) * kante * 0.9;
}
`;
