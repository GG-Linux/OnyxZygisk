#pragma once

/*
 * Module loading seam.
 *
 * All Zygisk / FN module libraries are brought into the target process through
 * this one entry point. Today it wraps the system dynamic linker
 * (android_dlopen_ext, via DlopenMem). It exists so that an in-process custom
 * ELF loader — one that maps the module without registering it in the linker's
 * solist — can be dropped in behind a single interface, with the system linker
 * kept as an always-available fallback.
 *
 * See docs/CUSTOM_LINKER.md for the staged plan and the licensing constraint
 * (the custom loader is written from the public ELF/AArch64 ABI and Android's
 * Apache-2.0 bionic linker — it is NOT derived from any AGPL custom-linker
 * source).
 */

#include <dlfcn.h>

struct LoadedModule {
    /// Opaque handle for symbol lookups and, eventually, unloading.
    /// For the system-linker path this is the dlopen() handle.
    void *handle = nullptr;
    /// Resolved address of the module's `zygisk_module_entry` symbol, or null
    /// if the library failed to load or does not export the entry point.
    void *entry = nullptr;
    /// True once the in-process custom linker (not the system linker) produced
    /// this handle. Always false in the current stage.
    bool custom = false;

    /// A module is usable only if its entry point resolved.
    explicit operator bool() const { return entry != nullptr; }
};

/**
 * @brief Load a Zygisk/FN module library from a memfd and resolve its entry.
 *
 * @param memfd A file descriptor holding the shared library image.
 * @return The handle + resolved `zygisk_module_entry`; falsy if either the
 *         load or the symbol lookup failed.
 */
LoadedModule LoadModuleFromMemfd(int memfd);
