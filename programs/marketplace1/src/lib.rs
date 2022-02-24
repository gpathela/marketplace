use anchor_lang::prelude::*;
use std::convert::Into;

declare_id!("6UKJXxeUxGvB3fjBCVhiRmoFzDMAFPQjhbyKRWmFqrw6");

#[program]
pub mod marketplace1 {
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
    // pub fn storetx(ctx: Context<StoreTx>, rawtransaction: [u8; 385]) -> ProgramResult {
    //     let txaccount = &mut ctx.accounts.txaccount;
    //     txaccount.rawtransaction = rawtransaction;

    //     Ok(())
    // }
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
        transaction_u8_array: Vec<u8>,
    ) -> ProgramResult {
        // retreive the initialized proposal
        // msg!("test");
        let proposal = &mut ctx.accounts.sale_proposal.load_init()?;
        let transaction_data_account = &mut ctx.accounts.transaction_data_account;
        transaction_data_account.transaction_instructions = transaction_u8_array;
        // give them unique and according values
        // PubKey of the desired NFT to sell
        proposal.token = token;

        // Copy the owner of this nft to seller
        proposal.seller = ctx.accounts.user.key.clone();

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

        // msg!("price_array {:?}", prices_array);

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
        let user = &ctx.accounts.user;

        // If the seller is the owner of the keypair, change the status to cancelled
        if sale_proposal.seller == user.key() && sale_proposal.token == token {
            sale_proposal.proposal_status = ProposalStatus::Cancelled.to_u8();
        }

        Ok(())
    }

    // Proceed to transaction double signer :)
    /* pub fn create_auction(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        args: CreateAuctionArgs,
        instant_sale_price: Option<u64>,
        name: Option<AuctionName>,
    ) -> ProgramResult {
        msg!("+ Processing CreateAuction");
        let accounts = parse_accounts(program_id, accounts)?;

        let auction_path = [
            PREFIX.as_bytes(),
            program_id.as_ref(),
            &args.resource.to_bytes(),
        ];


        // Derive the address we'll store the auction in, and confirm it matches what we expected the
        // user to provide.
        let (auction_key, bump) = Pubkey::find_program_address(&auction_path, program_id);
        if auction_key != *accounts.auction.key {
            return Err(AuctionError::InvalidAuctionAccount.into());
        }
        // The data must be large enough to hold at least the number of winners.
        let auction_size = match args.winners {
            WinnerLimit::Capped(n) => {
                mem::size_of::<Bid>() * BidState::max_array_size_for(n) + BASE_AUCTION_DATA_SIZE
            }
            WinnerLimit::Unlimited(_) => BASE_AUCTION_DATA_SIZE,
        };

        let bid_state = match args.winners {
            WinnerLimit::Capped(n) => BidState::new_english(n),
            WinnerLimit::Unlimited(_) => BidState::new_open_edition(),
        };

        if let Some(gap_tick) = args.gap_tick_size_percentage {
            if gap_tick > 100 {
                return Err(AuctionError::InvalidGapTickSizePercentage.into());
            }
        }

        // Create auction account with enough space for a winner tracking.
        create_or_allocate_account_raw(
            *program_id,
            accounts.auction,
            accounts.rent,
            accounts.system,
            accounts.payer,
            auction_size,
            &[
                PREFIX.as_bytes(),
                program_id.as_ref(),
                &args.resource.to_bytes(),
                &[bump],
            ],
        )?;

        let auction_ext_bump = assert_derivation(
            program_id,
            accounts.auction_extended,
            &[
                PREFIX.as_bytes(),
                program_id.as_ref(),
                &args.resource.to_bytes(),
                EXTENDED.as_bytes(),
            ],
        )?;

        create_or_allocate_account_raw(
            *program_id,
            accounts.auction_extended,
            accounts.rent,
            accounts.system,
            accounts.payer,
            MAX_AUCTION_DATA_EXTENDED_SIZE,
            &[
                PREFIX.as_bytes(),
                program_id.as_ref(),
                &args.resource.to_bytes(),
                EXTENDED.as_bytes(),
                &[auction_ext_bump],
            ],
        )?;

        // Configure extended
        AuctionDataExtended {
            total_uncancelled_bids: 0,
            tick_size: args.tick_size,
            gap_tick_size_percentage: args.gap_tick_size_percentage,
            instant_sale_price,
            name,
        }
        .serialize(&mut *accounts.auction_extended.data.borrow_mut())?;

        // Configure Auction.
        AuctionData {
            authority: args.authority,
            bid_state: bid_state,
            end_auction_at: args.end_auction_at,
            end_auction_gap: args.end_auction_gap,
            ended_at: None,
            last_bid: None,
            price_floor: args.price_floor,
            state: AuctionState::create(),
            token_mint: args.token_mint,
        }
        .serialize(&mut *accounts.auction.data.borrow_mut())?;

        Ok(())
    }*/
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
#[instruction(transfer_nft_instruction : Vec<u8>)]
pub struct CreateProposal<'info> {
    #[account(init, payer = user, space = PriceStruct::LEN * 10 + 32 * 3 + 1)]
    pub sale_proposal: Loader<'info, SaleProposal>,
    // pub nonce_account: Account<'info, NonceAccount>,
    #[account(init, payer = user, space = 4 + 8 * Transaction::size(&transfer_nft_instruction))]
    pub transaction_data_account: Account<'info, Transaction>,
    pub approved_tokens: Account<'info, ApprovedTokens>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// #[derive(Accounts)]
