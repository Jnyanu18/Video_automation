import React from "react";
import { Composition } from "remotion";
import { FPS } from "./kit/theme";
import { Carousel, carouselMetadata } from "./lanes/carousel/Carousel";

// Carousel-only Remotion root (added by the editor's bridge so a slide render does not compile every other video).
export const CarouselRoot: React.FC = () => (
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
);
