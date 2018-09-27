pragma solidity ^0.4.23;

import "./WhitelistedCrowdsale.sol";


contract VaeonCrowdsale is WhitelistedCrowdsale {
    event TimesChanged(uint startTime, uint endTime, uint oldStartTime, uint oldEndTime);

    constructor(
        VaeonToken _token,
        uint _tknCentRate, // 1 tkn = (_tknCentRate / 10 ^ decimals) cents
        uint _ethUsdCentRate,
        uint _stopAfterSeconds,
        uint _startTime,
        uint _endTime,
        address _targetUser,
        address _coldWallet
    )
        public
        Crowdsale(_tknCentRate, _coldWallet, _token)
        TimedCrowdsale(_startTime > now ? _startTime : now, _endTime)
    {
        ethUsdCentRate = _ethUsdCentRate;
        dailyCheckStopTimestamp = _startTime + _stopAfterSeconds;
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
        require(now < dailyCheckStopTimestamp);
        super._preValidatePurchase(_beneficiary, _weiAmount);
    }

    function finalize() public {
        revert();
    }

    function dailyCheck(
        uint _usdCentsRaisedByEos,
        uint _tknCentRate, // 1 tkn = (_tknCentRate / 10 ^ decimals) cents
        uint _ethUsdCentRate,
        uint _stopAfterSeconds
    )
        public
        onlyOwner
    {
        require(dailyCheckStopTimestamp <= now);
        require(_usdCentsRaisedByEos >= usdCentsRaisedByEos);
        dailyCheckStopTimestamp = now + _stopAfterSeconds;

        usdCentsRaisedByEos = _usdCentsRaisedByEos;
        rate = _tknCentRate;
        ethUsdCentRate = _ethUsdCentRate;

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
            uint centsAmount = weiAmount.mul(ethUsdCentRate).div(1 ether);
            uint tokens = centsAmount.mul(TOKEN_DECIMAL_MULTIPLIER).div(rate);
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

    function setStartTime(uint _startTime) public onlyOwner {
        // only if CS was not started
        require(now < openingTime);
        // only move time to future
        require(_startTime > openingTime);
        require(_startTime < closingTime);
        if (!hasStarted()) {
            if (openingTime < _startTime) {
                dailyCheckStopTimestamp = dailyCheckStopTimestamp + (_startTime - openingTime);
            } else {
                dailyCheckStopTimestamp = dailyCheckStopTimestamp - (openingTime - _startTime);
            }
        }
        emit TimesChanged(_startTime, closingTime, openingTime, closingTime);
        openingTime = _startTime;
    }

    function setEndTime(uint _endTime) public onlyOwner {
        // only if CS was not ended
        require(now < closingTime);
        // only if new end time in future
        require(now < _endTime);
        require(_endTime > openingTime);
        emit TimesChanged(openingTime, _endTime, openingTime, closingTime);
        closingTime = _endTime;
    }

    function setTimes(uint _startTime, uint _endTime) public onlyOwner {
        require(_endTime > _startTime);
        uint oldStartTime = openingTime;
        uint oldEndTime = closingTime;
        bool changed = false;
        if (_startTime != oldStartTime) {
            require(_startTime > now);
            // only if CS was not started
            require(now < oldStartTime);
            // only move time to future
            require(_startTime > oldStartTime);

            openingTime = _startTime;
            changed = true;
        }
        if (_endTime != oldEndTime) {
            // only if CS was not ended
            require(now < oldEndTime);
            // end time in future
            require(now < _endTime);

            closingTime = _endTime;
            changed = true;
        }

        if (changed) {
            emit TimesChanged(openingTime, _endTime, openingTime, closingTime);
        }
    }
}
