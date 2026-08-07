// src/root_impl/apatch.rs

//! Detection and interaction logic for the APatch root solution.
//!
//! APatch (https://github.com/bmax121/APatch) is a KernelPatch-based root
//! solution. This module mirrors the behavior of its `apd` daemon:
//!
//! * the daemon binary lives at `/data/adb/ap/bin/apd` and reports its version
//!   code via `apd -V`;
//! * per-package policy lives in `/data/adb/ap/package_config`, a CSV with the
//!   header `pkg,exclude,allow,uid,to_uid,sctx` (`to_uid` extends a grant to a
//!   uid range, which is how work profiles / multi-user setups are handled);
//! * the manager app is `me.bmax.apatch` and may live in any user profile.
//!
//! The kernel-side authorization (the supercall interface that requires the
//! SuperKey) is implemented in [`crate::supercall`].

use crate::constants::MIN_APATCH_VERSION;
use anyhow::{Context, Result};
use log::{debug, warn};
use std::os::unix::fs::MetadataExt;
use std::{
    fs,
    path::Path,
    process::{Command, Stdio},
};

/// The directory APatch installs its binaries into (upstream `defs::BINARY_DIR`).
const APD_BINARY: &str = "/data/adb/ap/bin/apd";
/// The CSV file holding per-package root/denylist policy.
pub const CONFIG_FILE: &str = "/data/adb/ap/package_config";
/// The package name of the APatch manager app.
const MANAGER_PKG: &str = "me.bmax.apatch";
/// The package name of the FolkPatch manager app (an APatch extended branch
/// that reuses the `apd` daemon and package_config layout).
const FOLKPATCH_PKG: &str = "me.yuki.folk";

/// How often to retry reading the package config before giving up. The config
/// is rewritten atomically (tmp + rename), but a reader can still catch the
/// moment between unlink and rename; upstream `apd` retries the same way.
const CONFIG_READ_RETRIES: u32 = 5;
const CONFIG_RETRY_DELAY: std::time::Duration = std::time::Duration::from_secs(1);

/// Represents the detected version status of APatch.
pub enum Version {
    Supported,
    TooOld,
}

/// A single row of the APatch package configuration, mirroring upstream
/// `apd::package::PackageConfig`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PackageConfig {
    pub pkg: String,
    /// Denylist: unmount module mounts for this app.
    pub exclude: bool,
    /// Root access granted.
    pub allow: bool,
    pub uid: i32,
    /// Upper bound of the granted uid range (`to_uid == uid` = single uid).
    pub to_uid: i32,
    /// SELinux context the app runs its root operations in.
    pub sctx: String,
}

impl PackageConfig {
    /// Whether a uid falls inside this entry's (possibly ranged) grant.
    pub fn uid_in_range(&self, uid: i32) -> bool {
        uid == self.uid || (self.to_uid > self.uid && (self.uid..=self.to_uid).contains(&uid))
    }
}

/// Parses one CSV line into fields, honoring double-quoted fields (RFC 4180:
/// a `""` inside a quoted field is a literal quote).
fn parse_csv_line(line: &str) -> Vec<String> {
    let mut fields = Vec::new();
    let mut field = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '"' if in_quotes => {
                if chars.peek() == Some(&'"') {
                    chars.next();
                    field.push('"');
                } else {
                    in_quotes = false;
                }
            }
            '"' => in_quotes = true,
            ',' if !in_quotes => {
                fields.push(std::mem::take(&mut field));
            }
            c => field.push(c),
        }
    }
    fields.push(field);
    fields
}

// The read path (uid_granted_root / uid_should_umount / uid_is_manager) is
// used by the daemon itself; the write path below (atomic config rewrite,
// per-package flag management) used to back the WebUI API and is kept with
// its tests as the canonical programmatic interface for APatch policy.

/// Serializes a field for CSV output, quoting it when necessary.
#[allow(dead_code)]
fn csv_escape(field: &str) -> String {
    if field.contains(',') || field.contains('"') || field.contains('\n') {
        format!("\"{}\"", field.replace('"', "\"\""))
    } else {
        field.to_string()
    }
}

/// Detects if APatch is installed and if its version is supported.
pub fn detect_version() -> Option<Version> {
    apd_version().map(|version_code| {
        if version_code >= MIN_APATCH_VERSION {
            Version::Supported
        } else {
            Version::TooOld
        }
    })
}

