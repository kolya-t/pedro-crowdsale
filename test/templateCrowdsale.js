const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .use(require('chai-as-promised'))
    .should();

const { timeTo, increaseTime, revert, snapshot } = require('sc-library/test-utils/evmMethods');
const { web3async, estimateConstructGas } = require('sc-library/test-utils/web3Utils');

const Crowdsale = artifacts.require('./VaeonCrowdsale.sol');
const Token = artifacts.require('./VaeonToken.sol');

const BASE_RATE = new BigNumber('1000');
const USDCENTS_HARD_CAP = new BigNumber('3000000000');
const START_TIME = 1507734000; // eslint-disable-line no-undef
const END_TIME = 1510326000; // eslint-disable-line no-undef
const TOKEN_DECIMAL_MULTIPLIER = new BigNumber(10).toPower(10); // eslint-disable-line no-undef
const ETHER = web3.toWei(1, 'ether');
const GAS_PRICE = web3.toWei(100, 'gwei');

const MIN_VALUE_WEI = new BigNumber('10000000000000000');

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
        const crowdsale = await Crowdsale.new(token.address, 1000, 21995, 86400);
        await token.transferOwnership(crowdsale.address);
        await crowdsale.init();
        return crowdsale;
    };

    const getBlockchainTimestamp = async () => {
        const latestBlock = await web3async(web3.eth, web3.eth.getBlock, 'latest');
        return latestBlock.timestamp;
    };

    const getRate = async (weiAmount, crowdsale) => {
        return BASE_RATE.mul(TOKEN_DECIMAL_MULTIPLIER);
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
        await estimateConstructGas(Crowdsale, token.address, 1000, 21995, 86400)
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
        OWNER.should.be.equals('0xe0142c436305d7f63553f00616976d6e17720353', 'it must be the same');
        COLD_WALLET.should.be.equals('0x5e2909baee620b3aac56ab8dfeb1b4f096933705', 'it must be the same');
        TARGET_USER.should.be.equals('0x862509647141f70c975cd02f3b4bde8a0669fde1', 'it must be the same');
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
        let hasClosed = await crowdsale.hasClosed();

        hasStarted.should.be.equals(false, 'hasStarted before timeshift');
        hasClosed.should.be.equals(false, 'hasClosed before timeshift');

        await timeTo(END_TIME + 1);

        hasStarted = await crowdsale.hasStarted();
        hasClosed = await crowdsale.hasClosed();

        hasStarted.should.be.equals(true, 'hasStarted after timeshift');
        hasClosed.should.be.equals(true, 'hasClosed after timeshift');
    });

    it('#4 check simple send fund to CS', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - now);

        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });

        const ethUsdCentRate = await crowdsale.ethUsdCentRate();
        const wei = web3.toWei(USDCENTS_HARD_CAP.div(ethUsdCentRate), 'ether').floor();

        await crowdsale.sendTransaction({ from: BUYER_1, value: wei });

        const weiRaised = await crowdsale.weiRaised();
        weiRaised.should.bignumber.be.equal(wei);

        const usdCentsRaisedByEth = await crowdsale.usdCentsRaisedByEth();
        usdCentsRaisedByEth.should.bignumber.be.equal(wei.mul(ethUsdCentRate).div(web3.toWei(1, 'ether')).floor());
    });

    it('#5 check buy tokens before ICO', async () => {
        const crowdsale = await createCrowdsale();

        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });

        const ethUsdCentRate = await crowdsale.ethUsdCentRate();
        const wei = web3.toWei(USDCENTS_HARD_CAP.div(ethUsdCentRate), 'ether').floor();

        await crowdsale.sendTransaction({ from: BUYER_1, value: wei }).should.eventually.be.rejected;
    });

    it('#6 check that dailyCheck successfully changing variables', async () => {
        const crowdsale = await createCrowdsale();
        const stopAfterSeconds = Number(await crowdsale.stopAfterSeconds());

        await crowdsale.dailyCheck(0, 1000, 50000, stopAfterSeconds, { from: TARGET_USER }).should.eventually.be.rejected;

        await timeTo(START_TIME + stopAfterSeconds);
        await crowdsale.dailyCheck(0, 1000, 50000, stopAfterSeconds - 10, { from: TARGET_USER });

        (await crowdsale.stopAfterSeconds()).should.bignumber.be.equal(stopAfterSeconds - 10);
        const ethUsdCentRate = await crowdsale.ethUsdCentRate();
        ethUsdCentRate.should.bignumber.be.equal(50000);

        const wei = web3.toWei(USDCENTS_HARD_CAP.div(ethUsdCentRate), 'ether').floor();

        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });
        await crowdsale.sendTransaction({ from: BUYER_1, value: wei });
    });

    it('#7 check finish crowdsale after time', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - now);

        await crowdsale.addAddressToWhitelist(OWNER, { from: TARGET_USER });

        const ethUsdCentRate = await crowdsale.ethUsdCentRate();
        const wei = web3.toWei(USDCENTS_HARD_CAP.div(ethUsdCentRate), 'ether').floor();

        // send some tokens
        await crowdsale.send(wei);

        // try to finalize before the END
        await crowdsale.finalize({ from: TARGET_USER }).should.eventually.be.rejected;

        await timeTo(END_TIME + 1);
        // finalize after the END time
        await crowdsale.finalize({ from: TARGET_USER }).should.eventually.be.rejected;
        await crowdsale.dailyCheck(0, 1000, 50000, 0, { from: TARGET_USER });

        // mint must be disabled
        await token.mint(BUYER_2, 10, { from: TARGET_USER }).should.eventually.be.rejected;
        await token.mintingFinished().should.eventually.be.true;

        // withdraw tokens
        await crowdsale.withdraw();

        await token.transfer(BUYER_1, 1);
        (await token.balanceOf(BUYER_1)).should.be.bignumber.equals(1, 'balanceOf buyer must be');

        await token.owner().should.eventually.be.equals(TARGET_USER, 'token owner must be TARGET_USER, not OWNER');
    });

    it('#8 check if minimal value not reached', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - now);

        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });

        const belowMin = MIN_VALUE_WEI.div(2).floor();
        await crowdsale.sendTransaction({ from: BUYER_1, value: belowMin }).should.eventually.be.rejected;
    });

    it('#9 check buy not by whitelisted', async () => {
        const crowdsale = await createCrowdsale();
        await timeTo(START_TIME);

        const ethUsdCentRate = await crowdsale.ethUsdCentRate();
        const wei = web3.toWei(USDCENTS_HARD_CAP.div(ethUsdCentRate), 'ether').floor();

        await crowdsale.sendTransaction({ from: BUYER_1, value: wei });

        let weiRaised = await crowdsale.weiRaised();
        let usdCentsRaisedByEth = await crowdsale.usdCentsRaisedByEth();

        weiRaised.should.bignumber.be.equal(0);
        usdCentsRaisedByEth.should.bignumber.be.equal(0);

        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });

        weiRaised = await crowdsale.weiRaised();
        usdCentsRaisedByEth = await crowdsale.usdCentsRaisedByEth();

        weiRaised.should.bignumber.be.equal(wei);
        usdCentsRaisedByEth.should.bignumber.be.equal(wei.mul(ethUsdCentRate).div(web3.toWei(1, 'ether')).floor());
    });

    it('#10 check add multiple addresses to whitelist', async () => {
        const addresses = [BUYER_1, BUYER_2];

        for (let i = 0; i < addresses.length; i++) {
            await revert(snapshotId);
            snapshotId = (await snapshot()).result;

            const crowdsale = await createCrowdsale();
            await timeTo(START_TIME);

            const ethUsdCentRate = await crowdsale.ethUsdCentRate();
            const wei = web3.toWei(USDCENTS_HARD_CAP.div(ethUsdCentRate), 'ether').floor();

            await crowdsale.addAddressesToWhitelist(addresses, { from: TARGET_USER });
            await crowdsale.sendTransaction({ from: addresses[i], value: wei });
        }
    });
});


