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

// The internet galaxy: points that can be sliced (a thin horizontal layer lights cyan, lifts,
// contracts and streams away) while the rest dims.
export const galaxyMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      uScale: { value: 2500 }, uFog: { value: 0 }, uOpacity: { value: 1 }, uMax: { value: 70 }, uTime: { value: 0 }, uRot: { value: 0 },
      uSliceY: { value: 0 }, uSliceHalf: { value: 0.5 }, uGlow: { value: 0 }, uDim: { value: 0 }, uLift: { value: 0 }, uContract: { value: 1 },
      uStream: { value: 0 }, uStreamTo: { value: new THREE.Vector3() }, uWave: { value: -10 }, uCyan: { value: new THREE.Color("#5ee7ff") }, ...FACE,
    },
    vertexShader: /* glsl */ `
      ${FACE_GLSL}
      attribute float size; attribute float alpha; attribute vec3 aColor; attribute float aRnd;
      uniform float uScale, uFog, uMax, uTime, uRot, uSliceY, uSliceHalf, uGlow, uDim, uLift, uContract, uStream, uWave;
      uniform vec3 uStreamTo, uCyan;
      varying vec3 vC; varying float vA;
      void main(){
        vec3 p = position;
        float r = length(p.xz);
        float ang = uRot * (0.6 + 6.0 / (r + 6.0));
        float c = cos(ang), s = sin(ang);
        p.xz = mat2(c, -s, s, c) * p.xz;
        float inS = 1.0 - smoothstep(uSliceHalf, uSliceHalf * 1.7, abs(position.y - uSliceY));
        p.y += uLift * inS;
        p.xz *= mix(1.0, uContract, inS);
        float st = clamp((uStream - aRnd * 0.55) / 0.45, 0.0, 1.0); st = st * st * (3.0 - 2.0 * st);
        p = mix(p, uStreamTo + (p - uStreamTo) * 0.03, st * inS);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = max(0.001, -mv.z);
        float sz = size * uScale / d * (1.0 + inS * uGlow * 0.6);
        float wave = exp(-pow((r - uWave) * 0.35, 2.0));
        float b = alpha * mix(1.0, 0.16, uDim * (1.0 - inS)) * (0.82 + 0.18 * sin(uTime * 2.3 + aRnd * 40.0)) * (1.0 + wave * 1.6);
        b *= exp(-pow(uFog * d, 2.0));
        if (sz < 1.6) { b *= sz / 1.6; sz = 1.6; }
        gl_PointSize = min(sz, uMax);
        vC = mix(aColor, uCyan * 1.5, inS * uGlow) ;
        vA = b * (1.0 - st * inS * 0.2) * faceKeep(gl_Position);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying vec3 vC; varying float vA;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        if (r > 1.0) discard;
        float a = exp(-r * r * 4.0) * 0.45 + exp(-r * r * 26.0) * 1.0;
        vec3 oc = vC * a * vA * uOpacity; gl_FragColor = vec4(oc, clamp(max(oc.r, max(oc.g, oc.b)), 0.0, 1.0));
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
  });

// Instanced data tiles (web pages, photos, code, video, maps...) from a 4x2 atlas, additive.
export const tileMaterial = (map: THREE.Texture) =>
  new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map }, uFog: { value: 0 }, uOpacity: { value: 1 }, uRot: { value: 0 }, uTime: { value: 0 },
      uSliceY: { value: 0 }, uSliceHalf: { value: 0.5 }, uGlow: { value: 0 }, uDim: { value: 0 }, uLift: { value: 0 }, uContract: { value: 1 }, uGone: { value: 0 }, uWave: { value: -10 }, ...FACE,
    },
    vertexShader: /* glsl */ `
      ${FACE_GLSL}
      attribute vec2 aAtlas; attribute float aRnd; attribute vec3 aTint;
      uniform float uFog, uRot, uSliceY, uSliceHalf, uGlow, uDim, uLift, uContract, uGone, uTime, uWave;
      varying vec2 vUv; varying vec3 vT; varying float vA; varying float vS;
      void main(){
        vec3 ctr = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec3 p = (instanceMatrix * vec4(position, 1.0)).xyz;
        float r = length(ctr.xz);
        float ang = uRot * (0.6 + 6.0 / (r + 6.0));
        float c = cos(ang), s = sin(ang);
        p.xz = mat2(c, -s, s, c) * p.xz;
        float inS = 1.0 - smoothstep(uSliceHalf, uSliceHalf * 1.7, abs(ctr.y - uSliceY));
        p.y += uLift * inS;
        p.xz *= mix(1.0, uContract, inS);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        float wave = exp(-pow((r - uWave) * 0.35, 2.0));
        vA = exp(-pow(uFog * d, 2.0)) * mix(1.0, 0.14, uDim * (1.0 - inS)) * (1.0 - uGone * inS) * (0.85 + 0.15 * sin(uTime * 1.7 + aRnd * 30.0)) * (1.0 + wave * 1.2);
        vA *= smoothstep(0.6, 2.0, d) * faceKeep(gl_Position);
        vS = inS * uGlow;
        vUv = (uv + aAtlas) / vec2(4.0, 2.0);
        vT = aTint;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float uOpacity;
      varying vec2 vUv; varying vec3 vT; varying float vA; varying float vS;
      void main(){
        vec4 tx = texture2D(map, vUv);
        vec3 col = tx.rgb * vT;
        col = mix(col, vec3(0.37, 0.9, 1.0) * (0.4 + 1.2 * dot(tx.rgb, vec3(0.33))), vS);
        vec3 oc = col * tx.a * vA * uOpacity; gl_FragColor = vec4(oc, clamp(max(oc.r, max(oc.g, oc.b)), 0.0, 1.0));
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.DoubleSide,
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

// Sky: indigo/violet nebula with cyan and magenta light, on a sphere that follows the camera.
export const nebulaMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLift: { value: 1 } },
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uTime, uLift; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float g = d.y * 0.5 + 0.5;
        vec3 base = mix(vec3(0.0035, 0.0025, 0.012), vec3(0.016, 0.008, 0.07), smoothstep(0.15, 0.95, g));
        float n = fbm(d * 2.1 + vec3(uTime * 0.006, 0.0, 0.0));
        float n2 = fbm(d * 4.3 + 7.0 - vec3(0.0, uTime * 0.004, 0.0));
        float n3 = fbm(d * 3.1 + 3.0);
        vec3 col = base;
        col += vec3(0.045, 0.012, 0.26) * smoothstep(0.38, 0.85, n) * uLift;
        col += vec3(0.012, 0.12, 0.2) * pow(smoothstep(0.5, 0.95, n2 * 0.6 + n * 0.5), 1.6) * smoothstep(-0.3, 0.7, d.x) * uLift;
        col += vec3(0.2, 0.02, 0.13) * pow(smoothstep(0.52, 0.95, n3), 2.0) * smoothstep(-0.7, 0.3, -d.x) * uLift;
        col *= 0.75 + 0.5 * smoothstep(-0.6, 0.6, d.y);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false,
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
