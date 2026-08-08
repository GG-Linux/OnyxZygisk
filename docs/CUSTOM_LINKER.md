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

This is the same technique ReZygisk markets under "custom linker (CSOLoader)".
The *idea* is shared; the *code* here is not — see Licensing.

## Licensing (hard constraint)

- OnyxZygisk is **GPL-3.0** (inherited from NeoZygisk, upstream GPL-3.0).
- ReZygisk's `CSOLoader` (github.com/ThePedroo/CSOLoader) is **AGPL-3.0**.

AGPL-3.0 source must not be copied or adapted into this project: doing so would
force AGPL obligations onto the whole work (GPLv3 §13 permits the combination,
but that is a deliberate relicensing the project has chosen **not** to make).
"Read it and write a similar one" is not a loophole — access plus substantial
similarity makes a derivative work regardless of rewording.

Therefore the loader here is written **only** from:

- the public **ELF** and **AArch64 / ARM ELF ABI** specifications;
- Android's **bionic** linker, which is **Apache-2.0** (GPL-compatible), used as
  a reference for Android-specific behaviour;
- this repository's own GPL-3.0 code (`injector/solist.cpp`,
  `include/elf_parser.hpp`, `include/linker_soinfo.h`).

No CSOLoader / ReZygisk source is consulted while implementing it.

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
`LoadModuleFromMemfd` wraps the previous `DlopenMem` + `dlsym` exactly;
`custom` is always `false`. No behavioural change. Both call sites converted.
Purpose: a single, testable place to add the custom path with a guaranteed
fallback.

**Stage 2 — read-only ELF loader, dry run.**
Parse the module image from the memfd (program headers, dynamic section,
relocation and symbol tables) and log what a load *would* do — segment layout,
`DT_NEEDED` list, relocation counts — but still hand the process off to
`DlopenMem`. Lets us validate the parser against real modules on-device with
zero risk to boot.

**Stage 3 — map + relocate + init, behind a flag.**
Actually `mmap` the `PT_LOAD` segments, apply relocations
(`R_AARCH64_RELATIVE`, `R_AARCH64_GLOB_DAT`, `R_AARCH64_JUMP_SLOT`,
`R_AARCH64_ABS64`; ARM equivalents for 32-bit), resolve imports against
already-loaded libraries via the in-process linker's own lookup, run
`DT_INIT` / `DT_INIT_ARRAY`, and return a handle whose `dlsym` equivalent finds
`zygisk_module_entry`. Gated by a compile-time flag (default off) **and** an
automatic fallback: any failure in the custom path returns to `DlopenMem`, so a
bug degrades to today's working behaviour instead of failing specialization.

**Stage 4 — make it the default, keep the fallback.**
Flip the default once it has been proven on a range of devices / Android
versions. `dropSoPath` stays as a belt-and-braces cleanup for the fallback path.

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
