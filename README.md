# 10x Architect Marketplace

Official marketplace for the [10x Architect](https://github.com/yzamari/10x-architect) Claude Code plugin.

## Installation

```bash
# In Claude Code
/plugin marketplace add yzamari/10x-architect-marketplace
/plugin install 10x-architect@10x-architect-marketplace
```

## What is 10x Architect?

A Claude Code skill that auto-enhances your prompts using [Greg Isenberg's "10 Rules for Claude Code"](https://www.youtube.com/watch?v=Xob-2a1OnvA).

**Before:**
```
implement user authentication
```

**After:**
```xml
<enhanced_prompt>
  <goal>Implement secure JWT-based authentication...</goal>
  <constraints>Do NOT implement password reset...</constraints>
  <execution_phases>...</execution_phases>
</enhanced_prompt>
```

## Features

- **3 Execution Modes** - Silent, show+execute, or auto-approve
- **Auto-Detection** - Detects your project's tech stack
- **Per-Project Config** - Remembers your preferences
- **Benchmarked** - 181% quality improvement, 90% task completion

## Links

- **Plugin Repo**: https://github.com/yzamari/10x-architect
- **Original Video**: https://www.youtube.com/watch?v=Xob-2a1OnvA

## License

MIT
