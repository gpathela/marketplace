use anchor_lang::prelude::*;
use std::{convert::Into, fmt::Debug};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod marketplace {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, authority: Pubkey) -> ProgramResult {
        // retreive the initialized account approved_token
        let approved_tokens = &mut ctx.accounts.approved_tokens;

        // initialize the owner of the list
        approved_tokens.authority = authority;

        // Fills the array with dummy PublicKeys
        approved_tokens.tokens = ["1nc1nerator11111111111111111111111111111111"
            .parse()
            .unwrap(); 10];
        Ok(())
    }

    pub fn update_approved_tokens(
        ctx: Context<UpdateApprovedTokens>,
        new_approved_tokens: [Pubkey; 10],
    ) -> ProgramResult {
        // retreive the account approved_token, check is already done regardng owner
        let approved_tokens = &mut ctx.accounts.approved_tokens;
        approved_tokens.tokens = new_approved_tokens;
        Ok(())
    }

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        token: Pubkey,
        prices: Vec<PriceStruct>,
    ) -> ProgramResult {
        // retreive the initialized proposal
        // msg!("test");
        let proposal = &mut ctx.accounts.sale_proposal.load_init()?;

        // give them unique and according values
        // PubKey of the desired NFT to sell
        proposal.token = token;

        // Copy the owner of this nft to seller
        proposal.seller = ctx.accounts.user.key.clone();

        // TO DO for creating PDA
        proposal.proposal_id = 0;

        // Puting the status pending
        proposal.proposal_status = ProposalStatus::Pending.to_u8();

        // retreive the full list of accepted payment
        let approved_tokens = &mut ctx.accounts.approved_tokens;

        // creates and initialize a specific price array for this sale
        let mut prices_array: [PriceStruct; 10] = [PriceStruct {
            price: 0,
            token: "1nc1nerator11111111111111111111111111111111"
                .parse()
                .unwrap(),
        }; 10];

        msg!("price_array {:?}", prices_array);

        //iterates and changes the price array according to seller desire to exchange his NFT for those tokens (enter manually)
        let mut j = 0;
        prices.iter().enumerate().for_each(|(_i, price)| {
            //Check price positive
            if price.price > 0 {
                //if token is in the approved list then add to the custom list
                if approved_tokens.tokens.contains(&price.token)
                    && price.token
                        != "1nc1nerator11111111111111111111111111111111"
                            .parse()
                            .unwrap()
                {
                    prices_array[j] = price.clone();
                    j += 1;
                }
            }
        });
        Ok(())
    }

    pub fn cancel_proposal(ctx: Context<CancelProposal>, token: Pubkey) -> ProgramResult {
        let sale_proposal = &mut ctx.accounts.sale_proposal.load_mut()?;
        let user =&ctx.accounts.user;

        // If the seller is the owner of the keypair, change the status to cancelled
        if sale_proposal.seller == user.key() && sale_proposal.token == token {
            sale_proposal.proposal_status = ProposalStatus::Cancelled.to_u8();
        }

        Ok(())
    }

    // Proceed to transaction double signer :)
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + ApprovedTokens::LEN)]
    pub approved_tokens: Account<'info, ApprovedTokens>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateApprovedTokens<'info> {
    #[account(mut, has_one = authority)]
    pub approved_tokens: Account<'info, ApprovedTokens>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(init, payer = user, space = 8 + SaleProposal::LEN)]
    pub sale_proposal: Loader<'info, SaleProposal>,
    pub approved_tokens: Account<'info, ApprovedTokens>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelProposal<'info> {
    #[account(mut)]
    pub sale_proposal: Loader<'info, SaleProposal>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account()]
#[derive(Debug)]
pub struct ApprovedTokens {
    pub authority: Pubkey,
    pub tokens: [Pubkey; 10],
}
impl ApprovedTokens {
    //Array of 10 Pubkeys & the authority
    pub const LEN: usize = (32 * 10) + 32;
}

#[account(zero_copy)]
#[derive(Debug)]
pub struct SaleProposal {
    pub prices: [PriceStruct; 10],
    pub token: Pubkey,
    pub seller: Pubkey,
    pub proposal_id: u64,
    pub proposal_status: u8,
}

impl SaleProposal {
    pub const LEN: usize = (PriceStruct::LEN * 10) + (32 * 2) + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct PriceStruct {
    pub price: u64,
    pub token: Pubkey,
}

impl PriceStruct {
    pub const LEN: usize = 8 + 32;
}

pub enum ProposalStatus {
    Pending,
    Completed,
    Cancelled,
}

impl ProposalStatus {
    pub fn from_u8(status: u8) -> ProposalStatus {
        match status {
            0 => ProposalStatus::Pending,
            1 => ProposalStatus::Completed,
            2 => ProposalStatus::Cancelled,
            _ => panic!("Invalid Proposal Status"),
        }
    }

    pub fn to_u8(&self) -> u8 {
        match self {
            ProposalStatus::Pending => 0,
            ProposalStatus::Completed => 1,
            ProposalStatus::Cancelled => 2,
        }
    }
}

/* to do
test proceed to buy

update the code:
automate the price calculation
use PDA*/
