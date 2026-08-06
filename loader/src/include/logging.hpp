#pragma once

#include <android/log.h>
#include <errno.h>

#ifndef LOG_TAG
#if defined(__LP64__)
#define LOG_TAG "zygisk-core64"
#else
#define LOG_TAG "zygisk-core32"
#endif
#endif

#include "../external/lsplt/lsplt/src/main/jni/logging.hpp"
