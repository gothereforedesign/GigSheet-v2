# Implementation Plan - Chord Chart PDF Generator & 5-Slot Bottom Navigation

## 1. Overview
Add a dedicated **Chord Chart Generator** feature to GigSheet that allows musicians to draft professional chord charts with vertical bar separators, beat slashes, and repeat barlines, generate a printable vector PDF using `jsPDF`, download it locally, or add it directly into the app library under any category.

## 2. User Experience & Navigation Changes
- **Bottom Navigation**: Restructure from 4 items into 5 equal slots:
  1. Sheet Music (`sheet_music`)
  2. Technique & Exercises (`technique`)
  3. Randomize (`randomize` - shuffle action)
  4. Chord Chart Generator (`chord_gen` - music/pen icon)
  5. Setlists (`setlists`)

## 3. Component Architecture & Files to Create/Modify
- **`src/types.ts`**: Update tab type to include `'chord_gen'`.
- **`src/components/BottomNav.tsx`**: Update layout to 5 distinct slots with the Randomize button and Chord Generator button side-by-side in slots 3 & 4.
- **`src/components/ChordGeneratorView.tsx`**: New view component featuring:
  - Header inputs: Title, Artist, Key, Time Signature, BPM, Target Category.
  - Textarea for typing chord progressions / lyric lines with support for bar lines (`|`), slash beats (`/`), repeat barlines (`||:` or `:||`), and section headers (`[Verse]`, `[Chorus]`).
  - Real-time preview rendering.
  - `jsPDF` integration to build a clean, vector-rendered professional lead sheet PDF.
  - Buttons: **"Download PDF"** and **"Add Direct to App"** (saving directly to IndexedDB & Cloud Firestore).
- **`src/App.tsx`**: Wire up the `chord_gen` tab state and render `ChordGeneratorView`.
- **Package Installation**: Install `jspdf` if not already installed.

## 4. Verification Plan
- **Build Verification**: Run `compile_applet` and `lint_applet` to confirm zero TypeScript errors.
- **Functional Testing**: Verify navigation between tabs, chord chart generation with bar lines/slashes, PDF downloading, and adding the generated chart directly into the app library.
