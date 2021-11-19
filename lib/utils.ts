import { buildAddress } from '@lto-network/lto-crypto'
import { base16Decode, base16Encode, base58Decode, base58Encode } from '@waves/ts-lib-crypto'

import { Network } from './types'

export function deriveAddressFromPublicKeyBase58(base58: string, network: Network | string) {
  const pk = base58Decode(base58)
  return base58Encode(buildAddress(pk, network))
}

export function deriveAddressFromPublicKeyHex(hex: string, network: Network | string) {
  const pk = base16Decode(hex)
  return base58Encode(buildAddress(pk, network))
}

export function hexToBase58(hex: string) {
  return base58Encode(base16Decode(hex))
}

export function base58ToHex(base58: string) {
  return base16Encode(base58Decode(base58))
}
