cmake_minimum_required(VERSION 3.22.1)
project("loader")

set(CMAKE_CXX_STANDARD 23)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

add_definitions(-DZKSU_VERSION=\"${ZKSU_VERSION}\")

# The work directory comes in as a plain CMake variable from the Gradle build
# (`-DWORK_DIRECTORY=...`); the `\"` escaping produces a C string literal.
# Quoting inside the Gradle cFlags is fragile across host OSes.
add_definitions(-DWORK_DIRECTORY=\"${WORK_DIRECTORY}\")

aux_source_directory(common COMMON_SRC_LIST)
add_library(common STATIC ${COMMON_SRC_LIST})
target_include_directories(common PRIVATE include)
target_link_libraries(common log)

aux_source_directory(injector INJECTOR_SRC_LIST)
add_library(zygisk SHARED ${INJECTOR_SRC_LIST})
target_compile_options(zygisk PRIVATE -Wno-invalid-offsetof -Wno-unused-private-field)
target_include_directories(zygisk PRIVATE include)
target_link_libraries(zygisk log common lsplt_static csoloader)

aux_source_directory(ptracer PTRACER_SRC_LIST)
add_executable(libzygisk_ptrace.so ${PTRACER_SRC_LIST})
target_include_directories(libzygisk_ptrace.so PRIVATE include)
target_link_libraries(libzygisk_ptrace.so log common)

add_subdirectory(external)
