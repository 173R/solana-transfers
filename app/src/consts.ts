import {PublicKey} from "@solana/web3.js";
import {BN} from "@project-serum/anchor";
import IDL from "./idl.json";

export const idl = JSON.parse(JSON.stringify(IDL));

export type Transaction = {
  name: string,
  message: string,
  publicKey: PublicKey,
  lamports: BN,
}
