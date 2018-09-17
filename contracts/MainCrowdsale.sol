pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/crowdsale/distribution/FinalizableCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "./MainToken.sol";
import "./Consts.sol";


contract MainCrowdsale is Consts, FinalizableCrowdsale, MintedCrowdsale {
    struct Purchase {
        uint contributedWei;
        uint rate;
        bool isPending;
    }

    mapping (address => Purchase[]) public purchases;

    uint public ethUsdCentRate = 20754; // div by 100
    uint public stopAfter = 1 days;

    uint public usdCentsRaisedByEth;
    uint public usdCentsRaisedByEos;

    uint public lastEosUsdUpdate;

    function hasStarted() public view returns (bool) {
        return now >= openingTime;
    }

    function startTime() public view returns (uint256) {
        return openingTime;
    }

    function endTime() public view returns (uint256) {
        return closingTime;
    }

    function hasClosed() public view returns (bool) {
        return super.hasClosed();
    }

    function hasEnded() public view returns (bool) {
        return hasClosed();
    }

    function finalization() internal {
        super.finalization();
        MainToken(token).unpause();
        require(MintableToken(token).finishMinting());
        Ownable(token).transferOwnership(TARGET_USER);
    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param _weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 _weiAmount)
        internal view returns (uint256)
    {
        return _weiAmount.mul(rate).div(1 ether);
    }
}
