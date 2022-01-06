# Release Notes
## v0.1.7 - 2022-01-06

- Fixed:
  - Fixate lto-transactions to 1.2.12, since 1.2.13 has a problem with a non existing import
  
## v0.1.6 - 2021-11-26

- Feature:
  - Add log level support

## v0.1.5 - 2021-11-25

- Fixed:
  - fixed async flow

## v0.1.4 - 2021-11-22

- Fixed:
  - fixed main entry point, causing the module to be unusable from external packages

## v0.1.3 - 2021-11-22

- Fixed:
  - fixed utils export
  
## v0.1.2 - 2021-11-19

- Changed:
  - Export util methods

## v0.1.1 - 2021-11-09

- Changed:
  - Update to upstream version of lto-transactions, as DID changes have been integrated
  - Enable strict mode

## v0.1.0 - 2021-10-19

This is the first Alpha release of the LTO Network DID typescript library. Please note that the interfaces might still change a bit as the software still is in active development.

- Added:
  * Support to create a DID
  * Support to add verification methods
  * Allows for sponsored transactions
