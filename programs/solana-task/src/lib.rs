use anchor_lang::prelude::*;

declare_id!("AE3UkQZZVGMv4tHVgRVZX3ubBtemruQJPTpFDsYpjUtY");

#[program]
pub mod solana_task {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let storage_account = &mut ctx.accounts.storage_account;
        storage_account.transactions.clear();
        storage_account.bump = *ctx.bumps.get("storage_account").unwrap();
        Ok(())
    }

    pub fn send(ctx: Context<Send>, name: String, message: String, lamports: u64) -> Result<()> {
        let user_account = &mut ctx.accounts.user;
        ctx.remaining_accounts;
        let recipient_account = &mut ctx.accounts.recipient;
        ctx.accounts.storage_account.transactions.push(Transaction {
            name,
            message,
            public_key: user_account.key(),
            lamports,
        });


        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &user_account.key(),
            &recipient_account.key(),
            lamports,
        );

        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                user_account.to_account_info(),
                recipient_account.to_account_info(),
            ],
        );

        /*if **user_account.try_borrow_lamports()? < 10 {
            panic!();
        }

        **user_account.try_borrow_mut_lamports()? -= 1;
        **recipient_account.try_borrow_mut_lamports()? += 1;*/

        /*anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                user_account.to_account_info(),
                recipient_account.to_account_info(),
            ],
        ).unwrap();*/


        //ctx.accounts.storage_account.name = String::from("aaaaaa");
        Ok(())
    }
}

#[account]
pub struct TransactionStorage {
    pub transactions: Vec<Transaction>,
    pub bump: u8,
}

impl TransactionStorage {
    pub const MAX_SIZE: usize = 4 + 10 * (4 + 32 + 4 + 32 + 32) + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub struct Transaction {
    pub name: String,
    pub message: String,
    pub public_key: Pubkey,
    pub lamports: u64,
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
    #[account(mut, seeds = [b"donation-storage"], bump = storage_account.bump)]
    pub storage_account: Account<'info, TransactionStorage>,
    #[account(mut)]
    /// CHECK:
    pub recipient: AccountInfo<'info>,
    pub system_program: Program <'info, System>,
}
