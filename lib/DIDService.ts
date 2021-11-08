import { base58encode, buildAddress, signWithPrivateKey } from '@lto-network/lto-crypto';
import { anchor, broadcast, IAnchorTransaction, invokeAssociation, WithId } from '@lto-network/lto-transactions';
import { addProof } from '@lto-network/lto-transactions/dist/generic';
import { binary } from '@lto-network/lto-transactions/dist/parseSerialize';
import { IAssociationTransactionV3 } from '@lto-network/lto-transactions/dist/transactions';
import { DIDResolutionResult, UniResolver } from '@sphereon/did-uni-client';
import { base16Decode, base16Encode, base58Decode, base58Encode } from '@waves/ts-lib-crypto';
import { Account, LTO as LTOApi } from 'lto-api';

import { LtoVerificationMethod, Network } from './types';

export class DIDService {
  private readonly _rpcUrl: string;
  private readonly _network?: Network | string;
  private readonly _didAccount: Account;
  private readonly _sponsorAccount: Account | undefined;
  private _verificationMethodAccounts: Account[] = [];
  private _uniResolverUrl: string;
  public constructor({
    network,
    rpcUrl,
    uniResolverUrl,
    didPrivateKeyBase58,
    sponsorPrivateKeyBase58,
  }: {
    network?: Network | string;
    rpcUrl?: string;
    uniResolverUrl?: string;
    didPrivateKeyBase58?: string;
    sponsorPrivateKeyBase58?: string;
  }) {
    this._uniResolverUrl = uniResolverUrl || 'https://dev.uniresolver.io';
    // We store the network and rpc url because LTO constructor uses a global configuration object, so we recreate it every time
    this._network = network || Network.TESTNET;
    this._rpcUrl = rpcUrl || 'https://testnet.lto.network';
    this._didAccount = this.createAccount(didPrivateKeyBase58);
    this._sponsorAccount = this.createSponsorAccount({
      didPrivateKeyBase58,
      sponsorPrivateKeyBase58,
    });
  }

  public async createDID(_opts?: { verificationMethods?: LtoVerificationMethod[]; _didAccount?: Account }): Promise<string> {
    const account = _opts?._didAccount ? _opts._didAccount : this._didAccount;
    const txParams = {
      version: 3,
      chainId: this.lto().networkByte.charCodeAt(0),
      senderPublicKey: base58encode(account.sign.publicKey),
      anchors: ['1111111111111111'], // We are anchoring something random as a zero-anchor DID is not possible
    };
    const tx = anchor(txParams);
    DIDService.addProofs(tx, account, this._sponsorAccount);
    await broadcast(tx, this._rpcUrl);

    console.log(`DID creation tx: ${tx.id} for ${account.address}`);
    if (_opts?.verificationMethods && _opts.verificationMethods.length > 0) {
      _opts.verificationMethods.forEach((verificationMethod) => this.addVerificationMethod({ verificationMethod, createVerificationDID: true }));
    }
    return `did:lto:${account.address}`;
  }

  public async addVerificationMethod(opts: {
    verificationMethodPrivateKeyBase58?: string;
    verificationMethod: LtoVerificationMethod;
    createVerificationDID?: boolean;
  }): Promise<Account> {
    const { verificationMethod } = opts;
    const vmAccount = this.createAccount(opts.verificationMethodPrivateKeyBase58);
    if (opts.createVerificationDID) {
      const verificationDid = await new DIDService({
        network: this._network,
        rpcUrl: this._rpcUrl,
        sponsorPrivateKeyBase58: this._sponsorAccount ? base58encode(this._sponsorAccount.sign.privateKey) : undefined,
        didPrivateKeyBase58: base58encode(vmAccount.sign.privateKey),
      }).createDID({ _didAccount: vmAccount });
      console.log(`Verification method did: ${verificationDid}`);
    }

    const txParams = {
      version: 3,
      recipient: vmAccount.address,
      expires: 0,
      sender: this._didAccount.address,
      hash: '',
      senderKeyType: 'ed25519',
      senderPublicKey: base58encode(this._didAccount.sign.publicKey),
      associationType: verificationMethod,
    };
    const tx = invokeAssociation(txParams) as IAssociationTransactionV3 & WithId;

    DIDService.addProofs(tx, this._didAccount, this._sponsorAccount);

    console.log(`VM relation tx id: ${JSON.stringify(tx)}`);
    await broadcast(tx, this._rpcUrl);

    this._verificationMethodAccounts.push(vmAccount);
    return vmAccount;
  }

  public didAccount(): Account {
    return this._didAccount;
  }

  public sponsorAccount(): Account | undefined {
    return this._sponsorAccount;
  }

  public did(): string {
    return `did:lto:${this.didAccount().address}`;
  }

  public resolve(): Promise<DIDResolutionResult> {
    return new UniResolver().setBaseURL(this._uniResolverUrl).resolve(this.did());
  }

  public verificationMethodAccounts(): Account[] {
    return this._verificationMethodAccounts;
  }

  private createAccount(privateKeyBase58?: string): Account {
    return privateKeyBase58 ? this.lto().createAccountFromPrivateKey(privateKeyBase58) : this.lto().createAccount();
  }

  private static addProofs(tx: (IAssociationTransactionV3 & WithId) | (IAnchorTransaction & WithId), fromAccount: Account, sponsor?: Account): void {
    const serializedTx = binary.serializeTx(tx);

    // Sender proof
    const senderProof = signWithPrivateKey(serializedTx, base58encode(fromAccount.sign.privateKey));
    addProof(tx, senderProof);

    if (sponsor) {
      // Sponsor proof
      const sponsorProof = signWithPrivateKey(serializedTx, base58encode(sponsor.sign.privateKey));
      addProof(tx, sponsorProof);

      tx.sponsorPublicKey = base58encode(sponsor.sign.publicKey);
    }
  }

  private createSponsorAccount(opts: { didPrivateKeyBase58?: string; sponsorPrivateKeyBase58?: string }): Account | undefined {
    if (!opts.didPrivateKeyBase58 && !opts.sponsorPrivateKeyBase58) {
      throw new Error(
        'No private key provided for the account, and no sponsor private key provided. Cannot create transactions when one of them is not present'
      );
    }
    return opts.sponsorPrivateKeyBase58 ? this.createAccount(opts.sponsorPrivateKeyBase58) : undefined;
  }

  private lto(): LTOApi {
    // We store the network and rpc url because LTO constructor uses a global configuration object, so we recreate it every time
    return new LTOApi(this._network, this._rpcUrl);
  }
}

export function deriveAddressFromPublicKeyBase58(base58: string, network: Network | string) {
  const pk = base58Decode(base58);
  return base58Encode(buildAddress(pk, network));
}

export function deriveAddressFromPublicKeyHex(hex: string, network: Network | string) {
  const pk = base16Decode(hex);
  return base58Encode(buildAddress(pk, network));
}

export function hexToBase58(hex: string) {
  return base58Encode(base16Decode(hex));
}

export function base58ToHex(base58: string) {
  return base16Encode(base58Decode(base58));
}
