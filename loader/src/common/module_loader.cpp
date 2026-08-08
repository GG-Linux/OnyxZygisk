#include "module_loader.hpp"

#include <cstdio>

#include "dl.hpp"
#include "logging.hpp"

extern "C" {
#include "../external/csoloader/include/csoloader.h"
}

/*
 * Module loading seam.
 *
 * Two paths live here:
 *
 *  - the system linker (DlopenMem -> android_dlopen_ext), which registers the
 *    library in the linker's solist and is cleaned up afterwards by
 *    injector/solist.cpp:dropSoPath; and
 *  - the in-process custom loader (CSOLoader), which maps and links the module
 *    itself, so it never enters solist at all.
 *
 * The custom path is tried first only when USE_CUSTOM_LOADER is enabled, and it
 * falls back to the system linker on any failure. That fallback is what makes
 * it safe to iterate on: a bug in the custom loader degrades to today's working
 * behaviour instead of failing to specialize the process (which would boot
 * loop). It is OFF by default until proven on-device — see docs/CUSTOM_LINKER.md.
 */

// Flip to 1 (or pass -DUSE_CUSTOM_LOADER=1) to make the custom loader the
// primary path. Keep the fallback regardless.
#ifndef USE_CUSTOM_LOADER
#define USE_CUSTOM_LOADER 0
#endif

static constexpr const char *ENTRY_SYMBOL = "zygisk_module_entry";

/// System-linker path: android_dlopen_ext from the memfd, then resolve entry.
static LoadedModule LoadViaSystemLinker(int memfd) {
    LoadedModule out;

    void *handle = DlopenMem(memfd, RTLD_NOW);
    if (!handle) {
        // DlopenMem already logged the dlerror(); nothing usable to return.
        return out;
    }

    void *entry = dlsym(handle, ENTRY_SYMBOL);
    if (!entry) {
        LOGW("module handle %p has no `%s` symbol", handle, ENTRY_SYMBOL);
        // Leave handle set so a caller could still close it; entry stays null,
        // so the module is treated as unusable (operator bool == false).
    }

    out.handle = handle;
    out.entry = entry;
    out.custom = false;
    return out;
}

#if USE_CUSTOM_LOADER
/// Custom-loader path: map + link the module in-process via CSOLoader, so it
/// never enters the system linker's solist. Returns a falsy LoadedModule on any
/// failure so the caller can fall back to the system linker.
static LoadedModule LoadViaCustomLinker(int memfd) {
    LoadedModule out;

    // CSOLoader loads by path; a memfd is reachable through its procfs link.
    char path[64];
    snprintf(path, sizeof(path), "/proc/self/fd/%d", memfd);

    auto *lib = new csoloader{};
    if (!csoloader_load(lib, path)) {
        LOGW("custom loader failed for fd %d (%s); falling back", memfd, path);
        delete lib;
        return out;
    }

    void *entry = csoloader_get_symbol(lib, ENTRY_SYMBOL);
    if (!entry) {
        LOGW("custom-loaded module has no `%s` symbol; falling back", ENTRY_SYMBOL);
        csoloader_unload(lib);
        delete lib;
        return out;
    }

    out.handle = lib;  // opaque; freed via the custom path's unload
    out.entry = entry;
    out.custom = true;
    return out;
}
#endif  // USE_CUSTOM_LOADER

LoadedModule LoadModuleFromMemfd(int memfd) {
#if USE_CUSTOM_LOADER
    if (LoadedModule lm = LoadViaCustomLinker(memfd)) {
        LOGV("loaded module from fd %d via custom linker", memfd);
        return lm;
    }
    // Custom path failed — fall through to the always-available system linker.
#endif
    return LoadViaSystemLinker(memfd);
}
