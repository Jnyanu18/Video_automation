// The island scene: camera rig, lights (warm sun, sunset at the end), island slab, the nine tiles, decor.
import React, { useLayoutEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { progS } from "../lib";
import { DIR, TILE, camCentre, camLive, type V3 } from "./cam";
import { Ball, Box, Bush, C, G, Tree, clay } from "./parts";
import { CarTile, CoalTile, FactoryTile, FoodTile, GalleryTile, HouseTile, JewelTile, PlazaTile, WareTile } from "./tiles";
import { SUNSET } from "./times";

const CamRig: React.FC<{ t: number }> = ({ t }) => {
  const cam = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const c = camLive(t);
  const cc = camCentre(c);
  useLayoutEffect(() => {
    cam.position.set(cc[0] + DIR[0] * 60, cc[1] + DIR[1] * 60, cc[2] + DIR[2] * 60);
    cam.up.set(0, 1, 0);
    cam.lookAt(cc[0], cc[1], cc[2]);
    cam.zoom = c.zoom;
    cam.near = 0.1; cam.far = 300;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  });
  return null;
};

const ISLAND = 7.0;
const Clouds: React.FC<{ t: number }> = ({ t }) => (
  <>
    {[[-9, -3, -6, 1.2], [8, -2, 9, 1.0], [-6, -4.5, 9, 0.9], [10, -5, -5, 1.3], [0, -6, 12, 1.1], [-12, -1.5, 3, 0.8]].map(([x, y, z, s], i) => {
      const dx = 0;
      return (
        <G key={i} p={[x + dx, y, z]} s={s}>
          <Ball r={0.9} color={C.white} s={[1.4, 0.7, 1]} seg={14} />
          <Ball p={[0.9, -0.1, 0.2]} r={0.65} color={C.white} s={[1.3, 0.7, 1]} seg={14} />
          <Ball p={[-0.9, -0.15, -0.1]} r={0.6} color={C.white} s={[1.3, 0.7, 1]} seg={14} />
        </G>
      );
    })}
  </>
);

const Island: React.FC<{ t: number }> = ({ t }) => (
  <>
    {/* top slab + layered sides */}
    <Box p={[0, -0.35, 0]} size={[ISLAND * 2, 0.7, ISLAND * 2]} color={C.teal} round={0.3} />
    <Box p={[0, -1.0, 0]} size={[ISLAND * 2 - 0.3, 0.7, ISLAND * 2 - 0.3]} color={C.sand} round={0.3} />
    <Box p={[0, -1.6, 0]} size={[ISLAND * 2 - 0.9, 0.6, ISLAND * 2 - 0.9]} color={C.clay} round={0.3} />
    {/* underside: an inverted rocky pyramid */}
    <mesh position={[0, -6.4, 0]} rotation={[Math.PI, Math.PI / 4, 0]} material={clay(C.rock)} castShadow>
      <cylinderGeometry args={[0.4, ISLAND * 1.3, 9, 4, 1]} />
    </mesh>
    {[[-4, -3.0, 5.6, 0.6], [5.5, -3.4, -3.5, 0.45], [3.2, -5.6, 3.4, 0.35]].map(([x, y, z, s], i) => (
      <mesh key={i} position={[x, y, z]} scale={s} material={clay(i % 2 ? C.clay : C.rock)} castShadow>
        <icosahedronGeometry args={[1, 0]} />
      </mesh>
    ))}
    {/* little paths between tiles */}
    {[-2.1, 2.1].map((v) => <Box key={`a${v}`} p={[v, 0.005, 0]} size={[0.5, 0.01, 12.4]} color={C.cream} round={0.004} noShadow />)}
    {[-2.1, 2.1].map((v) => <Box key={`b${v}`} p={[0, 0.006, v]} size={[12.4, 0.01, 0.5]} color={C.cream} round={0.004} noShadow />)}
    {/* edge trees / bushes */}
    {[[-6.5, -6.5], [-6.5, 3], [3, -6.5], [6.5, -2], [-2, 6.5], [6.5, 6.5]].map(([x, z], i) => <Tree key={i} p={[x, 0, z]} s={0.75} kind={(i % 2) as 0 | 1} color={i % 3 ? C.greenDeep : C.green} />)}
    {[[-6.6, 0], [0, -6.6], [6.6, 2.4], [2.4, 6.6], [-4.3, 6.6], [6.6, -4.4]].map(([x, z], i) => <Bush key={i} p={[x, 0, z]} s={0.9} color={i % 2 ? C.pink : C.green} />)}
  </>
);

const at = (p: V3): V3 => [p[0], 0.18, p[2]];
export const Scene: React.FC<{ t: number }> = ({ t }) => {
  const sun = progS(t, SUNSET, 1.0);
  const sunCol = new THREE.Color("#fff0d4").lerp(new THREE.Color("#ffab73"), sun);
  const hemiSky = new THREE.Color("#fff4e8").lerp(new THREE.Color("#ffc4b0"), sun);
  const hemiGround = new THREE.Color("#a9d8cf").lerp(new THREE.Color("#8d7bc4"), sun);
  const sunPos: V3 = [8 - sun * 4, 14 - sun * 6, 3 + sun * 6];
  return (
    <>
      <CamRig t={t} />
      <hemisphereLight args={[hemiSky, hemiGround, 1.5 - sun * 0.25]} />
      <ambientLight intensity={0.35} color="#ffffff" />
      <directionalLight position={sunPos} intensity={2.6 - sun * 0.5} color={sunCol} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-radius={5}
        shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={11} shadow-camera-bottom={-11} shadow-camera-near={0.5} shadow-camera-far={40} />
      <Clouds t={t} />
      <Island t={t} />
      <group position={at(TILE.food)}><FoodTile t={t} /></group>
      <group position={at(TILE.car)}><CarTile t={t} /></group>
      <group position={at(TILE.ware)}><WareTile t={t} /></group>
      <group position={at(TILE.coal)}><CoalTile t={t} /></group>
      <group position={at(TILE.house)}><HouseTile t={t} /></group>
      <group position={at(TILE.jewel)}><JewelTile t={t} /></group>
      <group position={at(TILE.gallery)}><GalleryTile t={t} /></group>
      <group position={at(TILE.factory)}><FactoryTile t={t} /></group>
      <group position={at(TILE.plaza)}><PlazaTile t={t} /></group>
    </>
  );
};
