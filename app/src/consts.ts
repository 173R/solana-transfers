import {PublicKey} from "@solana/web3.js";
import {BN} from "@project-serum/anchor";
import IDL from "./idl.json";

export const idl = JSON.parse(JSON.stringify(IDL));

export type Transaction = {
  name: string,
  message: string,
  publicKey: PublicKey,
  lamports: BN,
  withdrawn: boolean,
}

export enum RpcUrl {
  devnet = 'https://api.devnet.solana.com',
  localhost = 'http://127.0.0.1:8899',

}

export const storageMaxSize = 8 + 4 + 10 * (4 + 32 + 4 + 32 + 32 + 8 + 1) + 1 + 32;
