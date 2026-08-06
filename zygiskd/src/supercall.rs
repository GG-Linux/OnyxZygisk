// src/supercall.rs

//! APatch kernel supercall interface.
//!
//! APatch's root authorization lives in the kernel (KernelPatch). The kernel
//! exposes a "supercall" — a `syscall(45, key, ver_and_cmd(cmd), arg)` on
//! arm64 — that only processes requests authenticated with the **SuperKey**.
//! Everything in this module mirrors `apd/src/supercall.rs` from the upstream
//! [APatch](https://github.com/bmax121/APatch) project byte for byte:
//!
//! * command numbers (`SUPERCALL_SU_*`, `KSTORAGE_EXCLUDE_LIST_GROUP`)
//! * the `ver_and_cmd` version handshake (`0x1158` magic, KPatch 0.11.1)
//! * the `SuProfile` struct layout (`uid`, `to_uid`, `scontext[0x60]`)
//!
//! The SuperKey itself is never stored by the daemon; the WebUI keeps it in
//! memory only and passes it to these functions for the duration of one call.
//!
//! There is currently no live caller: the loopback HTTP API that exposed these
//! operations was removed in favor of the KernelSU `webroot` convention
//! (static pages loaded by the root manager apps). The interface is kept —
//! fully tested and aligned with upstream — as the canonical way to drive
//! APatch authorization from any future management surface.
#![allow(dead_code)]

use anyhow::{Result, bail};
use log::{debug, error};
use std::ffi::{CStr, CString};

/// The syscall number KernelPatch hijacks for its supercall (arm64 only).
#[cfg(target_arch = "aarch64")]
pub const NR_SUPERCALL: libc::c_long = 45;
#[cfg(not(target_arch = "aarch64"))]
pub const NR_SUPERCALL: libc::c_long = -1;

// Supercall command numbers, from KernelPatch's `supercalls.h`. `SUPERCALL_SU`
// (the raw `su` authorization) and `SUPERCALL_SU_RESET_PATH` are part of the
// complete upstream interface and kept here for API completeness, even though
// the daemon only exercises the management subset.
#[allow(dead_code)]
const SUPERCALL_SU: libc::c_long = 0x1010;
const SUPERCALL_KSTORAGE_WRITE: libc::c_long = 0x1041;
const SUPERCALL_SU_GRANT_UID: libc::c_long = 0x1100;
const SUPERCALL_SU_REVOKE_UID: libc::c_long = 0x1101;
const SUPERCALL_SU_NUMS: libc::c_long = 0x1102;
const SUPERCALL_SU_LIST: libc::c_long = 0x1103;
#[allow(dead_code)]
const SUPERCALL_SU_RESET_PATH: libc::c_long = 0x1111;
const SUPERCALL_SU_GET_SAFEMODE: libc::c_long = 0x1112;

/// kstorage group id for the module-exclude (denylist) list.
const KSTORAGE_EXCLUDE_LIST_GROUP: i32 = 1;

/// The size of the SELinux context buffer inside `SuProfile`.
pub const SCONTEXT_LEN: usize = 0x60;

/// KPatch version encoded in every supercall command; must match the kernel's.
const KPATCH_MAJOR: libc::c_long = 0;
const KPATCH_MINOR: libc::c_long = 11;
const KPATCH_PATCH: libc::c_long = 1;

/// Builds the 64-bit `ver_and_cmd` handshake value: the upper 32 bits carry
/// the KPatch version, the lower 32 bits the magic `0x1158` plus the command.
///
/// The arithmetic happens in `u64` because on 32-bit targets (armv7) `c_long`
/// is only 32 bits wide; the value is then narrowed. The supercall itself is
/// arm64-only (`NR_SUPERCALL` is -1 elsewhere), so the truncation only ever
/// matters for dead code paths.
pub fn ver_and_cmd(cmd: libc::c_long) -> libc::c_long {
    let version_code: u32 = ((KPATCH_MAJOR << 16) + (KPATCH_MINOR << 8) + KPATCH_PATCH)
        .try_into()
        .unwrap();
    let value: u64 = ((version_code as u64) << 32)
        | (0x1158u64 << 16)
        | ((cmd as u64) & 0xFFFF);
    value as libc::c_long
}

