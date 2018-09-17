pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/crowdsale/distribution/FinalizableCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "./MainToken.sol";
import "./Consts.sol";


contract MainCrowdsale is Consts, FinalizableCrowdsale, MintedCrowdsale {
    struct PurchaseWrapper {
        bool isPending;
        Purchase[] purchases;
    }

    struct Purchase {
        uint contributedWei;
        uint rate;
        uint ethUsdCentRate;
    }

    mapping (address => PurchaseWrapper) public pendPurchases;

    uint public ethUsdCentRate;
    uint public stopAfter;

    uint public usdCentsRaisedByEth;
    uint public usdCentsRaisedByEos;

    uint public lastEosUsdUpdate;

    uint public centsRaised;
    uint public overageCents;

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

        PurchaseWrapper storage wrapper = pendPurchases[msg.sender];
        uint returnOverage;
        uint returnTokens;
        for (uint i = 0; i < wrapper.purchases.length; i++) {
            Purchase storage purchase = wrapper.purchases[i];

            if (overageCents > 0) {
                uint contributedCents = purchase.contributedWei.mul(purchase.ethUsdCentRate).div(1 ether);
                returnOverage = returnOverage.add(
                    purchase.contributedWei.mul(overageCents).mul(contributedCents).div(centsRaised));
            }

            returnTokens = returnTokens.add(purchase.contributedWei.mul(purchase.rate).div(1 ether));
        }

        if (returnOverage > 0) {
            msg.sender.transfer(returnOverage);
        }

        if (returnTokens > 0) {
            _deliverTokens(msg.sender, returnTokens);
        }

        delete pendPurchases[msg.sender];
    }

    function finalization() internal {
        super.finalization();
        MainToken(token).unpause();
        require(MintableToken(token).finishMinting());
        Ownable(token).transferOwnership(TARGET_USER);

        centsRaised = usdCentsRaisedByEth.add(usdCentsRaisedByEos);
        if (centsRaised > USDCENTS_HARD_CAP) {
            overageCents = centsRaised.sub(USDCENTS_HARD_CAP);
        }
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
