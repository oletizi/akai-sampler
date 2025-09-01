# 🚫 [DEPRECATED] Audio Tools

> **⚠️ IMPORTANT: This repository has been archived and migrated to [ol_dsp](https://github.com/oletizi/ol_dsp)**
> 
> **All development has moved to: https://github.com/oletizi/ol_dsp**
>
> **Location in monorepo: `modules/audio-tools/`**

---

## Repository Status: ARCHIVED 🔒

This repository is now **read-only** and has been migrated into the [ol_dsp](https://github.com/oletizi/ol_dsp) monorepo as of September 1, 2025.

### Why was this migrated?

The audio-tools codebase has been integrated into the larger ol_dsp monorepo to:
- Consolidate all DSP and audio processing tools in one place
- Enable better code sharing between JavaScript/TypeScript and C/C++ components
- Simplify dependency management using npm workspaces
- Provide a unified development environment for all audio-related projects

### Where to find the code now?

- **Repository**: https://github.com/oletizi/ol_dsp
- **Path**: `modules/audio-tools/`
- **Issues/PRs**: https://github.com/oletizi/ol_dsp/issues

### How to use audio-tools now?

```bash
# Clone the monorepo
git clone https://github.com/oletizi/ol_dsp.git
cd ol_dsp

# Install all dependencies
npm install

# Work with audio-tools
npm run dev                # Start dev server
npm test                   # Run tests  
npm run build:audio-tools  # Build project
```

---

## Original README Content

# Audio Tools

Monorepo of experimental tools for manipulating software and hardware audio devices.

## Sampler Lib
![sampler-lib](https://github.com/oletizi/akai-sampler/actions/workflows/sampler-lib.yml/badge.svg)

npm i [@oletizi/sampler-lib](https://www.npmjs.com/package/@oletizi/sampler-lib)

## Sampler Devices
![sampler-devices](https://github.com/oletizi/akai-sampler/actions/workflows/sampler-devices.yml/badge.svg)

npm i [@oletizi/sampler-devices](https://www.npmjs.com/package/@oletizi/sampler-devices)

* Support for reading and writing Akai S1000-based programs
* Support for reading and writing Akai S5000/S6000 programs (Based on [file format spec reverse engineerd by Seb Francis](https://burnit.co.uk/AKPspec/))

## Sampler Translate
![sampler-translate](https://github.com/oletizi/akai-sampler/actions/workflows/sampler-translate.yml/badge.svg)

npm i [@oletizi/sampler-translate](https://www.npmjs.com/package/@oletizi/sampler-translate)

* (Currently limited) support for translating Akai MPC and Decent Sampler programs to Akai S5000/S6000 sampler programs
* Support for chopping wav files into Akai S3000xl programs.