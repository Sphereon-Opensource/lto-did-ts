import { base58encode } from '@lto-network/lto-crypto'
import { LTO } from 'lto-api'
import nock from 'nock'

import {
  base58ToHex,
  deriveAddressFromPublicKeyBase58,
  deriveAddressFromPublicKeyHex,
  DIDService,
  hexToBase58,
  LtoVerificationMethod,
  Network,
} from '../lib'

const sponsorPrivateKeyBase58 = hexToBase58(
  'ea6aaeebe17557e0fe256bfce08e8224a412ea1e25a5ec8b5d69618a58bad89e89a4661e446b46401325a38d3b20582d1dd277eb448a3181012a671b7ae15837'
)
// 5gqCU5NbwU4gc62be39LXDDALKj8opj1KZszx7ULJc2k33kk52prn8D1H2pPPwm6QVKvkuo72YJSoUhzzmAFmDH8
const lto = new LTO(Network.TESTNET, 'https://testnet.lto.network')
const sponsorAccount = lto.createAccountFromPrivateKey(sponsorPrivateKeyBase58)
const didAccount = lto.createAccount() //lto.createAccountFromExistingPhrase('one 2 three 4 five'/*'df3dd6d884714288a39af0bd973a1771c9f00f168cf040d6abb6a50dd5e055d8'*/);
const didPrivateKeyBase58 = base58encode(didAccount.sign.privateKey)
const didPublicKeyBase58 = base58encode(didAccount.sign.publicKey)
const didPrivateKeyHex = base58ToHex(didPrivateKeyBase58)
const didPublicKeyHex = base58ToHex(didPublicKeyBase58)

console.log(`did:lto:${didAccount.address}`)
console.log(`private key base58: '${didPrivateKeyBase58}', hex: '${didPrivateKeyHex}'`)
console.log(`public  key base58: '${didPublicKeyBase58}', hex: '${didPublicKeyHex}'`)

nock(`https://nonexisting.resolver.for.dids/1.0/identifiers/did:lto:${sponsorAccount.address}`)
  .get(/.*/)
  .reply(200, {
    didDocument: {
      id: `did:lto:${sponsorAccount.address}`,
    },
  })
nock(`https://nonexisting.resolver.for.dids/1.0/identifiers/did:lto:${didAccount.address}`)
  .get(/.*/)
  .reply(200, {
    didDocument: {
      id: `did:lto:${didAccount.address}`,
    },
  })

jest.setTimeout(500000)

describe('creating a sponsored DID', () => {
  it('should work', async () => {
    const did = new DIDService({
      sponsorPrivateKeyBase58,
      didPrivateKeyBase58,
      network: Network.TESTNET,
      uniResolverUrl: 'https://nonexisting.resolver.for.dids',
    })

    await expect(did.createDID({ verificationMethods: [LtoVerificationMethod.Assertion, LtoVerificationMethod.Authentication] })).resolves.toContain(
      `did:lto:${didAccount.address}`
    )

    expect(did.didAccount()).toBeTruthy()
    expect(did.did()).toEqual(`did:lto:${did.didAccount().address}`)

    console.log(`Main DID: ${did.did()}`)

    // await new Promise((resolve) => setTimeout(resolve, 10000));
    const vmAccount = await did.addVerificationMethod({
      verificationMethod: LtoVerificationMethod.CapabilityInvocation,
      createVerificationDID: true,
    })

    expect(did.verificationMethodAccounts()).toContain(vmAccount)

    console.log(`Key Agreement account: ${vmAccount.address}`)
    const resolved = await did.resolve()
    console.log(JSON.stringify(resolved))
  })
})

describe('low level functions should', () => {
  const base58PublicKey = base58encode(sponsorAccount.sign.publicKey)
  it('return the correct address for a b58 private key', () => {
    expect(deriveAddressFromPublicKeyBase58(base58PublicKey, Network.TESTNET)).toEqual(sponsorAccount.address)
  })

  it('return correct b58 <-> hex conversions', () => {
    expect(hexToBase58(base58ToHex(base58PublicKey))).toEqual(base58PublicKey)
  })

  it('return the correct address for a hex private key', () => {
    expect(deriveAddressFromPublicKeyHex(base58ToHex(base58PublicKey), Network.TESTNET)).toEqual(sponsorAccount.address)
  })
})
