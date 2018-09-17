pragma solidity ^0.4.23;

import "./MainCrowdsale.sol";
import "./WhitelistedCrowdsale.sol";


contract VaeonCrowdsale is Consts, WhitelistedCrowdsale {
    constructor(
        VaeonToken _token,
        uint _ethTokenRate,
        uint _ethUsdCentRate,
        uint _stopAfterSeconds
    )
        public
        Crowdsale(_ethTokenRate, COLD_WALLET, _token)
        TimedCrowdsale(START_TIME > now ? START_TIME : now, END_TIME)
    {
        lastEosUsdUpdate = START_TIME;
        ethUsdCentRate = _ethUsdCentRate;
        stopAfter = _stopAfterSeconds;
    }

    function init() public onlyOwner {
        require(!initialized);
        initialized = true;
        VaeonToken(token).pause();
        transferOwnership(TARGET_USER);
        emit Initialized();
    }

    /**
     * @dev override purchase validation to add extra value logic.
     * @return true if sended more than minimal value
     */
    function _preValidatePurchase(
        address _beneficiary,
        uint256 _weiAmount
    )
        internal
    {
        require(msg.value >= MIN_INVESTMENT);
        require(now < lastEosUsdUpdate + stopAfter);
        super._preValidatePurchase(_beneficiary, _weiAmount);
    }

    function setRate(uint _rate) public onlyOwner {
        rate = _rate;
    }

    function finalize() public {
        revert();
    }

    function dailyCheck(uint _usdCentsRaisedByEos, uint _ethUsdCentRate, uint _stopAfterSeconds) public onlyOwner {
        require(lastEosUsdUpdate + stopAfter >= now);
        require(_usdCentsRaisedByEos >= usdCentsRaisedByEos);
        lastEosUsdUpdate = now;
        usdCentsRaisedByEos = _usdCentsRaisedByEos;
        ethUsdCentRate = _ethUsdCentRate;
        stopAfter = _stopAfterSeconds;

        if (hasClosed()) {
            require(!isFinalized);

            finalization();
            emit Finalized();

            isFinalized = true;
        }
    }

    function buyTokens(address _beneficiary) public payable {
        uint256 weiAmount = msg.value;
        _preValidatePurchase(_beneficiary, weiAmount);

        if (isWhitelisted(_beneficiary)) {
            weiRaised = weiRaised.add(weiAmount);
            usdCentsRaisedByEth = usdCentsRaisedByEth.add(weiAmount.mul(ethUsdCentRate).div(1 ether));
        }

        emit TokenPurchase(
            msg.sender,
            _beneficiary,
            weiAmount,
            rate,
            ethUsdCentRate
        );

        _updatePurchasingState(_beneficiary, weiAmount);
        _postValidatePurchase(_beneficiary, weiAmount);
    }

    function _updatePurchasingState(address _beneficiary, uint256 _weiAmount) internal {
        purchases[_beneficiary].push(Purchase(_weiAmount, rate, ethUsdCentRate, !isWhitelisted(_beneficiary)));
    }
}
