pragma solidity ^0.4.23;

import "./MainCrowdsale.sol";
import "./WhitelistedCrowdsale.sol";


contract TemplateCrowdsale is Consts, MainCrowdsale, WhitelistedCrowdsale {
    event Initialized();
    event TimesChanged(uint startTime, uint endTime, uint oldStartTime, uint oldEndTime);
    bool public initialized = false;

    uint public lastEosUsdUpdate;

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
        require(now < lastEosUsdUpdate + UPDATE_FREQUENCY);
        super._preValidatePurchase(_beneficiary, _weiAmount);
    }

    function setRate(uint _rate) public onlyOwner {
        rate = _rate;
    }

    function getUsdRaised(uint _centsInOneEth) public returns (uint) {
        return weiRaised * _centsInOneEth / (100 * 1 ether);
    }

    function setUsdRaisedByEos() public onlyOwner {
        require(lastEosUsdUpdate + UPDATE_FREQUENCY >= now);
        lastEosUsdUpdate = now;
    }
}
