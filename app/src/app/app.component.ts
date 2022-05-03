import {Component, OnInit} from '@angular/core';
import Wallet from '@project-serum/sol-wallet-adapter';
import {Connection, PublicKey} from "@solana/web3.js";
import {Program, AnchorProvider, web3, BN} from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import {FormBuilder, FormGroup} from "@angular/forms";
import {NzMessageService} from "ng-zorro-antd/message";
import {Transaction, idl, storageMaxSize} from "../consts";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  owner!: PublicKey;
  form!: FormGroup;
  storageAccountPDA!: PublicKey;
  statInput!: string;
  wallet: Wallet;
  provider: AnchorProvider;
  program: Program;

  rpcUrl: string = 'http://127.0.0.1:8899';

  loading = false;
  initialized = false;

  transactions: Transaction[] = [];

  constructor(
    private fb: FormBuilder,
    private message: NzMessageService,
  ) {
    this.wallet = new Wallet('https://www.sollet.io', this.rpcUrl);
    // @ts-ignore
    this.provider = new AnchorProvider(new Connection(this.rpcUrl), this.wallet, "processed");
    this.program = new Program(idl, new PublicKey(idl.metadata.address), this.provider);
  }

  ngOnInit() {
    this.form = this.fb.group({
      name: null,
      message: null,
      lamports: 1,
    });
  }

  async connectWallet(): Promise<void> {
    this.loading = true;
    try {
      await this.wallet?.connect();
      [this.storageAccountPDA] = await PublicKey.findProgramAddress([
          anchor.utils.bytes.utf8.encode('donation-storage'),
        ], this.program.programId);

      await this.fetchTransactions();
    } catch (err) {
      console.error(err);
      this.createMessage('error', 'Failed to connect')
    } finally {
      this.loading = false;
    }
  }

  async disconnectWallet(): Promise<void> {
    await this.wallet.disconnect();
  }

  async fetchTransactions(): Promise<void> {
    this.loading = true;
    try {
      const storageAccount = await this.program.account.transactionStorage.fetch(
        this.storageAccountPDA
      );
      this.owner = storageAccount.owner as PublicKey;
      this.transactions = storageAccount.transactions as Array<Transaction>
      this.initialized = true;
      this.createMessage('success', 'Success')
    } catch (err) {
      console.error(err);
      this.createMessage('warning', 'The fundraising hasn\'t started yet')
    } finally {
      this.loading = false;
    }
  }

  async initialize(): Promise<void> {
    const rentExemptionAmount = await this.provider.connection.getMinimumBalanceForRentExemption(storageMaxSize);
    const ownerBalance = await this.provider.connection.getBalance(this.provider.wallet.publicKey);

    if (rentExemptionAmount > ownerBalance) {
      this.createMessage('success', 'Insufficient funds');
      return;
    }
    this.loading = true;
    try {
      await this.program.methods
        .initialize()
        .accounts({
          user: this.provider.wallet.publicKey,
          storageAccount: this.storageAccountPDA,
        }).rpc();

      await this.fetchTransactions();
      this.createMessage('success', 'Fundraising started');
    } catch (err) {
      console.error(err);
      this.createMessage('error', 'Failed to start fundraising');
    } finally {
      this.loading = false;
    }
  }

  async sendLamports(): Promise<void> {
    const userBalance = await this.provider.connection.getBalance(this.provider.wallet.publicKey);

    if (this.form.value.lamports > userBalance) {
      this.createMessage('warning', 'Insufficient funds');
      return;
    }

    this.loading = true;
    try {
      await this.program.methods
        .send(
          this.form.value.name ?? 'Secretly',
          this.form.value.message ?? '',
          new BN(this.form.value.lamports)
        )
        .accounts({
          user: this.provider.wallet.publicKey,
          storageAccount: this.storageAccountPDA,
        }).rpc();

      this.createMessage('success', 'Thanks for the donation');
      await this.fetchTransactions();
    } catch (err) {
      console.error(err);
      this.createMessage('error', 'An error has occurred')
    } finally {
      this.loading = false;
    }
  }

  async withdraw(): Promise<void> {
    if (this.transactions.find(transaction => !transaction.withdrawn)) {
      this.createMessage('warning', 'Funds for withdrawal were not found');
      return;
    }

    this.loading = true;
    try {
      await this.program.methods
        .withdraw()
        .accounts({
          user: this.provider.wallet.publicKey,
          storageAccount: this.storageAccountPDA,
        }).rpc();

      this.createMessage('success', 'Funds have been withdrawn to your account');
      await this.fetchTransactions();
    } catch (err) {
      console.error(err);
      this.createMessage('error', 'An error has occurred')
    } finally {
      this.loading = false;
    }
  }

  getUserStatistic(): void {
    const user = this.transactions.find(
      transaction => transaction.publicKey.toString().includes(this.statInput)
    );

    this.transactions.reduce(
      (acc, current) =>
        current.publicKey.toString() === user?.publicKey.toString()
          ? acc.add(current.lamports)
          : acc,
      new BN(0))
  }

  createMessage(type: string, message: string): void {
    this.message.create(type, message);
  }


  slicePublicKey(key: PublicKey | null): string | null {
    return key?.toString().slice(0, 10) + '...';
  }

  formatterLamports = (value: number): string => `${value} LMP`;
  parserLamports = (value: string): string => value.replace(' LMP', '');
}