/// The version code reported by `apd -V` (clap prints `apd <VERSION_CODE>`);
/// the last whitespace token that parses as an integer is taken, tolerating
/// cosmetic changes in the banner.
pub fn apd_version() -> Option<i32> {
    let output = run_apd(&["-V"])?;
    String::from_utf8_lossy(&output)
        .split_whitespace()
        .filter_map(|token| token.parse::<i32>().ok())
        .last()
}

/// Runs `apd` with the given arguments, preferring the on-disk binary that
/// APatch itself installs over a PATH lookup.
fn run_apd(args: &[&str]) -> Option<Vec<u8>> {
    let mut command = if Path::new(APD_BINARY).is_file() {
        let mut c = Command::new(APD_BINARY);
        c.args(args);
        c
    } else {
        let mut c = Command::new("apd");
        c.args(args);
        c
    };
    command
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .ok()
        .and_then(|child| child.wait_with_output().ok())
        .map(|output| output.stdout)
}

/// Reads and parses the APatch package configuration, retrying briefly like
/// upstream `apd` does. Returns an empty list if the file is missing or
/// unreadable; malformed rows are skipped.
pub fn read_package_config() -> Vec<PackageConfig> {
    for attempt in 0..CONFIG_READ_RETRIES {
        match fs::read_to_string(CONFIG_FILE) {
            Ok(content) => return parse_package_config(&content),
            Err(e) => {
                debug!(
                    "APatch config read attempt {}/{} failed: {}",
                    attempt + 1,
                    CONFIG_READ_RETRIES,
                    e
                );
                if e.kind() != std::io::ErrorKind::NotFound {
                    std::thread::sleep(CONFIG_RETRY_DELAY);
                }
            }
        }
    }
    Vec::new()
}

/// Parses the package config text (header row skipped). Pure and testable.
pub fn parse_package_config(content: &str) -> Vec<PackageConfig> {
    let mut result = Vec::new();
    for (line_index, line) in content.lines().enumerate() {
        if line_index == 0 {
            continue; // header: pkg,exclude,allow,uid,to_uid,sctx
        }
        let parts = parse_csv_line(line);
        if parts.len() < 6 {
            continue;
        }
        match (
            parts[0].as_str(),
            parts[1].parse::<u8>(),
            parts[2].parse::<u8>(),
            parts[3].parse::<i32>(),
            parts[4].parse::<i32>(),
        ) {
            (pkg, Ok(exclude), Ok(allow), Ok(uid), Ok(to_uid)) if !pkg.is_empty() => {
                result.push(PackageConfig {
                    pkg: pkg.to_string(),
                    exclude: exclude == 1,
                    allow: allow == 1,
                    uid,
                    to_uid,
                    sctx: parts[5].clone(),
                });
            }
            _ => {
                warn!("Skipping malformed APatch config row on line {}", line_index + 1);
            }
        }
    }
    result
}

/// Atomically writes the package config (tmp file + rename), the same way
/// upstream `apd` does, so concurrent readers never see a torn file.
#[allow(dead_code)]
pub fn write_package_config(configs: &[PackageConfig]) -> Result<()> {
    let mut content = String::from("pkg,exclude,allow,uid,to_uid,sctx\n");
    for config in configs {
        content.push_str(&format!(
            "{},{},{},{},{},{}\n",
            csv_escape(&config.pkg),
            config.exclude as u8,
            config.allow as u8,
            config.uid,
            config.to_uid,
            csv_escape(&config.sctx),
        ));
    }
    let tmp_path = format!("{}.tmp", CONFIG_FILE);
    fs::write(&tmp_path, content).context("Failed to write APatch config tmp file")?;
    fs::rename(&tmp_path, CONFIG_FILE).context("Failed to replace APatch config file")?;
    Ok(())
}

/// Updates the allow/exclude flags of the entry matching `(pkg, uid)`,
/// inserting a new entry if none exists, and writes the config back.
#[allow(dead_code)]
/// `None` leaves the corresponding flag untouched.
pub fn set_package_flags(
    pkg: &str,
    uid: i32,
    allow: Option<bool>,
    exclude: Option<bool>,
) -> Result<()> {
    let mut configs = read_package_config();
    let entry = configs.iter_mut().find(|c| c.pkg == pkg && c.uid == uid);
    match entry {
        Some(entry) => {
            if let Some(allow) = allow {
                entry.allow = allow;
            }
            if let Some(exclude) = exclude {
                entry.exclude = exclude;
            }
        }
        None => {
            configs.push(PackageConfig {
                pkg: pkg.to_string(),
                exclude: exclude.unwrap_or(false),
                allow: allow.unwrap_or(false),
                uid,
                to_uid: uid,
                sctx: String::new(),
            });
        }
    }
    write_package_config(&configs)
}

