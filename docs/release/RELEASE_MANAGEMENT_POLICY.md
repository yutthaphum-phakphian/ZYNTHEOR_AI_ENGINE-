# ZYNTHEOR Release Management Policy

## 1. Release Stages & Quality Gates

```
[Development] ---> [Automated Tests] ---> [Staging Review] ---> [Pilot Release] ---> [Commercial Approval]
```

- **Typecheck & Lint Gate**: Must pass `tsc --noEmit` cleanly with 0 errors.
- **Build Verification**: `vite build` must generate static production artifacts without bundle errors.
- **Test Suite Pass Rate**: 100% of tests in `/tests` directory must pass before release tagging.
