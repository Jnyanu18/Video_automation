# Use Claude the way Anthropic's guide says: goal, interview, check

This is the method from Anthropic's own guide, "Best practices for Claude Code" (code.claude.com/docs/en/best-practices), in three copy-paste prompts. The guide's own summary: "tell Claude what it can't see, give it a check to run". Quotes are from the guide as it read on 6 November 2026.

## Step 1: start with the goal

Skip the long list of instructions. Say what you want and what done looks like. The guide asks: "Does it know what done looks like? A goal condition, a spec file, or a failing test it has to turn green."

Copy this and fill in the brackets:

```
I want [the finished thing, in one sentence].
Done means:
- [a result you can check, like "the sign-up page creates a user"]
- [another one, like "all tests in tests/auth pass"]
- [a limit, like "the page loads in under 1 second"]
Work out the steps yourself.
```

## Step 2: if you're not sure, have it interview you

When you don't know exactly what you want yet, the guide says: "you don't have to work it all out before you prompt. Ask Claude to interview you instead". It comes back with multiple-choice questions about the parts you haven't decided, and keeps asking "until the answers add up to a spec".

The guide's own example, ready to adapt:

```
I want to add [the feature] but haven't thought it through yet. Interview me until you could write the spec, then write it to SPEC.md.
```

## Step 3: give it a check to pass

A check is how Claude knows it's finished: a test that has to turn green, a typecheck, or a command that has to succeed. In Claude Code you can also set it as a goal that Claude keeps working toward until it's met.

```
When you're done, run [the test command] and keep fixing until every test passes. Show me the result.
```

In Claude Code, the same thing as a goal:

```
/goal all tests in tests/auth pass and lint is clean
```

## The whole thing in one prompt

```
I want [the finished thing].
Done means: [check 1], [check 2], [check 3].
If anything about this is unclear, interview me first with multiple-choice questions until you could write the spec, then write it to SPEC.md.
Then build it, run [the test command] and keep going until it passes.
```

## Why it works

A long prompt full of steps tells Claude how, but not what finished looks like, so it can't tell when it's done or when it went wrong. A goal, the answers it needs and a check to pass give it all three. The rest of the guide covers the details: telling Claude what it can't see from the code, and making rules that must never break part of your setup.

Source: Anthropic, "Best practices for Claude Code", code.claude.com/docs/en/best-practices.
