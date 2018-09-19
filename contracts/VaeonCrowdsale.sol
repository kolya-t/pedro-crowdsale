pragma solidity ^0.4.23;

import "./WhitelistedCrowdsale.sol";


contract VaeonCrowdsale is WhitelistedCrowdsale {
    constructor(
        VaeonToken _token,
        uint _ethTokenRate,
        uint _ethUsdCentRate,
        uint _stopAfterSeconds,
        uint _startTime,
        uint _endTime,
        address _targetUser,
        address _coldWallet
    )
        public
        Crowdsale(_ethTokenRate * TOKEN_DECIMAL_MULTIPLIER, _coldWallet, _token)
        TimedCrowdsale(_startTime > now ? _startTime : now, _endTime)
    {
        lastDailyCheckTimestamp = _startTime;
        ethUsdCentRate = _ethUsdCentRate;
        stopAfterSeconds = _stopAfterSeconds;
        targetUser = _targetUser;
    }

    function init() public onlyOwner {
        require(!initialized);
        initialized = true;
        VaeonToken(token).pause();
        transferOwnership(targetUser);
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
        require(now < lastDailyCheckTimestamp + stopAfterSeconds);
        super._preValidatePurchase(_beneficiary, _weiAmount);
    }

    function finalize() public {
        revert();
    }

    function dailyCheck(
        uint _usdCentsRaisedByEos,
        uint _rate,
        uint _ethUsdCentRate,
        uint _stopAfterSeconds
    )
        public
        onlyOwner
    {
        require(lastDailyCheckTimestamp + stopAfterSeconds <= now);
        require(_usdCentsRaisedByEos >= usdCentsRaisedByEos);
        lastDailyCheckTimestamp = now;
        rate = _rate * TOKEN_DECIMAL_MULTIPLIER;
        usdCentsRaisedByEos = _usdCentsRaisedByEos;
        ethUsdCentRate = _ethUsdCentRate;
        stopAfterSeconds = _stopAfterSeconds;

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
            uint tokens = weiRaised.mul(rate).div(1 ether);
            MintableToken(token).mint(address(this), tokens);

            emit TokenPurchase(
                msg.sender,
                _beneficiary,
                weiAmount,
                rate,
                ethUsdCentRate
            );
        }

        _updatePurchasingState(_beneficiary, weiAmount);
        _postValidatePurchase(_beneficiary, weiAmount);
    }

    function _updatePurchasingState(address _beneficiary, uint256 _weiAmount) internal {
        purchases[_beneficiary].push(Purchase(_weiAmount, rate, ethUsdCentRate, !isWhitelisted(_beneficiary)));
    }
}
