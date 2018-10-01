const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .use(require('chai-as-promised'))
    .should();

const { timeTo, increaseTime, revert, snapshot } = require('sc-library/test-utils/evmMethods');
const { web3async, estimateConstructGas } = require('sc-library/test-utils/web3Utils');

const Crowdsale = artifacts.require('./VaeonCrowdsale.sol');
const Token = artifacts.require('./VaeonToken.sol');

const USDCENTS_HARD_CAP = new BigNumber('3000000000');
const START_TIME = 1507734000; // eslint-disable-line no-undef
const END_TIME = 1510326000; // eslint-disable-line no-undef

const MIN_VALUE_WEI = new BigNumber('100000000000000000');

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
        const crowdsale = await Crowdsale.new(
            token.address,
            new BigNumber(100000000).div(7.5).floor(),
            25000,
            86400,
            1507734000,
            1510326000,
            TARGET_USER,
            COLD_WALLET
        );
        await token.transferOwnership(crowdsale.address);
        await crowdsale.init();
        return crowdsale;
    };

    const getBlockchainTimestamp = async () => {
        const latestBlock = await web3async(web3.eth, web3.eth.getBlock, 'latest');
        return latestBlock.timestamp;
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
        await estimateConstructGas(
            Crowdsale,
            token.address,
            new BigNumber(100000000).div(7.5).floor(),
            25000,
            86400,
            1507734000,
            1510326000,
            TARGET_USER,
            COLD_WALLET
        ).then(console.info);
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
        const dailyCheckStopTimestamp = Number(await crowdsale.dailyCheckStopTimestamp());

        await crowdsale.dailyCheck(0, 133333333333333333, 50000, 86400, { from: TARGET_USER }).should.eventually.be.rejected;

        await timeTo(dailyCheckStopTimestamp);
        await crowdsale.dailyCheck(0, 133333333333333333, 50000, 86400 - 10, { from: TARGET_USER });

        (await crowdsale.dailyCheckStopTimestamp()).should.bignumber.be.equal(dailyCheckStopTimestamp + 86400 - 10);
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
        await crowdsale.dailyCheck(0, 133333333333333333, 50000, 0, { from: TARGET_USER });

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

    it('#11 check refund overage', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - now);

        const coldWalletSourceBalance = await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET);
        await crowdsale.addAddressesToWhitelist([BUYER_1, BUYER_2], { from: TARGET_USER });

        let wei = web3.toWei(new BigNumber(100000), 'ether');
        await crowdsale.sendTransaction({ from: BUYER_1, value: wei });

        await increaseTime(86400);
        await crowdsale.dailyCheck(0, new BigNumber(100000000).div(7).floor(), 20000, 86400, { from: TARGET_USER });
        wei = web3.toWei(new BigNumber(50000), 'ether');
        await crowdsale.sendTransaction({ from: BUYER_2, value: wei });

        await increaseTime(86400);
        await crowdsale.dailyCheck(0, new BigNumber(100000000).div(7).floor(), 20000, 86400, { from: TARGET_USER });

        const coldWalletBalanceDifference = (await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET)).sub(coldWalletSourceBalance);
        const ownerReward = new BigNumber(30).mul(web3.toWei(150000, 'ether')).div(35).floor();
        coldWalletBalanceDifference.should.bignumber.be.equal(ownerReward);

        // withdraw
        const csBalanceBeforeWithdraw = await web3async(web3.eth, web3.eth.getBalance, crowdsale.address);

        await crowdsale.withdraw({ from: BUYER_1 });
        const csBalanceAfterFirstWithdraw = await web3async(web3.eth, web3.eth.getBalance, crowdsale.address);

        await crowdsale.withdraw({ from: BUYER_2 });
        const csBalanceAfterSecondWithdraw = await web3async(web3.eth, web3.eth.getBalance, crowdsale.address);

        // check ETH balances after withdraw
        csBalanceBeforeWithdraw.sub(csBalanceAfterFirstWithdraw).should.be.bignumber.equal(
            new BigNumber(5000000).mul(25000000).div(new BigNumber(35000000).mul(250)).mul(1000000000000000000).floor());

        csBalanceAfterFirstWithdraw.sub(csBalanceAfterSecondWithdraw).should.be.bignumber.equal(
            new BigNumber(5000000).mul(10000000).div(new BigNumber(35000000).mul(200)).mul(1000000000000000000).floor());

        // check token balances after withdraw
        (await token.balanceOf(BUYER_1)).should.bignumber.be.equal(new BigNumber(100000).mul(25000).floor().mul(30).div(35).mul(new BigNumber(100000000).div(7.5).floor()).floor());
        (await token.balanceOf(BUYER_2)).should.bignumber.be.equal(new BigNumber(50000).mul(20000).floor().mul(30).div(35).mul(new BigNumber(100000000).div(7).floor()).floor());
    });

    it('#12 check refund not whitelisted', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - now);

        const coldWalletSourceBalance = await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET);
        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });

        let wei1 = web3.toWei(new BigNumber(100000), 'ether');
        await crowdsale.sendTransaction({ from: BUYER_1, value: wei1 });

        await increaseTime(86400);
        await crowdsale.dailyCheck(0, 1333333333, 20000, 86400, { from: TARGET_USER });
        const wei2 = web3.toWei(new BigNumber(50000), 'ether');
        await crowdsale.sendTransaction({ from: BUYER_2, value: wei2 });

        await timeTo(END_TIME + 1);
        await crowdsale.dailyCheck(0, 1333333333, 20000, 86400, { from: TARGET_USER });

        const coldWalletBalanceDifference = (await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET)).sub(coldWalletSourceBalance);
        coldWalletBalanceDifference.should.bignumber.be.equal(web3.toWei(100000, 'ether'));

        // withdraw
        const csBalanceBeforeWithdraw = await web3async(web3.eth, web3.eth.getBalance, crowdsale.address);

        await crowdsale.withdraw({ from: BUYER_1 });
        const csBalanceAfterFirstWithdraw = await web3async(web3.eth, web3.eth.getBalance, crowdsale.address);

        await crowdsale.withdraw({ from: BUYER_2 }).should.eventually.be.rejected;

        // check ETH balances after withdraw
        csBalanceBeforeWithdraw.sub(csBalanceAfterFirstWithdraw).should.be.bignumber.equal(0);

        // refundWL
        await crowdsale.refundWL({ from: BUYER_2 });
        const csBalanceAfterRefund = await web3async(web3.eth, web3.eth.getBalance, crowdsale.address);

        csBalanceAfterFirstWithdraw.sub(csBalanceAfterRefund).should.be.bignumber.equal(wei2);

        // check token balances after withdraw
        (await token.balanceOf(BUYER_1)).should.bignumber.be.equal(new BigNumber(100000).mul(25000).floor().mul(new BigNumber(100000000).div(7.5).floor()));
        (await token.balanceOf(BUYER_2)).should.bignumber.be.equal(0);
    });

    it('#13 check cannot sendTransaction after FRQUENCY time', async () => {
        const crowdsale = await createCrowdsale();
        await timeTo(START_TIME + 86401);

        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });

        let wei = web3.toWei(new BigNumber(100000), 'ether');
        await crowdsale.sendTransaction({ from: BUYER_1, value: wei }).should.eventually.be.rejected;

        await crowdsale.dailyCheck(0, 1333333333, 20000, 86400, { from: TARGET_USER });

        await crowdsale.sendTransaction({ from: BUYER_1, value: wei });
    });

    it('#14 check withdraw when EOS crowdsale collected funds too', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - now);

        const coldWalletSourceBalance = await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET);
        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });

        let wei = web3.toWei(new BigNumber(100000), 'ether');
        await crowdsale.sendTransaction({ from: BUYER_1, value: wei });

        await increaseTime(86400);
        await crowdsale.dailyCheck(1000000000, 1333333333, 20000, 86400, { from: TARGET_USER });

        const coldWalletBalanceDifference = (await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET)).sub(coldWalletSourceBalance);
        const ownerReward = new BigNumber(30).mul(web3.toWei(100000, 'ether')).div(35).floor();
        coldWalletBalanceDifference.should.bignumber.be.equal(ownerReward);

        // withdraw
        const csBalanceBeforeWithdraw = await web3async(web3.eth, web3.eth.getBalance, crowdsale.address);

        await crowdsale.withdraw({ from: BUYER_1 });
        const csBalanceAfterFirstWithdraw = await web3async(web3.eth, web3.eth.getBalance, crowdsale.address);

        // check ETH balances after withdraw
        csBalanceBeforeWithdraw.sub(csBalanceAfterFirstWithdraw).should.be.bignumber.equal(
            new BigNumber(5000000).mul(25000000).div(new BigNumber(35000000).mul(250)).mul(1000000000000000000).floor());

        // check token balances after withdraw
        (await token.balanceOf(BUYER_1)).should.bignumber.be.equal(new BigNumber(100000).mul(25000).floor().mul(30).div(35).mul(new BigNumber(100000000).div(7.5).floor()).floor());
    });

    it('#15 check set end time', async () => {
        const crowdsale = await createCrowdsale();

        const NEW_END_TIME = Math.floor(START_TIME + (END_TIME - START_TIME) / 2);

        await crowdsale.setEndTime(NEW_END_TIME, { from: TARGET_USER });
        const newEndTime = await crowdsale.closingTime();
        Number(newEndTime).should.be.equals(NEW_END_TIME, 'end time was not changed');

        // set end time by other
        await crowdsale.setEndTime(NEW_END_TIME - 1).should.eventually.be.rejected;
        // set end time less then start
        await crowdsale.setEndTime(START_TIME - 1, { from: TARGET_USER }).should.eventually.be.rejected;

        // move till ended
        await increaseTime(NEW_END_TIME - now + 1);
        const hasEnded = await crowdsale.hasClosed();
        hasEnded.should.be.equals(true, 'hasEnded must be true, time shifted to new end time');
    });

    it('#16 check set end time at wrong time', async () => {
        const crowdsale = await createCrowdsale();

        const NEW_END_TIME = Math.floor(START_TIME + (END_TIME - START_TIME) / 2);

        // move till started
        await increaseTime(START_TIME - now + 1);

        await crowdsale.setEndTime(NEW_END_TIME, { from: TARGET_USER });
        const newEndTime = await crowdsale.closingTime();
        Number(newEndTime).should.be.equals(NEW_END_TIME, 'end time was not changed');

        // move till ended
        await increaseTime(NEW_END_TIME - START_TIME + 1);

        // impossible to change end time, because already ended
        await crowdsale.setEndTime(NEW_END_TIME + 2).should.eventually.be.rejected;
    });

    it('#17 check set wrong end time', async () => {
        const crowdsale = await createCrowdsale();

        const MIDDLE_TIME = START_TIME + (END_TIME - START_TIME) / 2;

        // move till new end time will be in the past
        await timeTo(MIDDLE_TIME);

        // end time in the past
        await crowdsale.setEndTime(MIDDLE_TIME).should.eventually.be.rejected;
    });

    it('#18 check set start time', async () => {
        const crowdsale = await createCrowdsale();
        const NEW_START_TIME = Math.floor(START_TIME + (END_TIME - START_TIME) / 2);

        await crowdsale.setStartTime(NEW_START_TIME, { from: TARGET_USER });
        const newStartTime = await crowdsale.openingTime();
        Number(newStartTime).should.be.equals(NEW_START_TIME, 'start time was not changed');

        // set start time by other
        await crowdsale.setStartTime(NEW_START_TIME + 1).should.eventually.be.rejected;
        // set start time grate then end
        await crowdsale.setStartTime(END_TIME + 1, { from: TARGET_USER }).should.eventually.be.rejected;

        // move when already started
        await increaseTime(NEW_START_TIME - now + 1);
        const hasStarted = await crowdsale.hasStarted();
        hasStarted.should.be.equals(true, 'hasStarted must be true, time shifted to new start time');
    });

    it('#19 check set start time at wrong time', async () => {
        const crowdsale = await createCrowdsale();

        // move till started
        await timeTo(START_TIME + 1);

        const NEW_START_TIME = Math.floor(START_TIME + (END_TIME - START_TIME) / 2);

        await crowdsale.setStartTime(NEW_START_TIME, { from: TARGET_USER }).should.eventually.be.rejected;

        // move till ended
        await timeTo(END_TIME + 1);

        // impossible to change start time, because already ended
        await crowdsale.setStartTime(END_TIME + 10, { from: TARGET_USER }).should.eventually.be.rejected;
    });

    it('#20 check set wrong start time', async () => {
        const crowdsale = await createCrowdsale();
        // after the end
        const NEW_START_TIME = END_TIME + 1;

        await crowdsale.setStartTime(NEW_START_TIME, { from: TARGET_USER }).should.eventually.be.rejected;
    });

    it('#21 check set start time/end time', async () => {
        const crowdsale = await createCrowdsale();
        // after the end
        const MIDDLE_TIME = Math.floor(START_TIME + (END_TIME - START_TIME) / 2);

        await crowdsale.setTimes(MIDDLE_TIME + 1, MIDDLE_TIME - 1, { from: TARGET_USER }).should.eventually.be.rejected;

        await crowdsale.setTimes(START_TIME - 1, END_TIME, { from: TARGET_USER }).should.eventually.be.rejected;

        await crowdsale.setTimes(MIDDLE_TIME - 1, MIDDLE_TIME + 1, { from: TARGET_USER });
        const newStartTime = await crowdsale.openingTime();
        Number(newStartTime).should.be.equals(MIDDLE_TIME - 1, 'start time was not changed');

        const newEndTime = await crowdsale.closingTime();
        Number(newEndTime).should.be.equals(MIDDLE_TIME + 1, 'end time was not changed');

        await timeTo(MIDDLE_TIME - 10);
        await crowdsale.setTimes(MIDDLE_TIME, MIDDLE_TIME + 20, { from: TARGET_USER });

        await timeTo(MIDDLE_TIME + 10);
        // already started
        await crowdsale.setTimes(MIDDLE_TIME + 1, END_TIME, { from: TARGET_USER }).should.eventually.be.rejected;
        // end time in the past
        await crowdsale.setTimes(MIDDLE_TIME, MIDDLE_TIME + 5, { from: TARGET_USER }).should.eventually.be.rejected;

        await crowdsale.setTimes(MIDDLE_TIME, MIDDLE_TIME + 30, { from: TARGET_USER });

        const finalEndTime = await crowdsale.closingTime();
        Number(finalEndTime).should.be.equals(MIDDLE_TIME + 30, 'end time was not changed');

        await timeTo(MIDDLE_TIME + 31);
        // already ended
        await crowdsale.setTimes(MIDDLE_TIME, END_TIME, { from: TARGET_USER }).should.eventually.be.rejected;
    });
});


