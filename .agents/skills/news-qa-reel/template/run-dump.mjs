// Node has no DOM: stub the bits font/texture modules touch at import time, then print the events.
globalThis.document = { fonts: { ready: Promise.resolve(), add() {} }, createElement: () => ({ getContext: () => null, style: {} }) };
globalThis.window = globalThis; globalThis.FontFace = class { load() { return Promise.resolve(this); } };
await import("./dump-events.mjs");
