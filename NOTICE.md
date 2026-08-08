# Licensing notice

OnyxZygisk as a whole is distributed under the **GNU Affero General Public
License v3.0** (`LICENSE`).

The project incorporates several works under their own licenses:

| Component | Path | License |
| :--- | :--- | :--- |
| CSOLoader (in-process ELF loader) | `loader/src/external/csoloader/` | AGPL-3.0 |
| NeoZygisk (the base OnyxZygisk forked from) | most of `loader/`, `zygiskd/`, `module/` | GPL-3.0 |
| LSPlt (PLT hooking) | `loader/src/external/lsplt/` | its own license, retained |

## Why the combined work is AGPL-3.0

OnyxZygisk began as a downstream of NeoZygisk (GPL-3.0). Integrating CSOLoader
(AGPL-3.0) as the in-process custom module loader brings AGPL-3.0 code into the
combined work. Section 13 of the GPL-3.0 explicitly permits linking a
GPL-3.0 work with an AGPL-3.0 work; the resulting combination is conveyed under
the AGPL-3.0, whose additional network-interaction source-offer requirement then
applies to the whole.

The original GPL-3.0 files retain their own copyright notices and GPL-3.0
terms; nothing here removes NeoZygisk's or any upstream author's attribution.
Distributing OnyxZygisk means complying with the AGPL-3.0 for the combined work.

See `docs/CUSTOM_LINKER.md` for how CSOLoader is used.
