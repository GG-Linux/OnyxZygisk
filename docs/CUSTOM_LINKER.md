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

**Stage 4 — custom loader is the default (done in code; on-device validation
ongoing).**
`USE_CUSTOM_LOADER` now defaults to `1`, so CSOLoader is the primary path for
every module load, with the system-linker fallback kept for load-time failures.
`dropSoPath` stays as belt-and-braces cleanup for whenever the fallback fires.
Build with `-DUSE_CUSTOM_LOADER=0` to force the old system-linker path if a
regression needs isolating. The on-device checklist below still governs whether
this default is safe on a given device / Android version — the fallback does not
cover a load that succeeds but yields a broken module (a zygote crash / boot
loop), so real-hardware testing remains required.

**Stage 5 — full lifecycle: unload + global teardown (done).**
Making the loader the default surfaced a real gap: `ZygiskModule::tryUnload()`
(called whenever a module opts into `zygisk::Option::DLCLOSE_MODULE_LIBRARY` —
a normal, common thing modules do) unconditionally called `dlclose(handle)`.
For a custom-loaded module `handle` is a `csoloader*`, not a `dlopen()` handle,
so this was undefined behaviour on every such module once Stage 4 shipped.

Fixed by giving `ZygiskModule` a `custom` bit (threaded through from
`LoadedModule::custom` at both call sites) and a matching `UnloadModule(handle,
custom)` in the seam that dispatches to `dlclose()` or `csoloader_unload()`
accordingly. `csoloader_unload()` is csoloader's dlclose equivalent — it unmaps
the module's segments and frees its per-load bookkeeping; the `csoloader`
struct itself (heap-allocated in `LoadViaCustomLinker`) is freed alongside it.

There is also a process-global piece: `csoloader_deinit()` (`linker_deinit()`
in the vendored source) tears down TLS bookkeeping **shared by every
custom-loaded module in the process**, not just the one being unloaded. Calling
it while any custom-loaded module is still resident — the common case, since
most modules never request `DLCLOSE_MODULE_LIBRARY` and stay loaded for the
app's whole lifetime to keep their hooks active — would corrupt that module's
TLS. So `DeinitCustomLoaderIfUsed()` only runs from `run_modules_post()`,
inside the existing `modules.size() == modules_unloaded` branch (the same
guard that already gates `clean_libc_trace()`): i.e. only once *every* module
loaded in this process, custom or not, has actually been torn down. It is a
no-op if the custom loader was never invoked in this process, and idempotent
if called twice.

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

- `include/module_loader.hpp` — the seam interface: `LoadModuleFromMemfd`,
  `UnloadModule`, `DeinitCustomLoaderIfUsed`.
- `common/module_loader.cpp` — both load paths, the unload dispatch, and the
  guarded global teardown.
- `common/dl.cpp` — `DlopenMem`, the system-linker path / fallback.
- `injector/solist.cpp` — existing reactive `solist` cleanup, retained for the
  system-linker path.
- `injector/module.cpp` — `ZygiskModule::tryUnload()` and the
  `run_modules_post()` full-unload gate that also calls
  `DeinitCustomLoaderIfUsed()`.
- `external/csoloader/` — the vendored submodule itself.
