# ⚠️ DEPRECATED - Repository Migrated

## This repository has been archived and is now read-only.

The `audio-tools` codebase has been migrated into the [ol_dsp](https://github.com/oletizi/ol_dsp) monorepo for better integration with other DSP and audio processing tools.

### What Changed?

- **Code Location**: All code from this repository now lives in `modules/audio-tools/` within the [ol_dsp](https://github.com/oletizi/ol_dsp) monorepo
- **Development**: All future development will happen in the monorepo
- **Issues/PRs**: Please open any new issues or pull requests in the [ol_dsp repository](https://github.com/oletizi/ol_dsp)

### For Users

To use the audio-tools functionality:

```bash
# Clone the monorepo
git clone https://github.com/oletizi/ol_dsp.git
cd ol_dsp

# Install dependencies (includes audio-tools workspace)
npm install

# Run audio-tools commands from the root
npm run dev           # Start development server
npm test              # Run tests
npm run build:audio-tools  # Build the project
```

### For Contributors

Please direct all contributions to: https://github.com/oletizi/ol_dsp

The audio-tools code is now located at: `ol_dsp/modules/audio-tools/`

### Migration Date

**September 1, 2025** - This repository was archived and migrated to the ol_dsp monorepo.

---

**This repository is now archived and read-only. No new issues, PRs, or commits will be accepted.**