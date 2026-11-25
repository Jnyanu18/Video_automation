import ExpoModulesCLI
import ExpoModulesMacrosCore

#if canImport(Darwin)
import Darwin
#elseif canImport(Glibc)
import Glibc
#elseif os(Windows)
import CRT
#endif

// The binary that this package ships as `ExpoModulesMacros`: the compiler plugin, which CocoaPods
// builds load, and the scanner CLI, which `expo-modules-autolinking` and `expo-modules-cli` run. The
// compiler always launches a plugin executable without arguments and speaks the plugin protocol over
// stdin, so any argument means a scanner invocation (`ExpoModulesMacros scan-modules <path>...`);
// with none, this starts the plugin server. The CLI gets `expandMacros`, so `expand` runs the macros
// of this executable.
let arguments = Array(CommandLine.arguments.dropFirst())
if arguments.isEmpty {
  try runPluginServer()
} else {
  let expander = MacroExpander(
    attributeNames: Set(ProvidedMacro.all.map(\.name)),
    expand: expandMacros
  )
  exit(ScannerCLI.run(arguments: arguments, expander: expander))
}
