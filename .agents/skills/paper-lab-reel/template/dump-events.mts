// Prints the world's sound events as JSON (output seconds).
// npx esbuild dump-events.mts --bundle --platform=node --format=esm --log-level=error --loader:.json=json | node --input-type=module > out/events-paper.json
import { EVENTS } from "./src/paper/events";
console.log(JSON.stringify(EVENTS));
