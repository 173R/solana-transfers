import * as anchor from "@project-serum/anchor";
import {BN, Program} from "@project-serum/anchor";
import { SolanaTask } from "../target/types/solana_task";
import {PublicKey} from "@solana/web3.js";
import * as assert from "assert";

describe("solana-task", async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaTask as Program<SolanaTask>;

  const [storageAccountPDA, _] = await PublicKey
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

    const account = await program.account.transactionStorage.fetch(
        storageAccountPDA
    );

    console.log('transactions', account.transactions);
  });

  it("Send", async () => {
    const recipient_account = anchor.web3.Keypair.generate();

    console.log('init balance', await provider.connection.getBalance(recipient_account.publicKey));

    await program.methods
        .send("Any name", "Any message", new BN(100000))
        .accounts({
          storageAccount: storageAccountPDA,
          user: provider.wallet.publicKey,
          recipient: recipient_account.publicKey,
        }).rpc();

    const account = await program.account.transactionStorage.fetch(
        storageAccountPDA
    );

      console.log('current balance', await provider.connection.getBalance(recipient_account.publicKey));

    console.log('send', account.transactions);

    /*assert.ok(
       account.crunchy.eq(new BN(1)) && account.smooth.eq(new BN(0))
     );*/
  });
});
