pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/crowdsale/distribution/FinalizableCrowdsale.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "./VaeonToken.sol";
import "./Consts.sol";


contract MainCrowdsale is Consts, FinalizableCrowdsale {
    event TokenPurchase(
        address indexed purchaser,
        address indexed beneficiary,
        uint256 value,
        uint256 rate,
        uint256 ethUsdCentRate
    );
    event Initialized();

    struct Contribution {
        uint contributedWei;
        uint contributedCents;
        uint tokens;
    }
    mapping (address => Contribution) public contributions;
    mapping (address => Contribution) public pendingContributions;

    bool public initialized;
    address public targetUser;

    uint public dailyCheckStopTimestamp;

    uint public ethUsdCentRate;
    uint public usdCentsRaisedByEth;
    uint public usdCentsRaisedByEos;
    uint public overageCents;
    uint private centsRaised;
    uint private centsForOwner;

    function hasStarted() public view returns (bool) {
        return now >= openingTime;
    }

    /**
     * @dev override hasClosed to add minimal value logic
     * @return true if remained to achieve less than minimal
     */
    function hasClosed() public view returns (bool) {
        return super.hasClosed() || usdCentsRaisedByEth.add(usdCentsRaisedByEos) >= USDCENTS_HARD_CAP;
    }

    function withdraw() public {
        require(isFinalized);

        Contribution storage contribution = contributions[msg.sender];
        require(contribution.contributedWei > 0 && contribution.tokens > 0);

        uint returnOverageWei = contribution.contributedWei.mul(overageCents).div(centsRaised);
        if (returnOverageWei > 0) {
            msg.sender.transfer(returnOverageWei);
        }

        if (centsRaised > 0) {
            uint returnTokens = contribution.tokens.mul(centsForOwner).div(centsRaised);
            if (returnTokens > 0) {
                _deliverTokens(msg.sender, returnTokens);
            }
        }

        delete contributions[msg.sender];
    }

    function finalization() internal {
        super.finalization();
        VaeonToken(token).unpause();
        require(MintableToken(token).finishMinting());
        Ownable(token).transferOwnership(targetUser);

        centsRaised = usdCentsRaisedByEth.add(usdCentsRaisedByEos);
        if (centsRaised > USDCENTS_HARD_CAP) {
            overageCents = centsRaised.sub(USDCENTS_HARD_CAP);
        }

        if (centsRaised > 0) {
            centsForOwner = centsRaised < USDCENTS_HARD_CAP ? centsRaised : USDCENTS_HARD_CAP;
            wallet.transfer(centsForOwner.mul(weiRaised).div(centsRaised));
        }
    }

    function _centsToTokens(uint cents, uint currentRate) internal view returns (uint) {
        return cents.mul(currentRate);
    }
}
