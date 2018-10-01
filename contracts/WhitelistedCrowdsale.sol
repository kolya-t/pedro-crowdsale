pragma solidity ^0.4.23;

import "./MainCrowdsale.sol";


contract WhitelistedCrowdsale is MainCrowdsale {
    mapping (address => bool) private whitelist;

    event WhitelistedAddressAdded(address indexed _address);

    function _addAddressToWhitelist(address _address) internal {
        require(!isWhitelisted(_address));
        whitelist[_address] = true;

        Contribution storage pendingContribution = pendingContributions[_address];
        Contribution storage contribution = contributions[_address];

        if (pendingContribution.contributedWei > 0) {
            contribution.contributedWei = contribution.contributedWei.add(pendingContribution.contributedWei);
            contribution.contributedCents = contribution.contributedCents.add(pendingContribution.contributedCents);
            contribution.tokens = contribution.tokens.add(pendingContribution.tokens);

            weiRaised = weiRaised.add(pendingContribution.contributedWei);
            usdCentsRaisedByEth = usdCentsRaisedByEth.add(pendingContribution.contributedCents);
            MintableToken(token).mint(address(this), pendingContribution.tokens);

            delete contributions[_address];
        }

        emit WhitelistedAddressAdded(_address);
    }

    /**
     * @dev add single address to whitelist
     */
    function addAddressToWhitelist(address _address) external onlyOwner {
        require(!isFinalized);
        _addAddressToWhitelist(_address);
    }

    /**
     * @dev add addresses to whitelist
     */
    function addAddressesToWhitelist(address[] _addresses) external onlyOwner {
        require(!isFinalized);
        for (uint i = 0; i < _addresses.length; i++) {
            _addAddressToWhitelist(_addresses[i]);
        }
    }

    /**
     * @dev getter to determine if address is in whitelist
     */
    function isWhitelisted(address _address) public view returns (bool) {
        return whitelist[_address];
    }

    function refundWL() public {
        require(!isWhitelisted(msg.sender));

        Contribution storage contribution = pendingContributions[msg.sender];
        if (contribution.contributedWei > 0) {
            msg.sender.transfer(contribution.contributedWei);
        }

        delete contributions[msg.sender];
    }
}
