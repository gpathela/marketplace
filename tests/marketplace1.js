const anchor = require("@project-serum/anchor");
const assert = require('assert');
const {
  SystemProgram,
  PublicKey,
  Keypair,
  Transaction,
  LAMPORTS_PER_SOL,
  NONCE_ACCOUNT_LENGTH,
  NonceAccount,
} = anchor.web3;
const web3 = require("@solana/web3.js");
const spl = require("@solana/spl-token");
// const nacl = require("tweetnacl");
const TokenInstructions = require("@project-serum/serum").TokenInstructions;
const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
  TokenInstructions.TOKEN_PROGRAM_ID.toString()
);
describe("marketplace1", () => {
  //setup the environment
  const provider = anchor.Provider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.Marketplace1;

  //declare general datas
  let usdcDummy;
  let usTDummy;

  let nftToSell;

  let genericPriceArray = Keypair.generate();

  // let programId = new PublicKey(idl.metadata.address);

  let saleProposal = Keypair.generate();
  let buyerAccount = Keypair.generate();

  // Aproved token list account.
  let approvedTokens = Keypair.generate();

  const randomKey = Keypair.generate();
  const ppayer = Keypair.fromSecretKey(
    Buffer.from(
      JSON.parse(
        require("fs").readFileSync(process.env.ANCHOR_WALLET, {
          encoding: "utf-8",
        })
      )
    )
  );

  // let nonceAAccount = anchor.web3.Keypair.generate();
  it("1) Initalize environment & price Array", async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        randomKey.publicKey,
        web3.LAMPORTS_PER_SOL * 100
      )
    );
    console.log(
      "balance of randomkey : ",
      await provider.connection.getBalance(randomKey.publicKey)/LAMPORTS_PER_SOL," sol"
    );
    //Account holding approved Token List
    // const approvedTokens = Keypair.generate();

    await program.rpc.initialize(ppayer.publicKey, {
      accounts: {
        approvedTokens: approvedTokens.publicKey,
        user: ppayer.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [approvedTokens],
    });
    console.log('1');
    let approvedTokensAccount = await program.account.approvedTokens.fetch(
      approvedTokens.publicKey
    );
    console.log('2');

    const requiredPubKey = new PublicKey(
      "1nc1nerator11111111111111111111111111111111"
    );
console.log('3');

    approvedTokensAccount.tokens.forEach((token) => {
      assert.equal(token.toBase58(), requiredPubKey.toBase58());
    });
console.log('4');

    assert.ok(
      approvedTokensAccount.authority.equals(ppayer.publicKey)
    );
  });

  it("2) Update the token account", async () => {
    [usdcDummy, _usdcDummy_associated] = await createMint(randomKey, 6, 0);
    console.log("usdcDummy", usdcDummy.toBase58());
    [usTDummy, _usTDummy_associated] = await createMint(randomKey, 6, 0);
    console.log("usTDummy", usTDummy.toBase58());

    const usdcPrice = { token: usdcDummy, price: new anchor.BN(150) };
    const ustPrice = { token: usTDummy, price: new anchor.BN(145) };
    priceArray = [usdcPrice, ustPrice];

    keys = [
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

    await program.rpc.updateApprovedTokens(keys, {
      accounts: {
        approvedTokens: approvedTokens.publicKey,
        authority: ppayer.publicKey,
      },
      signers: [ppayer],
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
      approvedTokensAccount.authority.equals(ppayer.publicKey)
    );
  });

  it("3) creating nonce Account", async () => {
    console.log("------------------------------");
    console.log("--- Creating Nonce Account ---");
    console.log("------------------------------");

    const nonceAccountAuth = Keypair.generate();
    console.log("nonceAccountAuth : ", nonceAccountAuth.publicKey.toBase58());
    const nonceAccount = Keypair.generate();
    console.log("nonceAccount : ", nonceAccount.publicKey.toBase58());

    const tx1 = new Transaction().add(
      // create nonce account
      SystemProgram.createAccount({
        fromPubkey: ppayer.publicKey,
        newAccountPubkey: nonceAccount.publicKey,
        lamports: await provider.connection.getMinimumBalanceForRentExemption(
          NONCE_ACCOUNT_LENGTH
        ),
        space: NONCE_ACCOUNT_LENGTH,
        programId: SystemProgram.programId,
      }),
      // init nonce account
      SystemProgram.nonceInitialize({
        noncePubkey: nonceAccount.publicKey, // nonce account pubkey
        authorizedPubkey: nonceAccountAuth.publicKey, // nonce account authority (for advance and close)
      })
    );

    const txhash = await provider.send(tx1, [ppayer, nonceAccount]);

    console.log(`txhash Create Nonce & Initialize: ${txhash}`);

    console.log("------------------------------");
    console.log("---- Creating Transaction ----");
    console.log("------------------------------");

    let ppayerassociatedAccount;
    // Creating custom transaction to be stored
    [nftToSell, ppayerassociatedAccount] = await createMint(ppayer, 0, 10);
    console.log("nftToSell mint Pubkey: ", nftToSell.toBase58());

    console.log(
      "ppayerassociatedAccount  Pubkey: ",
      ppayerassociatedAccount.toBase58(),
      "with a balance of",
      await provider.connection.getBalance(ppayerassociatedAccount)
    );

    let accountInfo = await provider.connection.getAccountInfo(
      nonceAccount.publicKey
    );

    let nonceAccountdata = NonceAccount.fromAccountData(accountInfo.data);

    buyerAccount; //= anchor.web3.Keypair.generate();

    const toAssociated = await spl.Token.getAssociatedTokenAddress(
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      nftToSell,
      buyerAccount.publicKey
    );

    console.log(
      "associated account of buyerAccount (",
      buyerAccount.publicKey.toBase58(),
      ") \n is  : ",
      toAssociated.toBase58()
    );

    let tx2 = new Transaction().add(
      // nonce advance must be the first instruction
      SystemProgram.nonceAdvance({
        noncePubkey: nonceAccount.publicKey,
        authorizedPubkey: nonceAccountAuth.publicKey,
      }),
      // after that, you do what you really want to do, here we append a transfer instruction as an example.
      spl.Token.createTransferCheckedInstruction(
        TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
        ppayerassociatedAccount, // from (should be a token account)
        nftToSell, // mint
        toAssociated, // to (should be a token account)
        ppayer.publicKey, // owner of from
        [], // for multisig account, leave empty.
        10, // amount, if your deciamls is 8, send 10^8 for 1 token
        0 // decimals
      )
    );

    tx2.feePayer = ppayer.publicKey;
    tx2.recentBlockhash = nonceAccountdata.nonce;

    tx2.sign(ppayer, nonceAccountAuth);
    console.log("tx2 ", tx2);

    console.log("transaction signed");
    const rawTransaction = tx2.serialize();
    console.log("transaction serialized");
    const u8Transaction = new Uint8Array(rawTransaction);
    // console.log("u8Transaction", u8Array);

    console.log("---------------------------------");
    console.log("- Create proposal & Transaction -");
    console.log("---------------------------------");

    const transactionDataAccount = anchor.web3.Keypair.generate();
    // const saleProposal = anchor.web3.Keypair.generate();

    sellPrices = [
      usTDummy,
      new PublicKey("1nc1nerator11111111111111111111111111111111"),
      new PublicKey("1nc1nerator11111111111111111111111111111111"),
      new PublicKey("1nc1nerator11111111111111111111111111111111"),
      new PublicKey("1nc1nerator11111111111111111111111111111111"),
      new PublicKey("1nc1nerator11111111111111111111111111111111"),
      new PublicKey("1nc1nerator11111111111111111111111111111111"),
      new PublicKey("1nc1nerator11111111111111111111111111111111"),
      new PublicKey("1nc1nerator11111111111111111111111111111111"),
      new PublicKey("1nc1nerator11111111111111111111111111111111"),
    ];

    // Create the new account and initialize it with the program.
    await program.rpc.createProposal(nftToSell, sellPrices, u8Transaction, {
      accounts: {
        saleProposal: saleProposal.publicKey,
        transactionDataAccount: transactionDataAccount.publicKey,
        approvedTokens: approvedTokens.publicKey,
        user: ppayer.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [saleProposal, transactionDataAccount, ppayer],
    });
    console.log(
      "after innit : ",
      await provider.connection.getAccountInfo(transactionDataAccount.publicKey)
    );
    console.log("");
  });

  // it("4) fetching nonce Account", async () => {
  //   console.log("------------------------------");
  //   console.log("--- fetching nonce Account ---");
  //   console.log("------------------------------");

  //   let accountInfo = await provider.connection.getAccountInfo(
  //     nonceAccount.publicKey
  //   );
  //   console.log("accountInfo:", accountInfo);
  //   let nonceAccountdata = NonceAccount.fromAccountData(accountInfo.data);
  //   console.log("nonce account data", JSON.stringify(nonceAccountdata));

  //   // console.log("nonceAccount : ", nonceAAccount.publicKey.toBase58());

  //   // let accountInfo = await provider.connection.getAccountInfo(nonceAAccount.publicKey);
  //   // console.log("accountInfo : ", accountInfo);
  //   // let nonceAccount = anchor.web3.NonceAccount.fromAccountData(
  //   //   accountInfo.data
  //   // );
  //   // console.log("nonceAccount : ", nonceAccount);
  // });

  // Create Custom mint
  async function createMint(authority, decimals, nbmint) {
    nbmint = nbmint * 10 ** decimals;
    // Create the Mint Account for the NFT
    const mintAccount = await spl.Token.createMint(
      provider.connection,
      authority,
      authority.publicKey,
      authority.publicKey,
      decimals,
      TOKEN_PROGRAM_ID
    );

    // Get or Create the Associated Account for the user to hold the NFT
    const userAssosciatedAccount =
      await mintAccount.getOrCreateAssociatedAccountInfo(authority.publicKey);

    // Mint token to the user's associated account
    await mintAccount.mintTo(
      userAssosciatedAccount.address,
      authority.publicKey,
      [],
      nbmint
    );

    return [mintAccount.publicKey, userAssosciatedAccount.address];
  }
});
