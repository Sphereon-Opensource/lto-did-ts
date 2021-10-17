import { base58encode, buildAddress, signWithPrivateKey } from '@lto-network/lto-crypto';
import { anchor, broadcast, IAnchorTransaction, invokeAssociation, WithId } from '@nklomp78/lto-transactions';
import { addProof } from '@nklomp78/lto-transactions/dist/generic';
import { binary } from '@nklomp78/lto-transactions/dist/parseSerialize';
import { IAssociationTransactionV3 } from '@nklomp78/lto-transactions/dist/transactions';
import { DIDResolutionResult, UniResolver } from '@sphereon/did-uni-client';
import { base16Decode, base16Encode, base58Decode, base58Encode } from '@waves/ts-lib-crypto';
import { Account, LTO as LTOApi } from 'lto-api';

import { LtoVerificationMethod, Network } from './types/lto-types';

export class DID {
  private readonly _rpcUrl: string;
  private readonly _network?: Network | string;
  private readonly _account: Account;
  private readonly sponsorAccount: Account;
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
    this._account = this.createAccount(didPrivateKeyBase58);
    this.sponsorAccount = this.sponsor({
      didPrivateKeyBase58,
      sponsorPrivateKeyBase58,
    });
  }

  public async createDID(_opts?: { verificationMethods?: LtoVerificationMethod[]; _didAccount?: Account }): Promise<string> {
    const account = _opts?._didAccount ? _opts._didAccount : this._account;
    const txParams = {
      version: 3,
      chainId: this.lto().networkByte.charCodeAt(0),
      // senderKeyType: "Ed25519",
      senderPublicKey: base58encode(account.sign.publicKey),
      anchors: ['1111111111111111'], // We are anchoring something random as a zero-anchor DID is not possible
    };
    const tx = anchor(txParams);
    this.addProofs(tx, account, this.sponsorAccount);
    await broadcast(tx, this._rpcUrl);
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
      await this.createDID();
    }

    const txParams = {
      version: 3,
      chainId: this.lto().networkByte.charCodeAt(0),
      recipient: vmAccount.address,
      expires: 0,
      sender: this._account.address,
      senderKeyType: 'ed25519',
      senderPublicKey: base58encode(this._account.sign.publicKey),
      associationType: verificationMethod,
    };
    const tx = invokeAssociation(txParams) as IAssociationTransactionV3 & WithId;

    this.addProofs(tx, this._account, this.sponsorAccount);
    console.log(`VM relation tx id: ${JSON.stringify(tx)}`);

    this._verificationMethodAccounts.push(vmAccount);
    return vmAccount;
  }

  public account(): Account {
    return this._account;
  }

  public value(): string {
    return `did:lto:${this.account().address}`;
  }

  public resolve(): Promise<DIDResolutionResult> {
    return new UniResolver().setBaseURL(this._uniResolverUrl).resolve(this.value());
  }

  get verificationMethodAccounts(): Account[] {
    return this._verificationMethodAccounts;
  }

  private createAccount(privateKeyBase58?: string): Account {
    return privateKeyBase58 ? this.lto().createAccountFromPrivateKey(privateKeyBase58) : this.lto().createAccount();
  }

  private addProofs(tx: (IAssociationTransactionV3 & WithId) | (IAnchorTransaction & WithId), fromAccount: Account, sponsor?: Account): void {
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

  private sponsor(opts: { didPrivateKeyBase58?: string; sponsorPrivateKeyBase58?: string }): Account | undefined {
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
