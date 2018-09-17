pragma solidity ^0.4.23;

import "./MainCrowdsale.sol";
import "./WhitelistedCrowdsale.sol";


contract TemplateCrowdsale is Consts, WhitelistedCrowdsale {
    event Initialized();
    event TimesChanged(uint startTime, uint endTime, uint oldStartTime, uint oldEndTime);
    bool public initialized = false;

    constructor(MintableToken _token) public
        Crowdsale(1000 * TOKEN_DECIMAL_MULTIPLIER, 0x9b37d7b266a41ef130c4625850c8484cf928000d, _token)
        TimedCrowdsale(START_TIME > now ? START_TIME : now, 1507820400)
        CappedCrowdsale(100000000000000000000000000000000000)
    {
        lastEosUsdUpdate = START_TIME;
    }

    function init() public onlyOwner {
        require(!initialized);
        initialized = true;

        if (PAUSED) {
            MainToken(token).pause();
        }

        transferOwnership(TARGET_USER);
        emit Initialized();
    }

    /**
     * @dev override hasClosed to add minimal value logic
     * @return true if remained to achieve less than minimal
     */
    function hasClosed() public view returns (bool) {
        bool remainValue = cap.sub(weiRaised) < 1000000000000000000;
        return super.hasClosed() || remainValue;
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

    function setUsdRaisedByEos(uint _usdCentsRaisedByEos, uint _ethUsdRate, uint _stopAfterSeconds) public onlyOwner {
        require(lastEosUsdUpdate + stopAfter >= now);
        require(_usdCentsRaisedByEos >= usdCentsRaisedByEos);
        lastEosUsdUpdate = now;
        usdCentsRaisedByEos = _usdCentsRaisedByEos;
        ethUsdRate = _ethUsdRate;
        stopAfter = _stopAfterSeconds;
    }

    function buyTokens(address _beneficiary) public payable {
        uint256 weiAmount = msg.value;
        _preValidatePurchase(_beneficiary, weiAmount);

        if (isWhitelisted(_beneficiary)) {
            // calculate token amount to be created
            uint256 tokens = _getTokenAmount(weiAmount);

            // update state
            weiRaised = weiRaised.add(weiAmount);

            _processPurchase(_beneficiary, tokens);
            emit TokenPurchase(
                msg.sender,
                _beneficiary,
                weiAmount,
                tokens
            );

            usdCentsRaisedByEth = usdCentsRaisedByEth.add(weiAmount.mul(ethUsdRate).div(uint(100).mul(1 ether)));
        }

        _updatePurchasingState(_beneficiary, weiAmount);

        _forwardFunds();
        _postValidatePurchase(_beneficiary, weiAmount);
    }

    function _updatePurchasingState(address _beneficiary, uint256 _weiAmount) internal {
        purchases[_beneficiary].push(Purchase(_weiAmount, rate, !isWhitelisted(_beneficiary)));
    }
}
