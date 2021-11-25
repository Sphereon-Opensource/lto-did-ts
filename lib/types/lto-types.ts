export enum LtoVerificationMethod {
  VerificationMethod = 0x0100,
  Authentication = 0x0101,
  Assertion = 0x0102,
  KeyAgreement = 0x0104,
  CapabilityInvocation = 0x0108,
  CapabilityDelegation = 0x0110,
}

export enum LogLevel {
  DEBUG,
  INFO,

  NONE = 99,
}
export enum Network {
  TESTNET = 'T',
  MAINNET = 'L',
}
