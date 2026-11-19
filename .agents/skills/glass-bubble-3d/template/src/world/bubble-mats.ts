// Shaders of the bubble film: the thin-film soap/glass shell, the hardened glass planet, the dark
// studio backdrop and the glossy studio floor. Every per-frame change is a uniform.
import * as THREE from "three";
import { FACE, FACE_SRC, NOISE_GLSL } from "./mats";

// crack: a jagged hairline on the upper-right front of the shell (sphere-local coordinates)
const CRACK_GLSL = /* glsl */ `
uniform float uCrack, uCrackGold;
float crackLine(vec3 p){
  vec3 C = normalize(vec3(0.5, 0.52, 0.69));
  if (dot(p, C) < 0.55) return 0.0;
  vec3 u = normalize(cross(vec3(0.0, 1.0, 0.0), C));
  vec3 v = cross(C, u);
  vec2 q = vec2(dot(p, u), dot(p, v));
  float L = uCrack * 0.42;
  float x = q.x;
  float f = 0.05 * sin(x * 13.0 + 0.6) + 0.024 * sin(x * 37.0 + 1.3) + 0.012 * sin(x * 83.0);
  float d = abs(q.y - f);
  float m = smoothstep(L, L - 0.03, abs(x + 0.04));
  // a short branch
  float fb = -0.6 * (x - 0.08) + 0.02 * sin(x * 51.0);
  float db = abs(q.y - f - fb);
  float mb = step(0.08, x) * smoothstep(0.08 + L * 0.5, 0.06 + L * 0.5 - 0.02, x) * step(0.3, uCrack);
  float w = 0.0045;
  return max((1.0 - smoothstep(w * 0.4, w, d)) * m, (1.0 - smoothstep(w * 0.3, w * 0.8, db)) * mb * 0.8);
}`;

const THIN_FILM = /* glsl */ `
vec3 thinFilm(float cosT, float d){
  float n = 1.33;
  float cosR = sqrt(max(0.0, 1.0 - (1.0 - cosT * cosT) / (n * n)));
  float opd = 2.0 * n * d * cosR;
  vec3 lam = vec3(650.0, 530.0, 460.0);
  return 0.5 + 0.5 * cos(6.2831853 * opd / lam + vec3(0.0, 0.4, 0.9));
}`;

const SHELL_VERT = /* glsl */ `
${NOISE_GLSL}
${FACE_SRC()}
uniform float uTime, uWob, uRipple;
varying vec3 vN, vW, vP; varying float vK;
void main(){
  vec3 p = position;
  float n = noise3(p * 1.6 + vec3(0.0, uTime * 0.35, uTime * 0.2));
  float n2 = noise3(p * 3.1 - vec3(uTime * 0.5));
  float w = min(uWob, 2.5);
  float disp = (n - 0.5) * 0.028 * (0.5 + w) + (n2 - 0.5) * 0.014 * w + uRipple * 0.018 * sin(p.y * 7.0 - uTime * 11.0);
  p *= 1.0 + disp;
  vP = position;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
  vK = faceKeep(gl_Position);
}`;

