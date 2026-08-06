#pragma once

#include <unistd.h>

#include <cstdint>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

#if defined(__LP64__)
#define LP_SELECT(lp32, lp64) lp64
#else
#define LP_SELECT(lp32, lp64) lp32
#endif

constexpr auto kCPSocketName = "/" LP_SELECT("cp32", "cp64") ".sock";

class UniqueFd {
    using Fd = int;

public:
    UniqueFd() = default;

    UniqueFd(Fd fd) : fd_(fd) {}

    ~UniqueFd() {
        if (fd_ >= 0) close(fd_);
    }

    // Disallow copy
    UniqueFd(const UniqueFd&) = delete;

    UniqueFd& operator=(const UniqueFd&) = delete;

    // Allow move
    UniqueFd(UniqueFd&& other) { std::swap(fd_, other.fd_); }

    UniqueFd& operator=(UniqueFd&& other) {
        std::swap(fd_, other.fd_);
        return *this;
    }

    // Implict cast to Fd
    operator const Fd&() const { return fd_; }

private:
    Fd fd_ = -1;
};

namespace zygiskd {

struct Module {
    std::string name;
    UniqueFd memfd;

    inline explicit Module(std::string name, int memfd) : name(name), memfd(memfd) {}
};

/// An FN (Functional Node) module as streamed by the daemon's ReadFnModules.
struct FnModule {
    std::string id;
    /// Comma-separated trigger list (post_fs_data, boot, zygote, system_server, app).
    std::string triggers;
    /// Targeting scope: 0 = all, 1 = allowlist, 2 = denylist.
    uint8_t scope;
    /// Comma-separated package list, interpreted per `scope`.
    std::string apps;
    /// Lower loads earlier.
    uint32_t priority;
    UniqueFd memfd;

    inline FnModule(std::string id, std::string triggers, uint8_t scope, std::string apps,
                    uint32_t priority, int memfd)
        : id(std::move(id)),
          triggers(std::move(triggers)),
          scope(scope),
          apps(std::move(apps)),
          priority(priority),
          memfd(memfd) {}
};

enum class SocketAction {
    PingHeartbeat,
    GetProcessFlags,
    CacheMountNamespace,
    UpdateMountNamespace,
    ReadModules,
    RequestCompanionSocket,
    GetModuleDir,
    ZygoteRestart,
    SystemServerStarted,
    // Values must match the daemon's DaemonSocketAction (zygiskd/src/constants.rs).
    // The manager-facing actions (ListFnNodes/SetFnNodeEnabled/RemoveFnNode) are
    // not used by the loader, so their slots are skipped here.
    ReadFnModules = 12,
    GetFnModuleDir = 13,
};

enum class MountNamespace { Clean, Root };

void Init(const char* path);

std::string GetTmpPath();

int Connect(uint8_t retry);

bool PingHeartbeat();

std::vector<Module> ReadModules();

std::vector<FnModule> ReadFnModules();

int GetFnModuleDir(const std::string &id);

uint32_t GetProcessFlags(uid_t uid);

void CacheMountNamespace(pid_t pid);

int UpdateMountNamespace(MountNamespace type);

int ConnectCompanion(size_t index);

int GetModuleDir(size_t index);

void ZygoteRestart();

void SystemServerStarted();
}  // namespace zygiskd
