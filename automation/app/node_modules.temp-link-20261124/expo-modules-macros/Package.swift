// swift-tools-version: 6.2
// The swift-tools-version declares the minimum version of Swift required to build this package.

import CompilerPluginSupport
import Foundation
import PackageDescription

let package = Package(
  name: "ExpoModulesMacros",
  platforms: [.macOS(.v13)],
  products: [
    // Lets a SwiftPM package depend on the macros, so the compiler builds and loads the plugin from
    // source, with no `-load-plugin-executable` flag. A target that declares the macros with
    // `#externalMacro(module: "ExpoModulesMacros", ...)` depends on this product, and the targets that
    // depend on it get the plugin too. CocoaPods builds keep loading the prebuilt binary. The name
    // differs from the macro target's, because SwiftPM already has a product of that name for it.
    .library(name: "ExpoModulesMacrosPlugin", targets: ["ExpoModulesMacros"]),
    .executable(name: "ExpoModulesMacrosTool", targets: ["ExpoModulesMacrosTool"]),
  ],
  dependencies: [
    .package(url: "https://github.com/swiftlang/swift-syntax.git", from: "604.0.0-latest")
  ],
  targets: [
    // The macro implementations, shared by the plugin and the tool. The macro target can't be a
    // dependency of an executable, so they live in a library target.
    .target(
      name: "ExpoModulesMacrosCore",
      dependencies: [
        .product(name: "SwiftSyntax", package: "swift-syntax"),
        .product(name: "SwiftSyntaxBuilder", package: "swift-syntax"),
        .product(name: "SwiftSyntaxMacros", package: "swift-syntax"),
        .product(name: "SwiftDiagnostics", package: "swift-syntax"),
        // For the plugin server, which resolves the macros by type name (see PluginServer.swift).
        .product(name: "_SwiftCompilerPluginMessageHandling", package: "swift-syntax"),
      ],
      path: "apple/Sources/ExpoModulesMacrosCore"
    ),
    // The plugin that Swift packages build from source. It serves only the macros, so it doesn't
    // compile the CLI. It lists the swift-syntax products of the implementation again: when SwiftPM
    // uses its prebuilt swift-syntax, it links the prebuilt library only for the products that the
    // macro target itself depends on, and the link fails without them.
    .macro(
      name: "ExpoModulesMacros",
      dependencies: [
        "ExpoModulesMacrosCore",
        .product(name: "SwiftSyntax", package: "swift-syntax"),
        .product(name: "SwiftSyntaxBuilder", package: "swift-syntax"),
        .product(name: "SwiftSyntaxMacros", package: "swift-syntax"),
        .product(name: "SwiftDiagnostics", package: "swift-syntax"),
        .product(name: "SwiftCompilerPlugin", package: "swift-syntax"),
      ],
      path: "apple/Sources/ExpoModulesMacros"
    ),
    // The shipped binary, `apple/ExpoModulesMacros` and the Windows and Linux binaries. It is both the
    // compiler plugin and the scanner CLI: the compiler launches it without arguments and speaks the
    // plugin protocol over stdin, while an invocation with arguments dispatches into `ScannerCLI`
    // (see main.swift). CocoaPods builds, `expo-modules-autolinking` and `expo-modules-cli` all
    // use this one executable.
    .executableTarget(
      name: "ExpoModulesMacrosTool",
      dependencies: [
        "ExpoModulesCLI",
        "ExpoModulesMacrosCore",
      ],
      path: "apple/Sources/ExpoModulesMacrosTool"
    ),
    .target(
      name: "ExpoModulesCLI",
      dependencies: [
        "ExpoModulesMacrosCore",
        .product(name: "SwiftSyntax", package: "swift-syntax"),
        .product(name: "SwiftParser", package: "swift-syntax"),
        .product(name: "SwiftIfConfig", package: "swift-syntax"),
        // For `expand`, which runs the macros in process.
        .product(name: "SwiftSyntaxMacros", package: "swift-syntax"),
        .product(name: "SwiftSyntaxMacroExpansion", package: "swift-syntax"),
        .product(name: "SwiftParserDiagnostics", package: "swift-syntax"),
        .product(name: "SwiftBasicFormat", package: "swift-syntax"),
        .product(name: "SwiftDiagnostics", package: "swift-syntax"),
      ],
      path: "apple/Sources/ExpoModulesCLI"
    ),
  ]
)

// The Tests directory is excluded from the published npm package,
// so only declare the test target when building from the repository.
if FileManager.default.fileExists(atPath: Context.packageDirectory + "/apple/Tests") {
  package.targets.append(
    .testTarget(
      name: "ExpoModulesMacrosTests",
      dependencies: [
        "ExpoModulesMacrosCore",
        "ExpoModulesCLI",
        .product(name: "SwiftSyntaxMacrosGenericTestSupport", package: "swift-syntax"),
      ],
      path: "apple/Tests/ExpoModulesMacrosTests"
    )
  )
  package.targets.append(
    .testTarget(
      name: "ExpoModulesCLITests",
      dependencies: [
        "ExpoModulesCLI",
        .product(name: "SwiftParser", package: "swift-syntax"),
      ],
      path: "apple/Tests/ExpoModulesCLITests"
    )
  )
}
