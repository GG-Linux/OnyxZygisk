# In-process custom module loader

## Goal

Load Zygisk / FN module libraries into the target process **without registering
them in the system linker's `solist`**, so linker-walk detection (an app
iterating loaded `soinfo` records, or reading `/proc/self/maps` for a
recognisable library path) finds nothing to flag.

Today OnyxZygisk is **reactive**: the system linker loads the module via
`android_dlopen_ext` (`common/dl.cpp:DlopenMem`), the module briefly appears in
`solist`, and `injector/solist.cpp:dropSoPath` unlinks it afterwards. The custom
loader is **proactive**: the module is mapped, relocated and initialised by our
own code and never enters `solist` in the first place.

The loader itself is **CSOLoader** (github.com/ThePedroo/CSOLoader), the same
component ReZygisk uses, vendored as a git submodule under
`loader/src/external/csoloader/`.

## Licensing

- NeoZygisk (the base) is **GPL-3.0**.
- CSOLoader is **AGPL-3.0**.

The project decision is to incorporate CSOLoader directly rather than
reimplement it. GPL-3.0 §13 permits linking a GPL-3.0 work with an AGPL-3.0
work; the combined work is therefore conveyed under **AGPL-3.0** (`LICENSE`),
with upstream GPL-3.0 notices retained (`NOTICE.md`). CSOLoader is kept as an
unmodified submodule so its copyright headers and AGPL license stay intact; our
own code only calls its public API (`csoloader_load`, `csoloader_get_symbol`,
`csoloader_unload`).

## The seam

Both module load sites in `injector/module.cpp` (classic modules in
`run_modules_pre`, and FN nodes right after) go through one function:

```
LoadedModule LoadModuleFromMemfd(int memfd);   // include/module_loader.hpp
```

`LoadedModule` carries `{ handle, entry, custom }`. Callers only check
`operator bool` (did `zygisk_module_entry` resolve?) and read `handle` / `entry`.
This decouples the call sites from *how* the library was loaded.

## Stages

**Stage 1 — the seam (done).**
`LoadModuleFromMemfd` funnels both module load sites through one function.

**Stage 2 — vendor CSOLoader + wire the build (done).**
CSOLoader added as a submodule; its static `csoloader` target is built by the
NDK and linked into `zygisk`. Combined work relicensed to AGPL-3.0.

**Stage 3 — in-process glue behind a flag (done, default off).**
`LoadModuleFromMemfd` can load a module via `csoloader_load` on the memfd's
procfs path (`/proc/self/fd/<n>`), resolve `zygisk_module_entry` with
`csoloader_get_symbol`, and returns a `custom` handle. Gated by the
`USE_CUSTOM_LOADER` compile flag (default `0`) with an automatic fallback: any
failure in the custom path returns to `DlopenMem`, so a bug degrades to today's
working behaviour instead of failing specialization. Both the default-off and
flag-on builds compile and link for all four ABIs.

**Stage 4 — make it the default, keep the fallback (pending on-device work).**
Flip `USE_CUSTOM_LOADER` to `1` once it has been proven on a range of devices /
Android versions (see verification below). `dropSoPath` stays as a
belt-and-braces cleanup for the fallback path.

## Risk & verification

A wrong loader means **zygote cannot load the module → boot loop**. This class
of bug is largely invisible to unit tests and emulators; it must be verified on
real hardware. The staged design exists precisely so each step is either
inert (Stages 1–2) or fallback-protected (Stages 3–4).

Required on-device checks before advancing a stage:

- device boots and specializes apps normally with the flag **off** (regression);
- with the flag **on**, a known module (e.g. a simple Zygisk module) loads and
  its `onLoad` runs;
- `/proc/<app>/maps` no longer shows the module's real path;
- an app that walks `solist` / dlopen records does not observe the module;
- both 64-bit and 32-bit zygote paths, across at least two Android versions.

## Files

- `include/module_loader.hpp` — the seam interface.
- `common/module_loader.cpp` — Stage 1 implementation (system-linker wrapper);
  the custom loader lands here behind the fallback.
- `common/dl.cpp` — `DlopenMem`, the system-linker path / fallback.
- `injector/solist.cpp` — existing reactive `solist` cleanup, retained.
