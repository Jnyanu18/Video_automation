import SwiftSyntax
import SwiftSyntaxBuilder

/// The `@unchecked Sendable` conformance that `@ExpoModule` and `@SharedObject` add to their class, or
/// `nil` when the class already conforms. The compiler leaves `Sendable` out of `protocols` when the
/// class already conforms, also through a superclass. The inheritance clause is checked too, so that
/// `expand`, which passes every declared conformance, gives the same result for a class that spells
/// out its own conformance.
///
/// A module or shared object is called from more than one thread: `.withAsync` runs a function on
/// the concurrent thread pool, and native code calls events and closures from any thread. The class
/// can't be checked `Sendable`, because `Module` and `SharedObject` aren't `Sendable`, so
/// `@unchecked Sendable` is the only conformance it can have.
internal func uncheckedSendableExtension(
  for type: some TypeSyntaxProtocol,
  of declaration: some DeclGroupSyntax,
  conformingTo protocols: [TypeSyntax]
) -> ExtensionDeclSyntax? {
  guard protocols.contains(where: { $0.trimmedDescription == "Sendable" }) else {
    return nil
  }
  let inherited = declaration.inheritanceClause?.inheritedTypes ?? []
  if inherited.contains(where: { isSendable($0.type) }) {
    return nil
  }
  let conformance: DeclSyntax = "extension \(type.trimmed): @unchecked Sendable {}"
  return conformance.cast(ExtensionDeclSyntax.self)
}

/// Whether an inherited type is `Sendable`, with or without attributes such as `@unchecked`.
private func isSendable(_ type: TypeSyntax) -> Bool {
  if let attributed = type.as(AttributedTypeSyntax.self) {
    return isSendable(attributed.baseType)
  }
  return baseIdentifier(of: type) == "Sendable"
}
