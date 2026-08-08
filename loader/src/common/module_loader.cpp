#include "module_loader.hpp"

#include "dl.hpp"
#include "logging.hpp"

/*
 * Stage 1: the seam only. This routes both module load sites through a single
 * function while preserving the exact behaviour of the previous inline
 * `DlopenMem(memfd, RTLD_NOW)` + `dlsym(handle, "zygisk_module_entry")` pair.
 *
 * Stage 2 will add the in-process custom loader here, tried first and falling
 * back to this system-linker path on any failure, behind a build/runtime flag.
 * Keeping the fallback is what makes the custom path safe to iterate on: a bug
 * in it degrades to the working linker instead of failing to specialize the
 * process.
 */

static constexpr const char *ENTRY_SYMBOL = "zygisk_module_entry";

LoadedModule LoadModuleFromMemfd(int memfd) {
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
