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

    struct Purchase {
        uint contributedWei;
        uint rate;
        uint ethUsdCentRate;
        bool isPending;
    }

    mapping (address => Purchase[]) public purchases;

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

    function withdrawOnce() public {
        require(isFinalized);
        Purchase[] storage array = purchases[msg.sender];
        require(array.length > 0);

        uint lastIndex = array.length - 1;
        Purchase storage purchase = array[lastIndex];

        if (overageCents > 0) {
            uint contributedCents = purchase.contributedWei.mul(purchase.ethUsdCentRate).div(1 ether);
            uint returnOverage = overageCents.mul(contributedCents).div(centsRaised.mul(purchase.ethUsdCentRate));
            if (returnOverage > 0) {
                msg.sender.transfer(returnOverage);
            }
        }
        uint returnTokens = _centsToTokens(contributedCents.mul(centsForOwner).div(centsRaised), purchase.rate);
        if (returnTokens > 0) {
            _deliverTokens(msg.sender, returnTokens);
        }

        delete purchases[msg.sender][lastIndex];
        purchases[msg.sender].length--;
        if (array.length == 0) {
            delete purchases[msg.sender];
        }
    }

    function withdraw() public {
        require(isFinalized);

        Purchase[] storage array = purchases[msg.sender];
        uint returnOverage;
        uint returnTokens;
        for (uint i = 0; i < array.length; i++) {
            Purchase storage purchase = array[i];

            uint contributedCents = purchase.contributedWei.mul(purchase.ethUsdCentRate).div(1 ether);
            if (overageCents > 0) {
                returnOverage = returnOverage.add(
                    overageCents.mul(contributedCents).div(centsRaised.mul(purchase.ethUsdCentRate)));
            }

            returnTokens = returnTokens.add(_centsToTokens(contributedCents.mul(centsForOwner).div(centsRaised), purchase.rate));
        }

        if (returnOverage > 0) {
            msg.sender.transfer(returnOverage);
        }

        if (returnTokens > 0) {
            _deliverTokens(msg.sender, returnTokens);
        }

        delete purchases[msg.sender];
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
