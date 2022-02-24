const assert = require("assert");
const anchor = require("@project-serum/anchor");
const { SystemProgram, PublicKey } = anchor.web3;
const web3 = require("@solana/web3.js");
const idl = require("../target/idl/marketplace.json");
const borsh = require("borsh");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const TokenInstructions = require("@project-serum/serum").TokenInstructions;
// const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
//   TokenInstructions.TOKEN_PROGRAM_ID.toString()
// );

describe("marketplace", () => {
  const provider = anchor.Provider.local();

  // cost USDC dev
  // const idl = Buffer.from(JSON.parse( require("fs").readFileSync('../target/idl/marketplace.json', {
  //   encoding: "utf-8",
  // })))

  let usdcDummy;
  let usTDummy;

  let nftToSell;

  let priceArray;
  let keys;

  let programId = new PublicKey(idl.metadata.address);
  const saleProposal = anchor.web3.Keypair.generate();
  const saleProposals = anchor.web3.Keypair.generate();
  const nonceAAcount = anchor.web3.Keypair.generate();
  const buyerAccount = anchor.web3.Keypair.generate();

  const ppayer = web3.Keypair.fromSecretKey(
    Buffer.from(
      JSON.parse(
        require("fs").readFileSync(process.env.ANCHOR_WALLET, {
          encoding: "utf-8",
        })
      )
    )
  );
  //
  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  // provider.connection.requestAirdrop(ppayer.publicKey,web3.LAMPORTS_PER_SOL);

  // Aproved token list account.
  const approvedTokens = anchor.web3.Keypair.generate();

  // Program for the tests.
  const program = anchor.workspace.Marketplace;

  it("Initalize an approved token account", async () => {
    usdcDummy = await createMint(6);
    console.log("usdcDummy", usdcDummy.toBase58());
    usTDummy = await createMint(6);
    console.log("usTDummy", usTDummy.toBase58());
    nftToSell = await createMint(0);
    console.log("nftToSell", nftToSell.toBase58());

    console.log('provider : ',provider);
    console.log('provider.connection :',provider.connection);

    await provider.connection.requestAirdrop(
      ppayer.publicKey,
      web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      nonceAAcount.publicKey,
      web3.LAMPORTS_PER_SOL
    );
    console.log("ppayer & nonceAAcount airdropped");

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
    // console.log("nftToSell : ", nftToSell.toBase58());

    console.log("Sale Proposal Account : ", saleProposal.publicKey.toBase58());
    console.log(
      "Approved Tokens Account : ",
      approvedTokens.publicKey.toBase58()
    );

    //Durable nonce initialize
    let tx_ini_nonce = new web3.Transaction().add(
      // create nonce account
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: nonceAAcount.publicKey,
        lamports: await provider.connection.getMinimumBalanceForRentExemption(
          web3.NONCE_ACCOUNT_LENGTH
        ),
        space: web3.NONCE_ACCOUNT_LENGTH,
        programId: programId,
      }),
      // init nonce account
      SystemProgram.nonceInitialize({
        noncePubkey: nonceAAcount.publicKey, // nonce account pubkey
        authorizedPubkey: programId, // nonce account authority (for advance and close)
      })
    );

    console.log(
      "nonceAAccount Pubkey : ",
      nonceAAcount.publicKey.toBase58()
      // "tx nonce : ", tx_ini_nonce
      // ,nonceAAcount
    );

    await program.rpc.createProposal(nftToSell, priceArray, {
      accounts: {
        saleProposal: saleProposal.publicKey,
        approvedTokens: approvedTokens.publicKey,
        user: provider.wallet.publicKey,
        // nonceAccount: nonceAAcount.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [saleProposal, ppayer],
    });

    console.log(
      "-- balance nonceAAcount : ",
      (await provider.connection.getBalance(nonceAAcount.publicKey)) /
        web3.LAMPORTS_PER_SOL,
      "--"
    );
    console.log(
      "-- balance ppayer : ",
      (await provider.connection.getBalance(ppayer.publicKey)) /
        web3.LAMPORTS_PER_SOL,
      "--"
    );
    // tx_ini_nonce.feePayer = provider.wallet.publicKey;
    // tx_ini_nonce = tx_ini_nonce.addSignature(provider.wallet);
    // console.log('tx partial signed : ', tx_ini_nonce.;

    let txhash = await provider.connection.sendTransaction(tx_ini_nonce, [
      ppayer,
      nonceAAcount,
    ]);
    console.log(`txhash: ${txhash}`);

    // retreive nonce
    let nonceAccountInfo = await provider.connection.getAccountInfo(
      nonceAAcount.publicKey
    );
    console.log("nonceAccountInfo : ", nonceAccountInfo.data.buffer.slice());
    // let nonceAccountData = web3.NonceAccount.fromAccountData(
    //   nonceAccountInfo.data.buffer.slice(0)
    // );
    // console.log("nonceAccountData : ", nonceAccountData);

    // use nonce
    let tx = new web3.Transaction().add(
      SystemProgram.nonceAdvance({
        noncePubkey: nonceAAcount.publicKey,
        authorizedPubkey: programId,
      }),
      //make Custom transfer
      SystemProgram.transfer({
        // fromPubkey: saleProposal.seller,
        // toPubkey: saleProposal.buyer,
        // payer: programId,

        lamports: 1,
      })
    );
    // assign `nonce` as recentBlockhash
    tx.recentBlockhash = nonceAAcount.nonce;
    tx.feePayer = programId;
    tx.sign(
      programId,
      nonceAccountAuth
    ); /* fee payer + nonce account authority + ... */

    console.log(
      `txhash: ${await connection.sendRawTransaction(tx.serialize())}`
    );
  });

  it("Cancel sale proposal", async () => {
    await program.rpc.cancelProposal(nftToSell, {
      accounts: {
        saleProposal: saleProposal.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [ppayer],
    });

    console.log("sale Proposal cancelled :", saleProposal.publicKey.toBase58());
  });

  it("Create proposal into PDA", async () => {
    // console.log("Sale Proposal Program : ", idl.metadata.address);
    // console.log("idl : ", idl.metadata.address);
    console.log("programId : ", programId.toBase58());

    const [proposal, nonceP] = await web3.PublicKey.findProgramAddress(
      ["PriviProposal"],
      // [provider.wallet.publicKey.toBuffer(), programId.toBuffer(), idl.metadata.address],
      programId
    );
    console.log(
      "proposal PDA : ",
      proposal.toBase58(),
      "\n  nonceP : ",
      nonceP
    );

    const proposalList = await provider.connection.getProgramAccounts(
      // idl.metadata.address
      programId
    );
    // console.log("proposalList", proposalList);
    {
      //TEST DESERIALIZATION
      // class Assignable {
      //   constructor(properties) {
      //     Object.keys(properties).map((key) => {
      //       return (this[key] = properties[key]);
      //     });
      //   }
      // }
      // class AccoundData extends Assignable {}
      // // class PriceData extends Assignable {}
      // // const prices = new Map([
      // //   PriceData,
      // //   {
      // //     kind: "struct",
      // //     fields: [
      // //       ["price", "u64"],
      // //       ["token", "Pubkey"],
      // //     ],
      // //   },
      // // ]);
      // // const dataSchema = new Map([
      // //   [
      // //     AccoundData,
      // //     {
      // //       kind: "struct",
      // //       fields: [
      // //         ["prices", "struct"],
      // //         ["token", "Pubkey"],
      // //         ["seller", "Pubkey"],
      // //         ["propoal_id", "u64"],
      // //         ["proposal_status", "u8"],
      // //       ],
      // //     },
      // //   ],
      // // ]);
      // const dataSchema = new Map([
      //   [
      //     AccoundData,
      //     {
      //       kind: "struct",
      //       fields: [
      //         [
      //           // "prices",
      //           // {
      //           //   kind: "map",
      //           //   fields: [
      //           //     [key:"price", value:"u64"],
      //           //     ["token", "Pubkey"],
      //           //   ],
      //           // },
      //           "map", { kind: 'map', key: 'string', value: 'string' }
      //         ],
      //         ["token", "Pubkey"],
      //         ["seller", "Pubkey"],
      //         ["proposal_id", "u64"],
      //         ["proposal_status", "u8"],
      //       ],
      //     },
      //   ],
      // ]);
    }

    // console.log("proposal List : ", proposalList);
    proposalList.forEach((account, i) => {
      {
        //TEST DESERIALIZATION
        // const datadeserialized = borsh.deserializeUnchecked(
        //   dataSchema,
        //   AccoundData,
        //   account.account.data
        // );
        // export async function getAccountData(connection: Connection, account: PublicKey): Promise<AccoundData> {
        // let nameAccount = provider.connection.getAccountInfo(
        //   account,
        //   "processed"
        // );
        // const deserializedData = borsh.deserializeUnchecked(
        //   dataSchema,
        //   AccoundData,
        //   nameAccount.data
        // );
      }

      console.log(
        `-- Token Account Address ${i + 1} : ${account.pubkey.toString()} --`
      );
      console.log(`Data : ${account.account.data.buffer}`);
      console.log(
        `Amount : ${account.account.lamports / web3.LAMPORTS_PER_SOL} sol`
      );
    });
  });

  /// for testing purpose CreateMint creates token (decimals) or NFT (no decimals)
  async function createMint(decimals) {
    const mint = anchor.web3.Keypair.generate();
    let instructions = [
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: mint.publicKey,
        space: 82,
        lamports: await provider.connection.getMinimumBalanceForRentExemption(
          82
        ),
        programId: TOKEN_PROGRAM_ID,
      }),
      TokenInstructions.initializeMint({
        mint: mint.publicKey,
        decimals: decimals,
        mintAuthority: provider.wallet.publicKey,
      }),
    ];
    const tx = new anchor.web3.Transaction();
    tx.add(...instructions);
    await provider.send(tx, [mint]);
    return mint.publicKey;
  }
});

//Testnet Address - Later
// mint : E4NpcJTWq1fc8X9LUGJqrrFq6a3BkXri8W6bVdeH7ygE
// address : bkC8E8R4aEguteKzxGwh55Gz4VJdKUgC3SgU3QFgPC6
// nft : DoQknEZ58VZUdPszCS8sqDszmmr9EPRyBpKgTpim3MNt
// owner address : G3KGuXDfBHB3PFbC5c56ZWRbiQGMNuqPXzs2kDkZn177
