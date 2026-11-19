// Remotion CLI config. ANGLE is the GL backend that renders the three.js world reliably on Windows (stills and renders also pass --gl=angle).
import { Config } from "@remotion/cli/config";
Config.setChromiumOpenGlRenderer("angle");