#[allow(dead_code)]
/// Removes the entry matching `(pkg, uid)` (all entries for the package if
/// `uid` is `None`) and writes the config back.
pub fn remove_package(pkg: &str, uid: Option<i32>) -> Result<()> {
    let mut configs = read_package_config();
    configs.retain(|c| match uid {
        Some(uid) => !(c.pkg == pkg && c.uid == uid),
        None => c.pkg != pkg,
    });
    write_package_config(&configs)
}

/// Checks if a UID is configured to have root access in APatch.
pub fn uid_granted_root(uid: i32) -> bool {
    read_package_config()
        .iter()
        .any(|pkg| pkg.allow && pkg.uid_in_range(uid))
}

/// Checks if a UID is on the denylist (module mounts unmounted) in APatch.
pub fn uid_should_umount(uid: i32) -> bool {
    read_package_config()
        .iter()
        .any(|pkg| pkg.exclude && pkg.uid_in_range(uid))
}

/// Checks if a UID belongs to the APatch / FolkPatch manager app.
///
/// The manager may be installed for any user profile, so both `/data/user`
/// and `/data/user_de` are scanned (the device owner's profile is `/data/user/0`).
/// FolkPatch (an APatch extended branch) keeps the same `apd`/package_config
/// layout but ships its Manager under `me.yuki.folk`.
pub fn uid_is_manager(uid: i32) -> bool {
    for base in ["/data/user_de", "/data/user"] {
        if let Ok(users) = fs::read_dir(base) {
            for user in users.flatten() {
                for pkg in [MANAGER_PKG, FOLKPATCH_PKG] {
                    let path = user.path().join(pkg);
                    if let Ok(metadata) = fs::metadata(path) {
                        if metadata.uid() == uid as u32 {
                            return true;
                        }
                    }
                }
            }
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_CONFIG: &str = "pkg,exclude,allow,uid,to_uid,sctx\n\
         com.example.app,0,1,10123,10123,\n\
         \"com.quoted,app\",1,0,10234,10399,u:r:su:s0\n";

    #[test]
    fn parses_csv_with_quoted_fields() {
        let configs = parse_package_config(SAMPLE_CONFIG);
        assert_eq!(configs.len(), 2);
        assert_eq!(configs[0].pkg, "com.example.app");
        assert_eq!(configs[0].allow, true);
        assert_eq!(configs[0].exclude, false);
        assert_eq!(configs[0].uid, 10123);
        assert_eq!(configs[0].to_uid, 10123);
        // Quoted field survives with the comma intact.
        assert_eq!(configs[1].pkg, "com.quoted,app");
        assert_eq!(configs[1].exclude, true);
        assert_eq!(configs[1].sctx, "u:r:su:s0");
    }

    #[test]
    fn matches_uid_ranges() {
        let configs = parse_package_config(SAMPLE_CONFIG);
        let single = &configs[0];
        let ranged = &configs[1];
        assert!(single.uid_in_range(10123));
        assert!(!single.uid_in_range(10124));
        assert!(ranged.uid_in_range(10234));
        assert!(ranged.uid_in_range(10399));
        assert!(ranged.uid_in_range(10300));
        assert!(!ranged.uid_in_range(10400));
    }

    #[test]
    fn skips_malformed_rows() {
        let config = "pkg,exclude,allow,uid,to_uid,sctx\n\
             ,0,1,10123,10123,\n\
             com.x,notanumber,0,1,1,\n\
             com.y,0,1,1,1\n\
             com.z,0,1,10124,10124,\n";
        let configs = parse_package_config(config);
        assert_eq!(configs.len(), 1);
        assert_eq!(configs[0].pkg, "com.z");
    }

    #[test]
    fn round_trips_through_writer() {
        let configs = parse_package_config(SAMPLE_CONFIG);
        let mut content = String::from("pkg,exclude,allow,uid,to_uid,sctx\n");
        for c in &configs {
            content.push_str(&format!(
                "{},{},{},{},{},{}\n",
                csv_escape(&c.pkg),
                c.exclude as u8,
                c.allow as u8,
                c.uid,
                c.to_uid,
                csv_escape(&c.sctx),
            ));
        }
        let reparsed = parse_package_config(&content);
        assert_eq!(reparsed, configs);
    }

    #[test]
    fn empty_config_parses_to_empty_list() {
        assert!(parse_package_config("pkg,exclude,allow,uid,to_uid,sctx\n").is_empty());
        assert!(parse_package_config("").is_empty());
    }
}
