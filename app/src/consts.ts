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

export const storageMaxSize = 8 + 4 + 10 * (4 + 32 + 4 + 32 + 32) + 1;
