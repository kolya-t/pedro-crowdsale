pragma solidity ^0.4.23;

import "./MainCrowdsale.sol";


contract WhitelistedCrowdsale is MainCrowdsale {
    mapping (address => bool) private whitelist;

    event WhitelistedAddressAdded(address indexed _address);

    function _addAddressToWhitelist(address _address) internal {
        whitelist[_address] = true;
        emit WhitelistedAddressAdded(_address);

        PurchaseWrapper storage wrapper = pendPurchases[_address];
        if (wrapper.isPending) {
            for (uint i = 0; i < wrapper.purchases.length; i++) {
                Purchase storage purchase = wrapper.purchases[i];
                weiRaised = weiRaised.add(purchase.contributedWei);
                usdCentsRaisedByEth = usdCentsRaisedByEth.add(purchase.contributedWei.mul(ethUsdCentRate).div(1 ether));
            }
            wrapper.isPending = false;
        }
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

    function refundWLOnce() public {
        require(isFinalized);
        require(!isWhitelisted(msg.sender));
        PurchaseWrapper storage wrapper = pendPurchases[msg.sender];
        require(wrapper.isPending);
        require(wrapper.purchases.length > 0);

        uint lastIndex = wrapper.purchases.length - 1;
        Purchase storage purchase = wrapper.purchases[lastIndex];
        msg.sender.transfer(purchase.contributedWei);
        delete wrapper.purchases[lastIndex];
        wrapper.purchases.length--;

        if (wrapper.purchases.length == 0) {
            delete pendPurchases[msg.sender];
        }
    }

    function refundWL() public {
        require(isFinalized);
        require(!isWhitelisted(msg.sender));
        PurchaseWrapper storage wrapper = pendPurchases[msg.sender];
        require(wrapper.isPending);

        uint returnWei;
        for (uint i = 0; i < wrapper.purchases.length; i++) {
            Purchase storage purchase = wrapper.purchases[i];
            returnWei = returnWei.add(purchase.contributedWei);
        }

        if (returnWei > 0) {
            msg.sender.transfer(returnWei);
        }

        delete pendPurchases[msg.sender];
    }
}
