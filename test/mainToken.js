const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .use(require('chai-as-promised'))
    .should();

const { revert, snapshot } = require('sc-library/test-utils/evmMethods');
const { estimateConstructGas } = require('sc-library/test-utils/web3Utils');

const Token = artifacts.require('./MainToken.sol');

const Crowdsale = artifacts.require('./TemplateCrowdsale.sol');

const SuccessfulERC223Receiver = artifacts.require('./SuccessfulERC223Receiver.sol');
const FailingERC223Receiver = artifacts.require('./FailingERC223Receiver.sol');
const ERC223ReceiverWithoutTokenFallback = artifacts.require('./ERC223ReceiverWithoutTokenFallback.sol');



contract('Token', accounts => {
    const OWNER = accounts[0];
    const BUYER_1 = accounts[1];
    const TARGET_USER = accounts[5];

    let TOKEN_OWNER = OWNER;
    

    let snapshotId;

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
    });

    afterEach(async () => {
        await revert(snapshotId);
    });

    it('#0 gas usage', async () => {
        await estimateConstructGas(Token).then(console.info);
    });

    it('#0 3/4 precheck', async () => {
        TARGET_USER.should.be.equals('0x8ffff2c69f000c790809f6b8f9abfcbaab46b322', 'it must be the same');
    });

    it('#1 construct', async () => {
        const token = await Token.new();
        token.address.should.have.length(42);
        await token.owner().should.eventually.be.equals(TOKEN_OWNER);
    });

    
    it('#2 minting', async () => {
        const token = await Token.new();

        const tokensToMint = web3.toWei(1, 'ether');
        await token.mint(BUYER_1, tokensToMint, { from: TOKEN_OWNER });
        const balance = await token.balanceOf(BUYER_1);
        balance.should.bignumber.be.equals(tokensToMint);
    });

    it('#3 minting after it finished', async () => {
        const token = await Token.new();

        const tokensToMint = web3.toWei(1, 'ether');

        await token.finishMinting({ from: TOKEN_OWNER });
        await token.mint(BUYER_1, tokensToMint, { from: TOKEN_OWNER }).should.eventually.be.rejected;
    });

    it('#4 burn', async () => {
        const token = await Token.new();

        const tokensToMint = web3.toWei(1, 'ether');
        await token.mint(OWNER, tokensToMint, { from: TOKEN_OWNER });
        await token.burn(tokensToMint + 1).should.eventually.be.rejected;
        await token.burn(tokensToMint / 2);
    });

    
    

    
});