/// The root-grant profile passed to `SUPERCALL_SU_GRANT_UID`.
/// The `scontext` is the SELinux context that the granted process will run as.
#[repr(C)]
pub struct SuProfile {
    pub uid: i32,
    pub to_uid: i32,
    pub scontext: [u8; SCONTEXT_LEN],
}

impl SuProfile {
    /// Builds a profile with the given uid range and an empty scontext
    /// (the kernel then keeps the caller's context).
    pub fn new(uid: i32, to_uid: i32) -> Self {
        Self {
            uid,
            to_uid,
            scontext: [0; SCONTEXT_LEN],
        }
    }
}

/// Converts a raw supercall return value into a `Result`. Negative values are
/// negated errno codes, exactly like the kernel reports them.
fn check(ret: libc::c_long, what: &str) -> Result<libc::c_long> {
    if ret < 0 {
        let errno = (-ret) as i32;
        error!("supercall {what} failed: {}", std::io::Error::from_raw_os_error(errno));
        bail!("supercall {what} failed: {}", std::io::Error::from_raw_os_error(errno));
    }
    Ok(ret)
}

fn require_key(key: &CStr) -> Result<()> {
    if key.to_bytes().is_empty() {
        bail!("empty superkey");
    }
    Ok(())
}

/// Returns the number of UIDs currently granted root.
pub fn uid_nums(key: &CStr) -> Result<u32> {
    require_key(key)?;
    if NR_SUPERCALL < 0 {
        bail!("supercall is only available on arm64");
    }
    let ret = check(
        unsafe {
            libc::syscall(
                NR_SUPERCALL,
                key.as_ptr(),
                ver_and_cmd(SUPERCALL_SU_NUMS),
            )
        },
        "SU_NUMS",
    )?;
    Ok(ret as u32)
}

/// Fills `buf` with the UIDs currently granted root; returns how many were written.
pub fn allow_uids(key: &CStr, buf: &mut [u32]) -> Result<u32> {
    require_key(key)?;
    if NR_SUPERCALL < 0 {
        bail!("supercall is only available on arm64");
    }
    if buf.is_empty() {
        return Ok(0);
    }
    let ret = check(
        unsafe {
            libc::syscall(
                NR_SUPERCALL,
                key.as_ptr(),
                ver_and_cmd(SUPERCALL_SU_LIST),
                buf.as_mut_ptr(),
                buf.len() as i32,
            )
        },
        "SU_LIST",
    )?;
    Ok(ret as u32)
}

/// Lists all UIDs granted root (queries the count first, then the list).
pub fn list_uids(key: &CStr) -> Result<Vec<u32>> {
    let nums = uid_nums(key)?;
    let mut buf = vec![0u32; nums as usize];
    let written = allow_uids(key, &mut buf)?;
    buf.truncate(written as usize);
    debug!("supercall SU_LIST returned {} uids", buf.len());
    Ok(buf)
}

/// Grants root to a uid range. `to_uid == uid` grants a single uid.
pub fn grant_uid(key: &CStr, profile: &SuProfile) -> Result<()> {
    require_key(key)?;
    if NR_SUPERCALL < 0 {
        bail!("supercall is only available on arm64");
    }
    check(
        unsafe {
            libc::syscall(
                NR_SUPERCALL,
                key.as_ptr(),
                ver_and_cmd(SUPERCALL_SU_GRANT_UID),
                profile,
            )
        },
        "SU_GRANT_UID",
    )?;
    Ok(())
}

/// Revokes root from a uid.
pub fn revoke_uid(key: &CStr, uid: u32) -> Result<()> {
    require_key(key)?;
    if NR_SUPERCALL < 0 {
        bail!("supercall is only available on arm64");
    }
    check(
        unsafe {
            libc::syscall(
                NR_SUPERCALL,
                key.as_ptr(),
                ver_and_cmd(SUPERCALL_SU_REVOKE_UID),
                uid,
            )
        },
        "SU_REVOKE_UID",
    )?;
    Ok(())
}

