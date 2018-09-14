const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .use(require('chai-as-promised'))
    .should();

const { timeTo, increaseTime, revert, snapshot } = require('sc-library/test-utils/evmMethods');
const { web3async, estimateConstructGas } = require('sc-library/test-utils/web3Utils');

const Crowdsale = artifacts.require('./TemplateCrowdsale.sol');
const Token = artifacts.require('./MainToken.sol');


const BASE_RATE = new BigNumber('1000');
const SOFT_CAP_WEI = new BigNumber('0');
const HARD_CAP_WEI = new BigNumber('100000000000000000000000000000000000');
const START_TIME = 1507734000; // eslint-disable-line no-undef
const END_TIME = 1507820400; // eslint-disable-line no-undef
const TOKEN_DECIMAL_MULTIPLIER = new BigNumber(10).toPower(10); // eslint-disable-line no-undef
const ETHER = web3.toWei(1, 'ether');
const GAS_PRICE = web3.toWei(100, 'gwei');




const MIN_VALUE_WEI = new BigNumber('1000000000000000000');




contract('TemplateCrowdsale', accounts => {
    const OWNER = accounts[0];
    const BUYER_1 = accounts[1];
    const BUYER_2 = accounts[2];
    const BUYER_3 = accounts[3];
    const COLD_WALLET = accounts[4];
    const TARGET_USER = accounts[5];

    let now;
    let snapshotId;

    const createCrowdsale = async () => {
        const token = await Token.new();
        const crowdsale = await Crowdsale.new(token.address);
        await token.transferOwnership(crowdsale.address);
        await crowdsale.init();
        return crowdsale;
    };

    const getBlockchainTimestamp = async () => {
        const latestBlock = await web3async(web3.eth, web3.eth.getBlock, 'latest');
        return latestBlock.timestamp;
    };

    const getRate = async (weiAmount, crowdsale) => {
        let rate = BASE_RATE.mul(TOKEN_DECIMAL_MULTIPLIER);

        
        return rate;
    };

    const tokensForWei = async (weiAmount, crowdsale) => {
        return (await getRate(weiAmount, crowdsale)).mul(weiAmount).div(ETHER).floor();
    };

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
        now = await getBlockchainTimestamp();
    });

    afterEach(async () => {
        await revert(snapshotId);
    });

    it('#0 gas usage', async () => {
        const token = await Token.new();
        await estimateConstructGas(Crowdsale, token.address)
            .then(console.info);
    });

    it('#0 balances', () => {
        accounts.forEach((account, index) => {
            web3.eth.getBalance(account, function (_, balance) {
                const etherBalance = web3.fromWei(balance, 'ether');
                console.info(`Account ${index} (${account}) balance is ${etherBalance}`);
            });
        });
    });

    it('#0 3/4 precheck', async () => {
        OWNER.should.be.equals('0xe33c67fcb6f17ecadbc6fa7e9505fc79e9c8a8fd', 'it must be the same');
        COLD_WALLET.should.be.equals('0x9b37d7b266a41ef130c4625850c8484cf928000d', 'it must be the same');
        TARGET_USER.should.be.equals('0x8ffff2c69f000c790809f6b8f9abfcbaab46b322', 'it must be the same');
    });

    it('#1 construct', async () => {
        const crowdsale = await createCrowdsale();
        await crowdsale.token().then(console.info);
        await crowdsale.token().should.eventually.have.length(42);
    });

    it('#2 check started', async () => {
        const crowdsale = await createCrowdsale();
        let hasStarted = await crowdsale.hasStarted();
        hasStarted.should.be.equals(false, 'crowdsale should be not started yet.');

        await increaseTime(START_TIME - now);
        hasStarted = await crowdsale.hasStarted();
        hasStarted.should.be.equals(true, 'crowdsale should be started after timeshift.');
    });

    it('#3 check finished', async () => {
        const crowdsale = await createCrowdsale();
        let hasStarted = await crowdsale.hasStarted();
        let hasEnded = await crowdsale.hasEnded();

        hasStarted.should.be.equals(false, 'hasStarted before timeshift');
        hasEnded.should.be.equals(false, 'hasEnded before timeshift');

        await timeTo(END_TIME + 1);

        hasStarted = await crowdsale.hasStarted();
        hasEnded = await crowdsale.hasEnded();

        hasStarted.should.be.equals(true, 'hasStarted after timeshift');
        hasEnded.should.be.equals(true, 'hasEnded after timeshift');
    });

    it('#4 check simple buy token', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - now);
        
        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });
        

        let wei = SOFT_CAP_WEI.div(2).floor();
        
        wei = HARD_CAP_WEI.div(2).floor();
        

        
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        

        const expectedTokens = await tokensForWei(wei, crowdsale);

        const coldWalletSourceBalance = await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET);
        await crowdsale.sendTransaction({ from: BUYER_1, value: wei });
        const token = Token.at(await crowdsale.token());
        const actualTokens = (await token.balanceOf(BUYER_1));
        actualTokens.should.be.bignumber.equal(expectedTokens);

        let balance;
        
        balance = (await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET)).sub(coldWalletSourceBalance);
        
        balance.should.be.bignumber.equal(wei, 'money should be on vault');
    });

    it('#5 check buy tokens before ICO', async () => {
        const crowdsale = await createCrowdsale();

        
        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });
        

        let wei = SOFT_CAP_WEI.div(2).floor();
        
        wei = HARD_CAP_WEI.div(2).floor();
        
        
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        
        await crowdsale.sendTransaction({ from: BUYER_1, value: wei }).should.eventually.be.rejected;
    });

    

    

    it('#8 check finish crowdsale after time', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - now);

        
        await crowdsale.addAddressToWhitelist(OWNER, { from: TARGET_USER });
        

        let wei = SOFT_CAP_WEI.div(2).floor();
        
        wei = HARD_CAP_WEI.div(2).floor();
        

        
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        

        // send some tokens
        await crowdsale.send(wei);

        // try to finalize before the END
        await crowdsale.finalize({ from: TARGET_USER }).should.eventually.be.rejected;

        await increaseTime(END_TIME - START_TIME + 1);
        // finalize after the END time
        await crowdsale.finalize({ from: TARGET_USER });
        // try to transfer some tokens (it should work now)
        const tokens = await tokensForWei(wei, crowdsale);

        
        // mint must be disabled
        await token.mint(BUYER_2, tokens, { from: TARGET_USER }).should.eventually.be.rejected;
        await token.mintingFinished().should.eventually.be.true;

        await token.transfer(BUYER_1, tokens);
        (await token.balanceOf(BUYER_1)).should.be.bignumber.equals(tokens, 'balanceOf buyer must be');
        
        await token.owner().should.eventually.be.equals(TARGET_USER, 'token owner must be TARGET_USER, not OWNER');
    });

    it('#9 check tokens locking', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - now);

        
        await crowdsale.addAddressToWhitelist(OWNER, { from: TARGET_USER });
        

        let wei = SOFT_CAP_WEI.div(2).floor();
        
        wei = HARD_CAP_WEI.div(2).floor();
        

        
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        

        await crowdsale.send(wei);

        // check transferable before end
        
        await token.transfer(BUYER_1, (await tokensForWei(wei, crowdsale)).div(2));
        
    });

    

    it('#11 check finish crowdsale because time', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(END_TIME - now);

        
        await crowdsale.addAddressToWhitelist(OWNER, { from: TARGET_USER });
        

        let wei = SOFT_CAP_WEI.div(2).floor();
        
        wei = HARD_CAP_WEI.div(2).floor();
        

        
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        
        await crowdsale.send(wei).should.eventually.be.rejected;
    });

    

    

    
    it('#15 check if minimal value not reached', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - now);

        
        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });
        

        const belowMin = MIN_VALUE_WEI.div(2).floor();
        await crowdsale.sendTransaction({ from: BUYER_1, value: belowMin }).should.eventually.be.rejected;
    });

    
    

    

    

    

    

    
    it('#25 check buy not by whitelisted', async () => {
        const crowdsale = await createCrowdsale();
        await timeTo(START_TIME);

        let wei = SOFT_CAP_WEI.div(2).floor();
        
        wei = HARD_CAP_WEI.div(2).floor();
        

        
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        

        await crowdsale.sendTransaction({ from: BUYER_1, value: wei }).should.eventually.be.rejected;
    });

    it('#26 check add multiple addresses to whitelist', async () => {
        let wei = SOFT_CAP_WEI.div(2).floor();
        
        wei = HARD_CAP_WEI.div(2).floor();
        

        
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        

        const addresses = [BUYER_1, BUYER_2];

        for (let i = 0; i < addresses.length; i++) {
            await revert(snapshotId);
            snapshotId = (await snapshot()).result;

            const crowdsale = await createCrowdsale();
            await timeTo(START_TIME);

            await crowdsale.addAddressesToWhitelist(addresses, { from: TARGET_USER });
            await crowdsale.sendTransaction({ from: addresses[i], value: wei });
        }
    });

    it('#27 check remove addresses from whitelist', async () => {
        let wei = SOFT_CAP_WEI.div(2).floor();
        
        wei = HARD_CAP_WEI.div(2).floor();
        

        
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        

        const addresses = [BUYER_1, BUYER_2, BUYER_3];

        const crowdsale = await createCrowdsale();
        await timeTo(START_TIME);

        await crowdsale.addAddressesToWhitelist(addresses, { from: TARGET_USER });

        await crowdsale.removeAddressFromWhitelist(BUYER_1, { from: TARGET_USER });
        await crowdsale.sendTransaction({ from: BUYER_1, value: wei }).should.eventually.be.rejected;

        await crowdsale.removeAddressesFromWhitelist([BUYER_2, BUYER_3], { from: TARGET_USER });
        await crowdsale.sendTransaction({ from: BUYER_2, value: wei }).should.eventually.be.rejected;
        await crowdsale.sendTransaction({ from: BUYER_3, value: wei }).should.eventually.be.rejected;
    });

    it('#28 check whitelist 100 addresses', async () => {
        const addresses = new Array(100).fill(accounts[0]);
        const crowdsale = await createCrowdsale();
        const tx = await crowdsale.addAddressesToWhitelist(addresses, { from: TARGET_USER });
        console.info('Gas used for whitelist 100 addresses: ', tx.receipt.gasUsed);
    });
    
});


