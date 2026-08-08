project(external)

OPTION(LSPLT_BUILD_SHARED OFF)
add_subdirectory(lsplt/lsplt/src/main/jni)

# CSOLoader — traceless, system-linker-independent ELF loader (AGPL-3.0).
# Vendored as a git submodule; builds a static `csoloader` target from its own
# CMakeLists. Its presence makes the combined work AGPL-3.0 — see LICENSE.
add_subdirectory(csoloader)
