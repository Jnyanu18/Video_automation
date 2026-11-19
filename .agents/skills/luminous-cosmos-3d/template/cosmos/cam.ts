// Camera math shared by the 3D canvas and the HTML overlays (so labels sit exactly on 3D things).
// A Pose is: eye p, look-at point t, vertical fov, and c = the screen point where t appears
// (a lens shift done with setViewOffset; it keeps the subject in the safe area without tilting).
import * as THREE from "three";
import { H, W, easeInOut } from "../lib";

export type V3 = [number, number, number];
export type Pose = { p: V3; t: V3; fov: number; c?: [number, number]; up?: V3 };

export const v3 = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const mix3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => mul(a, 1 / (len(a) || 1));

// point at `dist` from `center`, azimuth `az` (deg, around +Y, 0 = +Z) and elevation `el` (deg)
export const orbit = (center: V3, dist: number, az: number, el: number): V3 => {
  const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
  return [center[0] + dist * Math.cos(e) * Math.sin(a), center[1] + dist * Math.sin(e), center[2] + dist * Math.cos(e) * Math.cos(a)];
};

export const applyPose = (cam: THREE.PerspectiveCamera, pose: Pose) => {
  cam.fov = pose.fov;
  cam.aspect = W / H;
  cam.near = 0.05;
  cam.far = 5000;
  cam.position.set(pose.p[0], pose.p[1], pose.p[2]);
  const u = pose.up ?? [0, 1, 0];
  cam.up.set(u[0], u[1], u[2]);
  cam.lookAt(pose.t[0], pose.t[1], pose.t[2]);
  const [cx, cy] = pose.c ?? [W / 2, H / 2];
  cam.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
};

const _cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 5000);
const _v = new THREE.Vector3();
// world -> screen px; d = distance from the eye (negative when behind the camera)
export const project = (pose: Pose, P: V3): [number, number, number] => {
  applyPose(_cam, pose);
  _v.set(P[0], P[1], P[2]);
  const vc = _v.clone().applyMatrix4(_cam.matrixWorldInverse);
  _v.project(_cam);
  return [((_v.x + 1) / 2) * W, ((1 - _v.y) / 2) * H, -vc.z];
};
// screen px + distance along the ray -> world point
export const unproject = (pose: Pose, sx: number, sy: number, dist: number): V3 => {
  applyPose(_cam, pose);
  const p = new THREE.Vector3((sx / W) * 2 - 1, 1 - (sy / H) * 2, 0.5).unproject(_cam);
  const d = p.sub(_cam.position).normalize().multiplyScalar(dist).add(_cam.position);
  return [d.x, d.y, d.z];
};
// screen px + depth (distance along the view axis) -> world point
export const atDepth = (pose: Pose, sx: number, sy: number, depth: number): V3 => {
  applyPose(_cam, pose);
  const p = new THREE.Vector3((sx / W) * 2 - 1, 1 - (sy / H) * 2, 0.5).unproject(_cam).applyMatrix4(_cam.matrixWorldInverse);
  p.multiplyScalar(depth / -p.z).applyMatrix4(_cam.matrixWorld);
  return [p.x, p.y, p.z];
};
// camera orientation as a quaternion (for cards that face the lens)
export const poseQuat = (pose: Pose): THREE.Quaternion => {
  applyPose(_cam, pose);
  return _cam.quaternion.clone();
};
// world units per screen pixel at a given depth
export const unitsPerPx = (pose: Pose, depth: number) => (2 * depth * Math.tan((pose.fov * Math.PI) / 360)) / H;

export const mixPose = (a: Pose, b: Pose, k: number): Pose => {
  const ca = a.c ?? [W / 2, H / 2], cb = b.c ?? [W / 2, H / 2];
  return {
    p: mix3(a.p, b.p, k), t: mix3(a.t, b.t, k), fov: a.fov + (b.fov - a.fov) * k,
    c: [ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k],
    up: a.up && b.up ? norm(mix3(a.up, b.up, k)) : a.up ?? b.up,
  };
};
// keyframed pose: [time, pose, ease of the segment INTO this key]
export type Key = [number, Pose, ((x: number) => number)?];
export const keyed = (t: number, keys: Key[]): Pose => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, p1, e = easeInOut] = keys[i];
    if (t < t1) {
      const [t0, p0] = keys[i - 1];
      return mixPose(p0, p1, e((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
};
