// Shader materials for the Cosmos world. Every per-frame change is a uniform; geometry is built once.
import * as THREE from "three";

const NOISE = /* glsl */ `
float hash13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float noise3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x),mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*noise3(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
`;

// Shared screen-space protection of the presenter's face (SIDE): points inside the box fade out.
// uFace = (x0, y0, x1, y1) in output px; uFaceK 0..1. The same uniform objects are in every material.
export const FACE = { uFace: { value: new THREE.Vector4(-9, -9, -9, -9) }, uFaceK: { value: 0 } };
const FACE_GLSL = /* glsl */ `
uniform vec4 uFace; uniform float uFaceK;
float faceKeep(vec4 clip){
  vec2 ndc = clip.xy / max(1e-4, abs(clip.w));
  vec2 px = vec2((ndc.x + 1.0) * 540.0, (1.0 - ndc.y) * 960.0);
  vec2 d = max(uFace.xy - px, px - uFace.zw);
  return 1.0 - uFaceK * (1.0 - smoothstep(0.0, 110.0, max(d.x, d.y)));
}`;

// Additive glowing points: per-point world size (diameter), colour, alpha. uScale = 960 / tan(fov/2).
export const NOISE_GLSL = NOISE;
export const FACE_SRC = () => FACE_GLSL;
export const glowMaterial = (opts: { maxSize?: number; soft?: boolean; near?: number; gas?: boolean } = {}) =>
  new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 2500 }, uFog: { value: 0 }, uOpacity: { value: 1 }, uMax: { value: opts.maxSize ?? 300 }, uNear: { value: opts.near ?? 0 }, ...FACE },
    vertexShader: /* glsl */ `
      ${FACE_GLSL}
      attribute float size; attribute float alpha; attribute vec3 aColor;
      uniform float uScale, uFog, uMax, uNear;
      varying vec3 vC; varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = max(0.001, -mv.z);
        float s = size * uScale / d;
        vA = alpha * exp(-pow(uFog * d, 2.0));
        if (uNear > 0.0) vA *= smoothstep(uNear * 0.4, uNear, d);
        vA *= faceKeep(gl_Position);
        if (s < 1.6) { vA *= s / 1.6; s = 1.6; }
        gl_PointSize = min(s, uMax);
        vC = aColor;
      }`,
    fragmentShader: opts.gas
      ? /* glsl */ `
      uniform float uOpacity; varying vec3 vC; varying float vA;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        if (r > 1.0) discard;
        float a = exp(-r * r * 3.2) * (1.0 - r);
        vec3 oc = vC * a * vA * uOpacity; gl_FragColor = vec4(oc, clamp(max(oc.r, max(oc.g, oc.b)), 0.0, 1.0));
        #include <colorspace_fragment>
      }`
      : opts.soft
      ? /* glsl */ `
      uniform float uOpacity; varying vec3 vC; varying float vA;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        if (r > 1.0) discard;
        float a = smoothstep(1.0, 0.72, r) * 0.55 + smoothstep(0.95, 0.85, r) * 0.12 + (1.0 - r) * 0.12;
        vec3 oc = vC * a * vA * uOpacity; gl_FragColor = vec4(oc, clamp(max(oc.r, max(oc.g, oc.b)), 0.0, 1.0));
        #include <colorspace_fragment>
      }`
      : /* glsl */ `
      uniform float uOpacity; varying vec3 vC; varying float vA;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        if (r > 1.0) discard;
        float a = exp(-r * r * 4.0) * 0.5 + exp(-r * r * 30.0) * 1.0;
        vec3 oc = vC * a * vA * uOpacity; gl_FragColor = vec4(oc, clamp(max(oc.r, max(oc.g, oc.b)), 0.0, 1.0));
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
  });

// Text on a card (normal blending). Glitch: RGB split + slice offsets, tinted magenta.
export const textMaterial = (map: THREE.Texture) =>
  new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uOpacity: { value: 1 }, uGlitch: { value: 0 }, uTime: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) }, uFog: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying float vD;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float uOpacity, uGlitch, uTime, uFog; uniform vec3 uTint;
      varying vec2 vUv; varying float vD;
      float h(float x){ return fract(sin(x * 91.7) * 43758.5453); }
      void main(){
        vec2 uv = vUv;
        float row = floor(uv.y * 11.0), tk = floor(uTime * 18.0);
        float on = step(0.55, h(row * 3.1 + tk));
        uv.x += (h(row + tk * 1.3) - 0.5) * 0.16 * uGlitch * on;
        float sp = 0.012 * uGlitch;
        vec4 c = texture2D(map, uv);
        float rr = texture2D(map, uv + vec2(sp, 0.0)).r, bb = texture2D(map, uv - vec2(sp, 0.0)).b;
        vec3 col = vec3(mix(c.r, rr, uGlitch), c.g, mix(c.b, bb, uGlitch)) * uTint;
        col = mix(col, vec3(1.0, 0.37, 0.82) * max(c.r, max(c.g, c.b)) * 1.1, uGlitch * 0.55);
        float a = max(c.a, uGlitch * 0.6 * max(texture2D(map, uv + vec2(sp, 0.0)).a, texture2D(map, uv - vec2(sp, 0.0)).a));
        a *= uOpacity * exp(-pow(uFog * vD, 2.0));
        a *= 1.0 - uGlitch * 0.25 * step(0.8, h(row * 7.7 + tk * 2.1));
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });

// Billboarded radial glow (for bright cores larger than point sprites allow).
export const haloMaterial = (color: string, pow = 2.2) =>
  new THREE.ShaderMaterial({
    uniforms: { uSize: { value: 1 }, uColor: { value: new THREE.Color(color) }, uI: { value: 1 }, uPow: { value: pow }, ...FACE },
    vertexShader: /* glsl */ `
      ${FACE_GLSL}
      uniform float uSize; varying vec2 vUv; varying float vK;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); vK = faceKeep(projectionMatrix * mv); mv.xy += position.xy * uSize; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uI, uPow; varying vec2 vUv; varying float vK;
      void main(){ float r = length(vUv - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - r), uPow) * uI * vK;
        vec3 oc = uColor * a; gl_FragColor = vec4(oc, clamp(max(oc.r, max(oc.g, oc.b)), 0.0, 1.0));
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
  });

