import { base58encode } from '@lto-network/lto-crypto';
import { LTO } from 'lto-api';
import nock from 'nock';

import { base58ToHex, deriveAddressFromPublicKeyBase58, deriveAddressFromPublicKeyHex, DID, hexToBase58 } from '../lib/DIDs';
import { LtoVerificationMethod, Network } from '../lib/types/lto-types';

const sponsorPrivateKeyBase58 = hexToBase58(
  'ea6aaeebe17557e0fe256bfce08e8224a412ea1e25a5ec8b5d69618a58bad89e89a4661e446b46401325a38d3b20582d1dd277eb448a3181012a671b7ae15837'
);
const lto = new LTO(Network.TESTNET, 'https://testnet.lto.com');
const sponsorAccount = lto.createAccountFromPrivateKey(sponsorPrivateKeyBase58);
const didAccount = lto.createAccountFromExistingPhrase('one two three four five six seven eight nine ten');
const didPrivateKeyBase58 = base58encode(didAccount.sign.privateKey);

nock(`https://nonexisting.resolver.for.dids/1.0/identifiers/did:lto:${sponsorAccount.address}`)
  .get(/.*/)
  .reply(200, {
    didDocument: {
      id: `did:lto:${sponsorAccount.address}`,
    },
  });
nock(`https://nonexisting.resolver.for.dids/1.0/identifiers/did:lto:${didAccount.address}`)
  .get(/.*/)
  .reply(200, {
    didDocument: {
      id: `did:lto:${didAccount.address}`,
    },
  });

jest.setTimeout(20000);

describe('creating a sponsored DID', () => {
  it('should work', async () => {
    const did = new DID({
      sponsorPrivateKeyBase58,
      didPrivateKeyBase58,
      network: Network.TESTNET,
      uniResolverUrl: 'https://nonexisting.resolver.for.dids',
    });

    await expect(did.createDID({})).resolves.toContain(`did:lto:${didAccount.address}`);

    expect(did.account()).toBeTruthy();
    expect(did.value()).toEqual(`did:lto:${did.account().address}`);

    const vmAccount = await did.addVerificationMethod({
      verificationMethod: LtoVerificationMethod.CapabilityDelegation,
      createVerificationDID: true,
    });

    expect(did.verificationMethodAccounts()).toContain(vmAccount);

    console.log(`Key Agreement account: ${vmAccount.address}`);
    const resolved = await did.resolve();
    console.log(JSON.stringify(resolved));
  });
});

describe('low level functions should', () => {
  const base58PublicKey = base58encode(sponsorAccount.sign.publicKey);
  it('return the correct address for a b58 private key', () => {
    expect(deriveAddressFromPublicKeyBase58(base58PublicKey, Network.TESTNET)).toEqual(sponsorAccount.address);
  });

  it('return correct b58 <-> hex conversions', () => {
    expect(hexToBase58(base58ToHex(base58PublicKey))).toEqual(base58PublicKey);
  });

  it('return the correct address for a hex private key', () => {
    expect(deriveAddressFromPublicKeyHex(base58ToHex(base58PublicKey), Network.TESTNET)).toEqual(sponsorAccount.address);
  });
});
