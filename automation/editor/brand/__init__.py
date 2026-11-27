"""Brand kit: a versioned, per-account set of brand facts and rules.

Modules:
  schema     the kit as Pydantic models (strict: unknown keys are rejected)
  validator  validate_kit(dict) -> (ok, errors) and check_output(kit, output) -> failures
  prompt     compile_brand_brief(kit, purpose) -> the text the Claude steps read
  tokens     export_tokens(kit) -> machine tokens for the renderers
  store      load_kit / save_kit: one kit.json per account under work_dir/brand/

Nothing in this package calls an LLM or the network.
"""
