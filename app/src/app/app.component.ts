import {Component, OnInit} from '@angular/core';
import Wallet from '@project-serum/sol-wallet-adapter';
import {Connection, PublicKey} from "@solana/web3.js";
import {Program, AnchorProvider, BN, utils} from "@project-serum/anchor";
import {FormBuilder, FormGroup} from "@angular/forms";
import {NzMessageService} from "ng-zorro-antd/message";
import {Transaction, idl, storageMaxSize, RpcUrl} from "../consts";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  owner!: PublicKey;
  form!: FormGroup;
  storageAccountPDA!: PublicKey;
  wallet: Wallet;
  provider: AnchorProvider;
  program: Program;

  rpcUrl: string = RpcUrl.devnet;

  loading = false;
  initialized = false;

  transactions: Transaction[] = [];

  publicKeyInput: string | undefined;
  userStatistics: {
    publicKey: PublicKey,
    amount: BN,
  } | undefined;

  constructor(
    private fb: FormBuilder,
    private message: NzMessageService,
  ) {
    this.wallet = new Wallet('https://www.sollet.io', this.rpcUrl);
    this.provider = new AnchorProvider(
      new Connection(this.rpcUrl),
      this.wallet as any,
      {commitment: "finalized"}
    );
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
          utils.bytes.utf8.encode('donation-storage'),
        ], this.program.programId);

      await this.fetchTransactions();
    } catch (_) {
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
    } catch (_) {
      this.createMessage('warning', 'The fundraising hasn\'t started yet')
    } finally {
      this.loading = false;
    }
  }

  async initialize(): Promise<void> {
    const rentExemptionAmount = await this.provider.connection.getMinimumBalanceForRentExemption(storageMaxSize);
    const ownerBalance = await this.provider.connection.getBalance(this.provider.wallet.publicKey);

    if (rentExemptionAmount > ownerBalance) {
      this.createMessage('warning', 'Insufficient funds');
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
    } catch (_) {
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
          this.form.value.name || 'Secretly',
          this.form.value.message || '',
          new BN(this.form.value.lamports)
        ).accounts({
          user: this.provider.wallet.publicKey,
          storageAccount: this.storageAccountPDA,
        }).rpc();

      this.createMessage('success', 'Thanks for the donation');
      await this.fetchTransactions();
    } catch (_) {
      this.createMessage('error', 'An error has occurred')
    } finally {
      this.loading = false;
    }
  }

  async withdraw(): Promise<void> {
    await this.fetchTransactions();
    if (!this.transactions.find(transaction => !transaction.withdrawn)) {
      this.createMessage('warning', 'Funds for withdrawal were not found');
      return;
    }

    this.loading = true;
    try {
      await this.program.methods
        .withdraw()
        .accounts({
          owner: this.provider.wallet.publicKey,
          storageAccount: this.storageAccountPDA,
        }).rpc();

      this.createMessage('success', 'Funds have been withdrawn to your account');
      await this.fetchTransactions();
    } catch (_) {
      this.createMessage('error', 'An error has occurred')
    } finally {
      this.loading = false;
    }
  }

  async getUserStatistic(): Promise<void> {
    await this.fetchTransactions();
    const userTransaction = this.transactions.find(
      transaction => transaction.publicKey.toString() === this.publicKeyInput
    );

    if (userTransaction?.publicKey) {
      this.userStatistics = {
        publicKey: userTransaction.publicKey,
        amount: this.transactions.reduce(
          (acc, current) =>
            current.publicKey.toString() === this.publicKeyInput
              ? acc.add(current.lamports)
              : acc,
          new BN(0))
      }
    }
  }

  createMessage(type: string, message: string): void {
    this.message.create(type, message);
  }


  slicePublicKey(key: PublicKey | null | undefined): string | null {
    return key?.toString().slice(0, 10) + '...';
  }

  formatterLamports = (value: number): string => `${value} LMP`;
  parserLamports = (value: string): string => value.replace(' LMP', '');
}
