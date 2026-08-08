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
 * The custom path is the primary one: it is tried first and falls back to the
 * system linker if csoloader_load fails or the entry symbol is missing. The
 * fallback catches load-time failures — but note it cannot catch a load that
 * succeeds yet yields a subtly broken module, which would surface as a zygote
 * crash. See docs/CUSTOM_LINKER.md for the on-device verification this needs.
 */

// Custom loader is the default primary path. Set -DUSE_CUSTOM_LOADER=0 to force
// the system linker (e.g. to isolate a regression). The fallback is kept
// regardless.
#ifndef USE_CUSTOM_LOADER
#define USE_CUSTOM_LOADER 1
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

// Set once a module in this process was actually loaded via the custom
// loader. Gates DeinitCustomLoaderIfUsed() so it never touches csoloader's
// global state when nothing here ever initialized it (calling
// csoloader_deinit() with no prior csoloader_load() would delete a pthread
// TLS key that was never created).
static bool g_used_custom_loader = false;

LoadedModule LoadModuleFromMemfd(int memfd) {
#if USE_CUSTOM_LOADER
    if (LoadedModule lm = LoadViaCustomLinker(memfd)) {
        LOGV("loaded module from fd %d via custom linker", memfd);
        g_used_custom_loader = true;
        return lm;
    }
    // Custom path failed — fall through to the always-available system linker.
#endif
    return LoadViaSystemLinker(memfd);
}

bool UnloadModule(void *handle, bool custom) {
    if (!custom) return dlclose(handle) == 0;

    // csoloader_unload() is csoloader's dlclose equivalent: it unmaps the
    // library's segments and tears down its per-load bookkeeping. The
    // `csoloader` struct itself was heap-allocated in LoadViaCustomLinker and
    // is ours to free.
    auto *lib = static_cast<csoloader *>(handle);
    bool ok = csoloader_unload(lib);
    if (!ok) LOGW("csoloader_unload failed for handle %p", handle);
    delete lib;
    return ok;
}

void DeinitCustomLoaderIfUsed() {
    if (!g_used_custom_loader) return;
    csoloader_deinit();
    // Defensive: a second call in the same process becomes a no-op rather
    // than tearing down already-torn-down global state.
    g_used_custom_loader = false;
}