// The soap/glass film: additive light (premultiplied, alpha = brightest channel).
export const shellMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uWob: { value: 0 }, uRipple: { value: 0 }, uAlpha: { value: 1 }, uCrack: { value: 0 }, uCrackGold: { value: 0 }, uStress: { value: 0 }, uInside: { value: 0 }, ...FACE },
    vertexShader: SHELL_VERT,
    fragmentShader: /* glsl */ `
      ${NOISE_GLSL}
      ${THIN_FILM}
      ${CRACK_GLSL}
      uniform float uTime, uAlpha, uStress, uInside;
      varying vec3 vN, vW, vP; varying float vK;
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
        float cosT = clamp(abs(dot(N, V)), 0.0, 1.0);
        float fres = pow(1.0 - cosT, 2.4);
        float sw = fbm(vP * 1.3 + vec3(uTime * 0.05, -uTime * 0.11, uTime * 0.03));
        float thick = (200.0 + 560.0 * sw) * mix(1.3, 0.62, vP.y * 0.5 + 0.5) * (1.0 - 0.18 * uStress);
        vec3 film = pow(thinFilm(cosT, thick), vec3(1.7));
        float fr2 = gl_FrontFacing ? 1.0 : 0.45;
        vec3 col = film * (0.012 + 0.78 * fres) * fr2 * mix(1.0, 0.6, uInside);
        vec3 R = reflect(-V, N);
        float h1 = pow(max(dot(R, normalize(vec3(-0.55, 0.65, 0.5))), 0.0), 60.0) * 1.7;
        float h1s = pow(max(dot(R, normalize(vec3(-0.55, 0.65, 0.5))), 0.0), 10.0) * 0.06;
        float h2 = pow(max(dot(R, normalize(vec3(0.85, 0.15, -0.25))), 0.0), 22.0) * 0.55;
        col += vec3(1.0, 0.97, 0.93) * (h1 + h1s) * (1.0 - uInside * 0.8) + vec3(0.55, 0.8, 1.0) * h2;
        col += vec3(0.32, 0.72, 1.0) * pow(1.0 - cosT, 7.0) * 0.55;
        float c = crackLine(normalize(vP));
        col += mix(vec3(1.0, 0.96, 0.92) * 1.6, vec3(1.0, 0.72, 0.2) * 2.0, uCrackGold) * c;
        vec3 oc = col * uAlpha * vK;
        gl_FragColor = vec4(oc, clamp(max(oc.r, max(oc.g, oc.b)), 0.0, 1.0));
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.DoubleSide,
  });

// The hardened planet: deep navy glass with an iridescent rim, gold meridians, glowing market dots and
// the crack sealed in gold. Normal blending, opacity uHard.
export const planetMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uWob: { value: 0 }, uRipple: { value: 0 }, uHard: { value: 0 }, uCrack: { value: 0 }, uCrackGold: { value: 1 }, uGrid: { value: 0 }, ...FACE },
    vertexShader: SHELL_VERT,
    fragmentShader: /* glsl */ `
      ${NOISE_GLSL}
      ${THIN_FILM}
      ${CRACK_GLSL}
      uniform float uTime, uHard, uGrid;
      varying vec3 vN, vW, vP; varying float vK;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        vec3 N = normalize(vN);
        float cosT = clamp(dot(N, V), 0.0, 1.0);
        vec3 L = normalize(vec3(-0.55, 0.65, 0.5));
        float dif = max(dot(N, L), 0.0);
        vec3 p = normalize(vP);
        float n = fbm(p * 2.2 + 3.0);
        vec3 base = mix(vec3(0.02, 0.05, 0.16), vec3(0.08, 0.03, 0.17), smoothstep(0.35, 0.7, n));
        base += vec3(0.01, 0.08, 0.14) * smoothstep(0.55, 0.8, fbm(p * 4.0 - 1.0));
        vec3 col = base * (0.45 + 0.9 * dif);
        // iridescent rim (the film lives on in the glass)
        vec3 film = pow(thinFilm(cosT, 300.0 + 400.0 * n), vec3(1.6));
        col += film * pow(1.0 - cosT, 2.6) * 0.95;
        // gold meridians and parallels
        float lat = asin(clamp(p.y, -1.0, 1.0)), lon = atan(p.z, p.x);
        float gl = max(1.0 - smoothstep(0.0, 0.018, abs(fract(lat / 0.3927 + 0.5) - 0.5) * 0.3927),
                       1.0 - smoothstep(0.0, 0.018 / max(0.2, cos(lat)), abs(fract(lon / 0.5236 + 0.5) - 0.5) * 0.5236));
        col += vec3(1.0, 0.74, 0.28) * gl * 0.55 * uGrid;
        // market dots
        vec2 cell = floor(vec2(lon * 6.0, lat * 7.0));
        vec2 fc = fract(vec2(lon * 6.0, lat * 7.0)) - 0.5;
        float on = step(0.55, h21(cell));
        float dot1 = (1.0 - smoothstep(0.03, 0.09, length(fc))) * on * (0.7 + 0.3 * h21(cell + 7.0));
        col += mix(vec3(0.37, 0.9, 1.0), vec3(1.0, 0.78, 0.3), h21(cell + 3.0)) * dot1 * 1.3 * uGrid;
        // key highlight
        vec3 R = reflect(-V, N);
        col += vec3(1.0, 0.97, 0.93) * pow(max(dot(R, L), 0.0), 50.0) * 1.3;
        col += vec3(1.0, 0.72, 0.2) * 2.0 * crackLine(p);
        gl_FragColor = vec4(col, uHard);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });

// Dark studio: navy-black with a big soft softbox glow up-left and a faint magenta wash low right.
export const studioMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uGold: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${NOISE_GLSL}
      uniform float uTime, uGold; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        vec3 col = mix(vec3(0.004, 0.006, 0.016), vec3(0.014, 0.024, 0.07), smoothstep(-0.4, 0.9, d.y));
        float sb = pow(max(dot(d, normalize(vec3(-0.5, 0.55, -0.67))), 0.0), 6.0);
        col += vec3(0.03, 0.07, 0.14) * sb;
        float mg = pow(max(dot(d, normalize(vec3(0.7, -0.2, -0.68))), 0.0), 5.0);
        col += vec3(0.13, 0.02, 0.1) * mg;
        float n = fbm(d * 3.0 + vec3(uTime * 0.01, 0.0, 0.0));
        col *= 0.8 + 0.4 * n;
        col += vec3(0.12, 0.07, 0.0) * uGold * pow(max(dot(d, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false,
  });

// Glossy studio floor: a soft iridescent reflection pool under the bubble and a faint ring grid.
export const floorMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uGold: { value: 0 }, uR: { value: 4 } },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uGold, uR; varying vec3 vW;
      void main(){
        float r = length(vW.xz);
        float pool = exp(-pow(r / (uR * 1.15), 2.0));
        float a = atan(vW.z, vW.x);
        vec3 iri = 0.5 + 0.5 * cos(vec3(0.0, 2.1, 4.2) + a * 2.0 + uTime * 0.3);
        vec3 col = mix(vec3(0.25, 0.55, 1.0), iri, 0.5) * pool * 0.07 + vec3(1.0, 0.7, 0.2) * pool * 0.12 * uGold;
        float ring = (1.0 - smoothstep(0.0, 0.05, abs(fract(r / 2.0) - 0.5) * 2.0 - 0.95)) * exp(-r / 22.0) * 0.0;
        col += vec3(0.1, 0.25, 0.5) * ring;
        float fade = exp(-r / 26.0);
        gl_FragColor = vec4(col * fade, 1.0);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
  });