// Out-of-focus motes in a box that wraps around the camera (real parallax, never runs out).
export const motesMaterial = (soft: boolean) =>
  new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 2500 }, uCam: { value: new THREE.Vector3() }, uBox: { value: 26 }, uTime: { value: 0 }, uOpacity: { value: 1 }, uMax: { value: soft ? 200 : 12 }, ...FACE },
    vertexShader: /* glsl */ `
      ${FACE_GLSL}
      attribute float size; attribute float alpha; attribute vec3 aColor; attribute float aRnd;
      uniform float uScale, uBox, uTime, uMax; uniform vec3 uCam;
      varying vec3 vC; varying float vA;
      void main(){
        vec3 p = position * uBox + vec3(sin(uTime * 0.21 + aRnd * 6.0) * 0.7, uTime * 0.12 * (0.4 + aRnd), cos(uTime * 0.17 + aRnd * 5.0) * 0.7);
        p = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5 + uCam;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = max(0.001, -mv.z);
        float s = size * uScale / d;
        vA = alpha * smoothstep(0.6, 2.2, d) * (1.0 - smoothstep(uBox * 0.3, uBox * 0.5, d)) * faceKeep(gl_Position);
        if (s < 1.5) { vA *= s / 1.5; s = 1.5; }
        gl_PointSize = min(s, uMax);
        vC = aColor;
      }`,
    fragmentShader: soft
      ? /* glsl */ `
      uniform float uOpacity; varying vec3 vC; varying float vA;
      void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
        float a = pow(1.0 - r, 1.4) * 0.55 + smoothstep(1.0, 0.86, r) * 0.12;
        vec3 oc = vC * a * vA * uOpacity; gl_FragColor = vec4(oc, clamp(max(oc.r, max(oc.g, oc.b)), 0.0, 1.0));
        #include <colorspace_fragment>
      }`
      : /* glsl */ `
      uniform float uOpacity; varying vec3 vC; varying float vA;
      void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
        vec3 oc = vC * exp(-r * r * 5.0) * vA * uOpacity; gl_FragColor = vec4(oc, clamp(max(oc.r, max(oc.g, oc.b)), 0.0, 1.0));
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
  });
