import {Component, OnInit} from '@angular/core';
import Wallet from '@project-serum/sol-wallet-adapter';
import {Connection, PublicKey} from "@solana/web3.js";
import IDL from "../idl.json"
import {Program, AnchorProvider, Provider, web3} from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import {FormBuilder, FormGroup} from "@angular/forms";

const voteAccount = web3.Keypair.generate();

const idl = JSON.parse(JSON.stringify(IDL));

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'app';
  wallet: Wallet;
  connection: Connection;
  provider: AnchorProvider;
  rpcUrl: string = 'http://127.0.0.1:8899';
  programID = new PublicKey(idl.metadata.address);
  form!: FormGroup;
  loading = false;

  transfers: {
    name: string,
    message: string,
    pubKey: PublicKey,
  }[] = [];

  constructor(
    private fb: FormBuilder,
  ) {
    this.wallet = new Wallet('https://www.sollet.io', this.rpcUrl);
    this.connection = new Connection(this.rpcUrl);
    // @ts-ignore
    this.provider = new AnchorProvider(this.connection, this.wallet, "processed");
  }
  ngOnInit() {
    this.form = this.fb.group({
      name: null,
      message: null,
      lamports: 1,
    })
  }

  connectWallet(): void {
    this.loading = true;
    this.wallet?.connect()
      .then(() => console.log('Wallet connected'), err => console.error(err))
      .finally(() => this.loading = false);
  }

  /*async fetchStoredData(): Promise<void> {
    const program = new Program(idl, this.programID, this.provider);

    const [storageAccountPDA, _] = await PublicKey
      .findProgramAddress([
        anchor.utils.bytes.utf8.encode("vote_account6"),
      ], program.programId);

    this.transfersHistory = await program.account.transactionStorage
      .fetch(storageAccountPDA)
      .then(account => account.transactions)
      .catch(async () => await this.initialize())
      anchor test --skip-local-validator

    console.log(this.transfersHistory);
  }*/


  async sendLamports(): Promise<void> {
    console.log('aaaa');
    const program = new Program(idl, this.programID, this.provider);

    const [storageAccountPDA, _] = await PublicKey
      .findProgramAddress([
        anchor.utils.bytes.utf8.encode("donation-storage"),
      ], program.programId);

    await program.methods
      .send(this.form.value.name, this.form.value.message)
      .accounts({
        user: this.provider.wallet.publicKey,
        storageAccount: storageAccountPDA,
      }).rpc();


    const account = await program.account.transactionStorage.fetch(
      storageAccountPDA
    );

    /*this.transfers.push({
      name: account.name,
      message: account.message,
      pubKey: account.pubKey.bn.toString(),
    })*/

    this.transfers = account.transactions;
    console.log(this.transfers);

    //console.log(account);
  }

  /*async votes(): Promise<void> {
    const program = new Program(idl, this.programID, this.provider)
    console.log(program);
    try {
      const account = await program.account.voteAccount.fetch(
        voteAccount.publicKey
      );
      console.log('votes', account.crunchy.toString(), account.smooth.toString());
    } catch (error) {
      console.error("could not getVotes: ", error)
    }
  }*/


  async initialize(): Promise<void> {
    const program = new Program(idl, this.programID, this.provider);

    const [storageAccountPDA, _] = await PublicKey
      .findProgramAddress([
        anchor.utils.bytes.utf8.encode("donation-storage"),
      ], program.programId);

    console.log('id', program.programId.toString());

    //console.log(program.)

    try {
      /*await program.methods
        .initialize()
        .accounts({
          user: this.provider.wallet.publicKey,
          storageAccount: storageAccountPDA,
        }).rpc();*/

      const account = await program.account.transactionStorage.fetch(
        storageAccountPDA
      );

      this.transfers = account.transactions;
      console.log(this.transfers);

      //console.log('pub', account.pubKey);

      //console.log(account);
    } catch (err) {
      console.error(err);
    }

    //console.log(await program.account.transactionStorage);



    /*try {
      await program.rpc.initialize({
        accounts: {
          voteAccount: voteAccount.publicKey,
          user: this.provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        },
        signers: [voteAccount],
      });

      const account = await program.account.voteAccount.fetch(
        voteAccount.publicKey
      );
      console.log('initialize', account.crunchy.toString(), account.smooth.toString());
    } catch (error) {
      console.error("Transaction error: ", error);
    }*/
  }

  async disconnect(): Promise<void> {
    await this.wallet.disconnect();
  }

  formatterLamports = (value: number): string => `${value} LMP`;
  parserLamports = (value: string): string => value.replace(' LMP', '');
}
