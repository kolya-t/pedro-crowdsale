pragma solidity ^0.4.23;

import "./MainCrowdsale.sol";
import "./WhitelistedCrowdsale.sol";


contract TemplateCrowdsale is Consts, WhitelistedCrowdsale {
    event Initialized();
    bool public initialized = false;

    constructor(
        MintableToken _token,
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
        MainToken(token).pause();
        transferOwnership(TARGET_USER);
        emit Initialized();
    }

    /**
     * @dev override hasClosed to add minimal value logic
     * @return true if remained to achieve less than minimal
     */
    function hasClosed() public view returns (bool) {
        return super.hasClosed();
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

    function setUsdRaisedByEos(uint _usdCentsRaisedByEos, uint _ethUsdCentRate, uint _stopAfterSeconds) public onlyOwner {
        require(lastEosUsdUpdate + stopAfter >= now);
        require(_usdCentsRaisedByEos >= usdCentsRaisedByEos);
        lastEosUsdUpdate = now;
        usdCentsRaisedByEos = _usdCentsRaisedByEos;
        ethUsdCentRate = _ethUsdCentRate;
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

            usdCentsRaisedByEth = usdCentsRaisedByEth.add(weiAmount.mul(ethUsdCentRate).div(1 ether));
        }

        _updatePurchasingState(_beneficiary, weiAmount);

        _forwardFunds();
        _postValidatePurchase(_beneficiary, weiAmount);
    }

    function _updatePurchasingState(address _beneficiary, uint256 _weiAmount) internal {
        purchases[_beneficiary].push(Purchase(_weiAmount, rate, !isWhitelisted(_beneficiary)));
    }
}
