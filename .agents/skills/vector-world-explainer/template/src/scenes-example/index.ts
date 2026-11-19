import type React from "react";
import type { ActName, SceneProps } from "../lib";
import { Hook } from "./hook";
import { Bits } from "./bits";
import { Qubit } from "./qubit";
import { Myth } from "./myth";
import { Interference } from "./interference";
import { Pool } from "./pool";
import { Scale } from "./scale";
import { Uses } from "./uses";
import { Problems } from "./problems";
import { Ending } from "./ending";
import { Aiwave } from "./aiwave";
import { Cta } from "./cta";

export const SCENES: Record<ActName, React.FC<SceneProps>> = { hook: Hook, bits: Bits, qubit: Qubit, myth: Myth, interference: Interference, pool: Pool, scale: Scale, uses: Uses, problems: Problems, ending: Ending, aiwave: Aiwave, cta: Cta };
