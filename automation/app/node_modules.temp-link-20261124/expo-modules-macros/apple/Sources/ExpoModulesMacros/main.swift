import ExpoModulesMacrosCore

// The plugin executable that SwiftPM builds for the packages that depend on the
// `ExpoModulesMacrosPlugin` product. It only serves the macros, so it doesn't link the CLI; the
// binary that this package ships is `ExpoModulesMacrosTool`, which does both.
try runPluginServer()
