# ZYNTHEOR WORKSPACE CONTEXT ENGINE — Specification

**Document Version**: 1.0.0 (Phase P2 Workspace Depth)  

---

## 1. Overview

The Project Context Engine (`src/services/projectContextEngine.ts`) provides relevance-based retrieval of workspace files, dependencies, entry points, and structural metadata without loading the entire repository into model prompt context.

---

## 2. Key Architecture & Features

### Relevance-Based Retrieval
- Keyword-based scoring evaluating query terms against file paths and exported symbols.
- Bounded character and token budget (default max 4,000 tokens / ~16,000 characters).
- Relevance scoring ranking top-N files (`maxFiles` limit default: 6 files).

### Security & Sanitization
- **Strict Exclusions**: Automatically excludes sensitive file patterns (`.env`, `token`, `secret`, `.pem`, `id_rsa`, `.key`).
- **Prompt Injection Sanitization**: Neutralizes embedded template injection markers (`<|im_start|>`, `<|im_end|>`, `[AIS_METADATA_SECTION_START]`, `System Instruction:`) in repository source files.

### Context Inspector Interface
- Exposes structured context metrics via `ContextInspector` UI component:
  - Active workspace ID & project name
  - Retrieved files with line counts, size, relevance score, and source
  - Code Graph edges & exported symbols
  - Total context size in KB & estimated tokens
  - Context freshness timestamp and mtime verification
