@_spi(PluginMessage) import SwiftCompilerPluginMessageHandling
import SwiftSyntaxMacros

/// The module name that `expo-modules-core` passes to `#externalMacro`, and the name of the macro
/// target that SwiftPM loads as the plugin.
private let pluginModuleName = "ExpoModulesMacros"

/// Runs the compiler plugin server on stdin and stdout until the compiler closes the connection.
///
/// `CompilerPlugin.main()` finds a macro by comparing `String(reflecting:)` of each type with
/// `<module>.<type>` from `#externalMacro`. The macro types live in this module, not in a module
/// named `ExpoModulesMacros`, so both executables that serve the plugin (the SwiftPM macro target and
/// the shipped tool) use this provider, which matches the type name under the plugin module name.
public func runPluginServer() throws {
  let connection = try StandardIOMessageConnection()
  let listener = CompilerPluginMessageListener(connection: connection, provider: ProvidedMacroProvider())
  try listener.main()
}

private struct ProvidedMacroProvider: PluginProvider {
  let macros: [String: Macro.Type] = Dictionary(
    uniqueKeysWithValues: ProvidedMacro.all.map { (String(describing: $0.type), $0.type) }
  )

  func resolveMacro(moduleName: String, typeName: String) throws -> Macro.Type {
    guard moduleName == pluginModuleName, let type = macros[typeName] else {
      throw UnknownMacroError(moduleName: moduleName, typeName: typeName)
    }
    return type
  }
}

private struct UnknownMacroError: Error, CustomStringConvertible {
  let moduleName: String
  let typeName: String

  var description: String {
    "macro implementation type '\(moduleName).\(typeName)' could not be found in the Expo Modules macro plugin"
  }
}
