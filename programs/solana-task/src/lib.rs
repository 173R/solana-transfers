use anchor_lang::prelude::*;

declare_id!("28NekMJybQSyo2QwUhs3SByNUMspd3gvszU2njheMvsk");

#[program]
pub mod solana_task {
    use super::*;
    use anchor_lang::solana_program;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let storage_account = &mut ctx.accounts.storage_account;
        storage_account.owner = ctx.accounts.user.key();
        storage_account.bump = *ctx.bumps.get("storage_account").unwrap();
        Ok(())
    }

    pub fn send(ctx: Context<Send>, name: String, message: String, lamports: u64) -> Result<()> {
        let user_account = &mut ctx.accounts.user;
        let storage_account = &mut ctx.accounts.storage_account;

        let instruction = solana_program::system_instruction::transfer(
            &user_account.key(),
            &storage_account.key(),
            lamports,
        );

        solana_program::program::invoke(
            &instruction,
            &[
                user_account.to_account_info(),
                storage_account.to_account_info(),
            ],
        ).unwrap();

        storage_account.transactions.push(Transaction {
            name,
            message,
            public_key: user_account.key(),
            lamports,
            withdrawn: false,
        });

        Ok(())
    }


    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let owner_account = &mut ctx.accounts.owner;
        let storage_account = &mut ctx.accounts.storage_account;
        let storage_account_info = storage_account.to_account_info();
        let mut amount: u64 = 0;

        for transaction in storage_account.transactions.iter_mut() {
            if !transaction.withdrawn {
                transaction.withdrawn = true;
                amount += transaction.lamports;
            }
        }

        **storage_account_info.try_borrow_mut_lamports()? -= amount;
        **owner_account.try_borrow_mut_lamports()? += amount;

        Ok(())
    }
}

#[account]
pub struct TransactionStorage {
    pub transactions: Vec<Transaction>,
    pub bump: u8,
    pub owner: Pubkey,
}

impl TransactionStorage {
    pub const MAX_SIZE: usize = 4 + 10 * (4 + 32 + 4 + 32 + 32 + 8 + 1) + 1 + 32;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub struct Transaction {
    pub name: String,
    pub message: String,
    pub public_key: Pubkey,
    pub lamports: u64,
    pub withdrawn: bool,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(init, payer = user, space = 8 + TransactionStorage::MAX_SIZE, seeds = [b"donation-storage"], bump)]
    pub storage_account: Account<'info, TransactionStorage>,
    pub system_program: Program <'info, System>,
}

#[derive(Accounts)]
pub struct Send<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub storage_account: Account<'info, TransactionStorage>,
    pub system_program: Program <'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    /// CHECK:
    pub owner: AccountInfo<'info>,
    #[account(mut)]
    pub storage_account: Account<'info, TransactionStorage>,
    pub system_program: Program <'info, System>,
}