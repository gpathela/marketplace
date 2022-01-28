const assert = require("assert");
const anchor = require("@project-serum/anchor");
const { SystemProgram, PublicKey } = anchor.web3;
const web3 = require("@solana/web3.js");

const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const TokenInstructions = require("@project-serum/serum").TokenInstructions;
// const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
//   TokenInstructions.TOKEN_PROGRAM_ID.toString()
// );

describe("marketplace", () => {
  const provider = anchor.Provider.local();

  // cost USDC dev
  const usdcDummy = new PublicKey(
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  );
  const usTDummy = new PublicKey(
    "FWMTkCUmxa4xstJ6uP6wHHdtrC7sfCMoQNSg3z7rnbR5"
  );

  // const nftToSell= anchor.web3.Keypair.generate() DoQknEZ58VZUdPszCS8sqDszmmr9EPRyBpKgTpim3MNt
  const nftToSell = new PublicKey(
    "E4NpcJTWq1fc8X9LUGJqrrFq6a3BkXri8W6bVdeH7ygE"
  );
  console.log("nftToSell", nftToSell.toBase58());

  const usdcPrice = { token: usdcDummy, price: new anchor.BN(150) };
  const usdtPrice = { token: usTDummy, price: new anchor.BN(150) };
  const priceArray = [usdcPrice, usdtPrice];

  //
  const keys = [
    usdcDummy,
    usTDummy,
    new PublicKey("1nc1nerator11111111111111111111111111111111"),
    new PublicKey("1nc1nerator11111111111111111111111111111111"),
    new PublicKey("1nc1nerator11111111111111111111111111111111"),
    new PublicKey("1nc1nerator11111111111111111111111111111111"),
    new PublicKey("1nc1nerator11111111111111111111111111111111"),
    new PublicKey("1nc1nerator11111111111111111111111111111111"),
    new PublicKey("1nc1nerator11111111111111111111111111111111"),
    new PublicKey("1nc1nerator11111111111111111111111111111111"),
  ];
  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  // Aproved token list account.
  const approvedTokens = anchor.web3.Keypair.generate();

  // Program for the tests.
  const program = anchor.workspace.Marketplace;

  it("Initalize an approved token account", async () => {
    await program.rpc.initialize(provider.wallet.publicKey, {
      accounts: {
        approvedTokens: approvedTokens.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [approvedTokens],
    });

    let approvedTokensAccount = await program.account.approvedTokens.fetch(
      approvedTokens.publicKey
    );

    const requiredPubKey = new PublicKey(
      "1nc1nerator11111111111111111111111111111111"
    );
    approvedTokensAccount.tokens.forEach((token) => {
      console.log("token in initialize", token.toBase58());
      assert.equal(token.toBase58(), requiredPubKey.toBase58());
    });
    assert.ok(
      approvedTokensAccount.authority.equals(provider.wallet.publicKey)
    );
  });

  it("Update the token account", async () => {
    await program.rpc.updateApprovedTokens(keys, {
      accounts: {
        approvedTokens: approvedTokens.publicKey,
        authority: provider.wallet.publicKey,
      },
      signers: [provider.wallet.Keypair],
    });

    let approvedTokensAccount = await program.account.approvedTokens.fetch(
      approvedTokens.publicKey
    );

    const requiredPubKey = keys;
    for (let i = 0; i < keys.length; i++) {
      assert.equal(
        approvedTokensAccount.tokens[i].toBase58(),
        requiredPubKey[i].toBase58()
      );
    }

    assert.ok(
      approvedTokensAccount.authority.equals(provider.wallet.publicKey)
    );
  });

  ////

  it("Create Sell Proposal", async () => {
    console.log("nftToSell", nftToSell.toBase58());
    const saleProposal = anchor.web3.Keypair.generate();
    console.log(
      "saleProposal in create sell proposal",
      saleProposal.publicKey.toBase58()
    );
    await program.rpc.createProposal(nftToSell, priceArray, {
      accounts: {
        saleProposal: saleProposal.publicKey,
        approvedTokens: approvedTokens.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [provider.wallet.Keypair],
    });
    console.log(
      "saleProposal in create sell proposal",
      saleProposal.publicKey.toBase58()
    );
  });
});

// mint : E4NpcJTWq1fc8X9LUGJqrrFq6a3BkXri8W6bVdeH7ygE
// address : bkC8E8R4aEguteKzxGwh55Gz4VJdKUgC3SgU3QFgPC6
// nft : DoQknEZ58VZUdPszCS8sqDszmmr9EPRyBpKgTpim3MNt
// owner address : G3KGuXDfBHB3PFbC5c56ZWRbiQGMNuqPXzs2kDkZn177
