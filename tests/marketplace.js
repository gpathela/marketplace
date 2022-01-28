const assert = require("assert");
const anchor = require("@project-serum/anchor");
const { publicKey } = require("@project-serum/anchor/dist/cjs/utils");
const { SystemProgram, PublicKey } = anchor.web3;
const keys = [
  new PublicKey("H2N38iZpTXiGj86DCxuXwgQaaVVa3G64HR3RNfjyu49r"),
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

describe("marketplace", () => {
  const provider = anchor.Provider.local();

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  // Counter for the tests.
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
      console.log(token.toBase58());
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
});
