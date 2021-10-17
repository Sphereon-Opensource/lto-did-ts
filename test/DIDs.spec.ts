import { DID, hexToBase58 } from '../lib/DIDs';
import { LtoVerificationMethod, Network } from '../lib/types/lto-types';

// const nock = require('nock');

jest.setTimeout(20000);
describe('creating a sponsored DID', () => {
  it('should work', async () => {
    const sponsorPrivateKeyBase58 = hexToBase58(
      'ea6aaeebe17557e0fe256bfce08e8224a412ea1e25a5ec8b5d69618a58bad89e89a4661e446b46401325a38d3b20582d1dd277eb448a3181012a671b7ae15837'
    );
    const did = new DID({ network: Network.TESTNET, sponsorPrivateKeyBase58, uniResolverUrl: 'https://uniresolver.test.sphereon.io' });

    await expect(did.createDID({})).resolves.toContain('did:lto:');

    expect(did.account()).toBeTruthy();
    expect(did.value()).toEqual(`did:lto:${did.account().address}`);

    const vmAccount = await did.addVerificationMethod({
      verificationMethod: LtoVerificationMethod.CapabilityDelegation,
      createVerificationDID: true,
    });

    console.log(`Key Agreement account: ${vmAccount.address}`);
    await new Promise((r) => setTimeout(r, 10000));

    const resolved = await did.resolve();
    console.log(JSON.stringify(resolved));
  });
});
