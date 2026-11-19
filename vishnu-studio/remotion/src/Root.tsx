import React from "react";
import { Composition } from "remotion";
import { FPS } from "./kit/theme";
import { VIDEOS } from "./lanes/animated/registry";
import { TalkingHead, thMetadata } from "./lanes/talking-head/TalkingHead";
import { Carousel, carouselMetadata } from "./lanes/carousel/Carousel";
import { Cover } from "./lanes/talking-head/Cover";
import { CoverDesign } from "./lanes/talking-head/CoverDesign";
import { ClayCover } from "./lanes/talking-head/clay";
import { BuddySheet } from "./kit/ClayBuddy";
import { SignatureSheet } from "./lanes/animated/signature";
import { MascotSheet } from "./kit/mascots";
import { CharacterSheet } from "./kit/characters";
import { AvaPoseSheet } from "./kit/ava";
import { StyleSheet, STYLES, PER_PAGE, SHEET } from "./lanes/styles/StyleSheet";

// Every animated video gets two compositions from one scene: <slug>-16x9 and <slug>-9x16.
// Talking-head videos share one composition, "talking-head"; the slug picks which video it draws.
export const Root: React.FC = () => (
  <>
    {VIDEOS.map((v) => (
      <React.Fragment key={v.slug}>
        <Composition id={`${v.slug}-16x9`} component={v.Scene} durationInFrames={Math.ceil(v.seconds * FPS)} fps={FPS} width={1920} height={1080} />
        <Composition id={`${v.slug}-9x16`} component={v.Scene} durationInFrames={Math.ceil(v.seconds * FPS)} fps={FPS} width={1080} height={1920} />
      </React.Fragment>
    ))}
    <Composition
      id="talking-head"
      component={TalkingHead}
      durationInFrames={FPS}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ slug: "who-is-vishnu", edit: null }}
      calculateMetadata={thMetadata}
    />
    <Composition
      id="cover-design"
      component={CoverDesign}
      durationInFrames={1}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ title: "Cover", mark: "", kicker: "", layout: "stack" as const }}
    />
    <Composition id="buddy-sheet" component={BuddySheet} durationInFrames={30} fps={FPS} width={2200} height={700} />
    <Composition id="ava-poses" component={AvaPoseSheet} durationInFrames={1} fps={FPS} width={2400} height={1400} />
    <Composition id="character-sheet" component={CharacterSheet} durationInFrames={1} fps={FPS} width={2000} height={1200} />
    <Composition id="mascot-sheet" component={MascotSheet} durationInFrames={1} fps={FPS} width={2400} height={1300} />
    <Composition id="signature-sheet" component={SignatureSheet} durationInFrames={1} fps={FPS} width={1880} height={3040} />
    <Composition
      id="cover-clay"
      component={ClayCover}
      durationInFrames={1}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ slug: "who-is-vishnu", at: 1, title: "Cover", mark: "", kicker: "", layout: "big" as const }}
    />
    <Composition
      id="th-cover"
      component={Cover}
      durationInFrames={1}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ slug: "who-is-vishnu", at: 1, title: "Cover", mark: "", kicker: "" }}
    />
    <Composition
      id="carousel"
      component={Carousel}
      durationInFrames={1}
      fps={FPS}
      width={1080}
      height={1350}
      defaultProps={{ slug: "play-store-carousel", slides: null }}
      calculateMetadata={carouselMetadata}
    />
    <Composition
      id="style-sheet"
      component={StyleSheet}
      durationInFrames={Math.ceil(STYLES.length / PER_PAGE)}
      fps={FPS}
      width={SHEET.width}
      height={SHEET.height}
    />
  </>
);
