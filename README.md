<!--suppress HtmlDeprecatedAttribute -->
<h1 align="center">
  <br>
  <a href="https://www.sphereon.com"><img src="https://sphereon.com/content/themes/sphereon/assets/img/logo.svg" alt="Sphereon" width="400"></a>
  <br>LTO DID support (Typescript) 
  <br>
</h1>

[![CI](https://github.com/Sphereon-Opensource/lto-did-ts/actions/workflows/main.yml/badge.svg)](https://github.com/Sphereon-Opensource/did-uni-client/actions/workflows/main.yml)  [![codecov](https://codecov.io/gh/Sphereon-Opensource/did-uni-client/branch/develop/graph/badge.svg?token=9P1JGUYA35)](https://codecov.io/gh/Sphereon-Opensource/lto-did-ts) [![NPM Version](https://img.shields.io/npm/v/@sphereon/lto-did-ts.svg)](https://npm.im/@sphereon/lto-did-ts)


# LTO DID support library (Typescript)

This is a Typescript project that allows you to create DIDs, add Verification Methods and resolve DIDs on LTO Network.

Please note we also have a Veramo.io DID manager plugin as well as a Universal Registrar driver accompanying this library.


# Creating a DID

Creating a DID means you have to create a public/private keypair first. 
You can do this using `lto-api` package or any other means to create a ed25519 keypair.
We are accepting an optional ed25519 private key to keep it flexible for everyone. If it is not provided we will create a random private/public keypair for you.

Internally it will create an LTO didAccount or import the key into an didAccount. We expose the didAccount using the `didAccount()` method for your retrieval. 

## Initializing the DID class

````typescript
import {Account, LTO} from "lto-api";
import {DIDService, Network} from "@sphereon/lto-did-ts";

const ltoAccount = new LTO(Network.TESTNET, 'https://testnet.lto.network')
const didPrivateKeyBase58 = base58encode(ltoAccount.sign.privateKey)

const didService = new DIDService({
    didPrivateKeyBase58,
    network: Network.TESTNET,
});


// The didAccount is either constructed from the supplied private key, or a random didAccount is created
const didAccount: Account = didService.didAccount()
````


## Create a DID on chain
The above only initialized the DID service, so now lets actually publish/create a DID on chain.

````typescript
const createdDid = didService.createDID();
console.log(createdDid) // Returns the did string
console.log(didService.did()) // Returns the same did string
// Output: 
// did:lto:<address-value>
// did:lto:<address-value>

````


## Add verificationMethod(s)
You can add one or more verification methods to an existing DID, or you can add them during DID creation.
Internally this is accomplished using LTO Networks, associations. This means new private/public keypairs are need.
Again you can use your own ed25519 private key, or have one randomly created for you. Obviously you do need to retrieve them from the didService afterwards in that case.

In order to make the internal LTO Network association the target didAccount of the association needs to have been published on the network before that. The public key needs to be known for the LTO indexer to index it.
The boolean option createVerificationDID can create the respective didAccount for you. Do note that the library will wait for several seconds to ensure the didAccount is published before creating the association.

````typescript
import {Account, LTO} from "lto-api";
import {DIDService, Network} from "@sphereon/lto-did-ts";
import {LtoVerificationMethod} from "./index";

const vmAccount = new LTO(Network.TESTNET, 'https://testnet.lto.network').createAccount()
const verificationMethodPrivateKeyBase58 = base58encode(vmAccount.sign.privateKey)
const verificationMethod = LtoVerificationMethod.CapabilityInvocation


const verificationMethodResult = didService.addVerificationMethod({
    verificationMethodPrivateKeyBase58,
    verificationMethod,
    createVerificationDID: true
})
````

## Using a sponsorAccount
You can use a sponsorAccount for creating the DIDs. The sponsorAccount pays for the actual transaction, so that you do not have to transfer LTO tokens to all DID addresses in order to create DIDs.
The sponsorAccount is being used on a per transaction level, as to not have to use the sponsorAccount didAccount feature, which means the sponsorAccount pays for all transactions in the future of an didAccount.

We work with the base 58 encoded privateKey of the sponsorAccount. So if you are using the lto-api and already have an Account object, you can get the private key by base58 encoding the `didAccount.sign.privateKey` property.

You can pass the sponsorAccount as argument for the DIDService constructor

````typescript
import {Account, LTO} from "lto-api";
import {DIDService, Network} from "@sphereon/lto-did-ts";
import {LtoVerificationMethod} from "./index";

// Create sponsor account from a seed and convert to private key, could be a direct private key as well of course
const sponsorAccount = new LTO(Network.TESTNET, 'https://testnet.lto.network').createAccountFromExistingPhrase('my seed')
const sponsorPrivateKeyBase58 = base58encode(sponsorAccount.sign.privateKey)

const didAccount = new LTO(Network.TESTNET, 'https://testnet.lto.network')
const didPrivateKeyBase58 = base58encode(didAccount.sign.privateKey)

const didService = new DIDService({
    didPrivateKeyBase58,
    sponsorPrivateKeyBase58,
    network: Network.TESTNET,
});


didService.sponsorAccount()
````