/// Queries the kernel safe-mode flag. Mirrors upstream: an empty key reports
/// "not in safe mode" instead of failing.
pub fn safemode(key: &CStr) -> Result<bool> {
    if key.to_bytes().is_empty() {
        return Ok(false);
    }
    if NR_SUPERCALL < 0 {
        bail!("supercall is only available on arm64");
    }
    let ret = check(
        unsafe {
            libc::syscall(
                NR_SUPERCALL,
                key.as_ptr(),
                ver_and_cmd(SUPERCALL_SU_GET_SAFEMODE),
            )
        },
        "SU_GET_SAFEMODE",
    )?;
    Ok(ret == 1)
}

/// Adds/removes a uid to/from the kernel's module-exclude (denylist) group,
/// which controls whether APatch unmounts modules for that app.
pub fn set_exclude(key: &CStr, uid: u32, exclude: bool) -> Result<()> {
    require_key(key)?;
    if NR_SUPERCALL < 0 {
        bail!("supercall is only available on arm64");
    }
    let value = exclude as i32;
    check(
        unsafe {
            libc::syscall(
                NR_SUPERCALL,
                key.as_ptr(),
                ver_and_cmd(SUPERCALL_KSTORAGE_WRITE),
                KSTORAGE_EXCLUDE_LIST_GROUP as libc::c_long,
                uid as libc::c_long,
                &value as *const i32 as *mut libc::c_void,
                (((0 as i64) << 32) | std::mem::size_of::<i32>() as i64) as libc::c_long,
            )
        },
        "KSTORAGE_WRITE(exclude)",
    )?;
    Ok(())
}

/// Resets the `su` binary path registered in the kernel.
#[allow(dead_code)]
pub fn reset_su_path(key: &CStr, path: &str) -> Result<()> {
    require_key(key)?;
    if NR_SUPERCALL < 0 {
        bail!("supercall is only available on arm64");
    }
    if path.is_empty() {
        bail!("empty su path");
    }
    let path = CString::new(path)?;
    check(
        unsafe {
            libc::syscall(
                NR_SUPERCALL,
                key.as_ptr(),
                ver_and_cmd(SUPERCALL_SU_RESET_PATH),
                path.as_ptr(),
            )
        },
        "SU_RESET_PATH",
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encodes_ver_and_cmd_like_upstream() {
        // Hand-computed from the upstream formula:
        // version_code = (0 << 16) + (11 << 8) + 1 = 0xB01
        // (0xB01 << 32) | (0x1158 << 16) | 0x1100
        let expected = ((0xB01u64 << 32) | (0x1158 << 16) | 0x1100) as libc::c_long;
        assert_eq!(ver_and_cmd(SUPERCALL_SU_GRANT_UID), expected);
        // The lower 16 bits carry the command, the rest of the magic is fixed.
        assert_eq!(ver_and_cmd(0x1102) & 0xFFFF, 0x1102);
        assert_eq!(((ver_and_cmd(0) as u64) >> 16) & 0xFFFF, 0x1158);
        assert_eq!(((ver_and_cmd(0) as u64) >> 32) & 0xFFFF, 0xB01);
    }

    #[test]
    fn rejects_empty_key_before_syscall() {
        let key = CString::new("").unwrap();
        assert!(uid_nums(&key).is_err());
        let mut buf = [0u32; 4];
        assert!(allow_uids(&key, &mut buf).is_err());
        assert!(grant_uid(&key, &SuProfile::new(0, 0)).is_err());
        assert!(revoke_uid(&key, 0).is_err());
        assert!(set_exclude(&key, 0, true).is_err());
        // safemode() with an empty key reports false instead of failing.
        assert_eq!(safemode(&key).unwrap(), false);
    }

    #[test]
    fn profile_layout_matches_kernel() {
        assert_eq!(std::mem::size_of::<SuProfile>(), 8 + SCONTEXT_LEN);
        let p = SuProfile::new(10123, 10123);
        assert_eq!(p.uid, 10123);
        assert_eq!(p.to_uid, 10123);
        assert!(p.scontext.iter().all(|&b| b == 0));
    }
}
