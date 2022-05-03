import * as anchor from "@project-serum/anchor";
import {BN, Program} from "@project-serum/anchor";
import { SolanaTask } from "../target/types/solana_task";
import {PublicKey, LAMPORTS_PER_SOL} from "@solana/web3.js";
import {expect} from "chai";

describe("solana-task", async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SolanaTask as Program<SolanaTask>;

  const [storageAccountPDA] = await PublicKey
      .findProgramAddress([
        anchor.utils.bytes.utf8.encode("donation-storage"),
      ], program.programId);

  it("Initializes", async () => {
    await program.methods
        .initialize()
        .accounts({
          user: provider.wallet.publicKey,
          storageAccount: storageAccountPDA,
        }).rpc();

    const storageAccount = await program.account.transactionStorage.fetch(
        storageAccountPDA
    );

    expect(provider.wallet.publicKey.toString()).to.equal(
      storageAccount.owner.toString()
    );
  });

  it("Send lamports", async () => {
    const initialBalance = await provider.connection.getBalance(storageAccountPDA);

    const input = {
        name: 'Name',
        message: 'Message',
        publicKey: provider.wallet.publicKey,
        lamports: new BN(LAMPORTS_PER_SOL),
        withdrawn: false,
    }

    await program.methods
        .send(input.name, input.message, input.lamports)
        .accounts({
          storageAccount: storageAccountPDA,
          user: input.publicKey,
        }).rpc();

    const output = (await program.account.transactionStorage.fetch(
        storageAccountPDA
    )).transactions[0];

    expect(await provider.connection.getBalance(storageAccountPDA)).to.equal(
      input.lamports.toNumber() + initialBalance
    );

    expect(JSON.stringify(input)).to.equal(JSON.stringify(output));
  });

  it("Withdraw", async () => {
    const initOwnerBalance = await provider.connection.getBalance(provider.wallet.publicKey);
    const initStorageBalance = await provider.connection.getBalance(storageAccountPDA);

    await program.methods
      .withdraw()
      .accounts({
        owner: provider.wallet.publicKey,
        storageAccount: storageAccountPDA,
      }).rpc();

    const resultOwnerBalance = await provider.connection.getBalance(provider.wallet.publicKey);
    const resultStorageBalance = await provider.connection.getBalance(storageAccountPDA);

    expect(resultOwnerBalance - initOwnerBalance).to.equal(initStorageBalance - resultStorageBalance);
  });
});