// pub struct StoreTx<'info> {
//     #[account(init, payer = user, space= 8*385)]
//     pub txaccount: Loader<'info, TxAccount>,
//     #[account(mut)]
//     pub user: Signer<'info>,
//     pub system_program: Program<'info, System>,
// }

#[derive(Accounts)]
#[instruction(transfer_nft_instruction : Vec<u8>)]
pub struct CancelProposal<'info> {
    #[account(mut)]
    pub sale_proposal: Loader<'info, SaleProposal>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account()]
pub struct ApprovedTokens {
    pub authority: Pubkey,
    pub tokens: [Pubkey; 10],
}
impl ApprovedTokens {
    //Array of 10 Pubkeys & the authority
    pub const LEN: usize = (32 * 10) + 32;
}

#[account()]
pub struct NonceAccount {
    // nonce_pubkey : Pubkey,
    authorized_pubkey: Pubkey,
    nonce: String,
}

#[account(zero_copy)]
// #[instruction(transfer_nft_instruction : Vec<u8>)]

pub struct SaleProposal {
    pub prices: [PriceStruct; 10],
    pub transfer_nft_instruction_pubkey: Pubkey,
    pub token: Pubkey,
    pub seller: Pubkey,
    // pub proposal_id: u64,
    pub proposal_status: u8,
}

impl SaleProposal {
    // pub const LEN: usize = (PriceStruct::LEN * 10) + (32 * 2) /*+ 8*/ + 1+SaleProposal::trx_size(transfer_nft_instruction);
    pub fn trx_size(transfer_nft_instruction: &Vec<u8>) -> usize {
        4 + transfer_nft_instruction.len() //+ PriceStruct::LEN * 10 + 32 * 2 + 1 + 8
    }
}

#[account]
pub struct Transaction {
    pub transaction_instructions: Vec<u8>,
}

impl Transaction {
    pub fn size(trans: &Vec<u8>) -> usize {
        4 + trans.len()
    }
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone, Copy)]
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

/*
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct CreateAuctionArgs {
    /// How many winners are allowed for this auction. See AuctionData.
    pub winners: WinnerLimit,
    /// End time is the cut-off point that the auction is forced to end by. See AuctionData.
    pub end_auction_at: Option<UnixTimestamp>,
    /// Gap time is how much time after the previous bid where the auction ends. See AuctionData.
    pub end_auction_gap: Option<UnixTimestamp>,
    /// Token mint for the SPL token used for bidding.
    pub token_mint: Pubkey,
    /// Authority
    pub authority: Pubkey,
    /// The resource being auctioned. See AuctionData.
    pub resource: Pubkey,
    /// Set a price floor.
    pub price_floor: PriceFloor,
    /// Add a tick size increment
    pub tick_size: Option<u64>,
    /// Add a minimum percentage increase each bid must meet.
    pub gap_tick_size_percentage: Option<u8>,
}
*/

/* to do
test proceed to buy

update the code:
automate the price calculation
use PDA*/
