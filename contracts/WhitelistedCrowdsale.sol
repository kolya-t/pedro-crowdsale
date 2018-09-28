pragma solidity ^0.4.23;

import "./MainCrowdsale.sol";


contract WhitelistedCrowdsale is MainCrowdsale {
    mapping (address => bool) private whitelist;

    event WhitelistedAddressAdded(address indexed _address);

    function _addAddressToWhitelist(address _address) internal {
        whitelist[_address] = true;
        emit WhitelistedAddressAdded(_address);

        Purchase[] storage array = purchases[_address];
        for (uint i = 0; i < array.length; i++) {
            Purchase storage purchase = array[i];
            if (purchase.isPending) {
                weiRaised = weiRaised.add(purchase.contributedWei);
                uint centsAmount = purchase.contributedWei.mul(purchase.ethUsdCentRate).div(1 ether);
                usdCentsRaisedByEth = usdCentsRaisedByEth.add(centsAmount);
                uint tokens = centsAmount.mul(TOKEN_DECIMAL_MULTIPLIER).div(purchase.rate);
                MintableToken(token).mint(address(this), tokens);
                purchase.isPending = false;
            }
        }
    }

    function addAddressToWhitelistOnceContribution(address _address, uint _index) external {
        require(!isFinalized);

        Purchase[] storage array = purchases[_address];
        Purchase storage purchase = array[_index];
        require(purchase.isPending);

        weiRaised = weiRaised.add(purchase.contributedWei);
        uint centsAmount = purchase.contributedWei.mul(purchase.ethUsdCentRate).div(1 ether);
        usdCentsRaisedByEth = usdCentsRaisedByEth.add(centsAmount);
        uint tokens = centsAmount.mul(TOKEN_DECIMAL_MULTIPLIER).div(purchase.rate);
        MintableToken(token).mint(address(this), tokens);
        purchase.isPending = false;

        emit TokenPurchase(
            _address,
            _address,
            purchase.contributedWei,
            purchase.rate,
            purchase.ethUsdCentRate
        );

        whitelist[_address] = true;
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

    function refundWLOnce() public {
        require(isFinalized);
        Purchase[] storage array = purchases[msg.sender];
        require(array.length > 0);

        uint lastIndex = array.length - 1;
        Purchase storage purchase = array[lastIndex];
        require(purchase.isPending);
        msg.sender.transfer(purchase.contributedWei);
        delete purchases[msg.sender][lastIndex];
        purchases[msg.sender].length--;

        if (purchases[msg.sender].length == 0) {
            delete purchases[msg.sender];
        }
    }

    function refundWL() public {
        require(!isWhitelisted(msg.sender));
        Purchase[] storage array = purchases[msg.sender];
        require(array.length > 0);

        uint returnWei;
        for (uint i = 0; i < array.length; i++) {
            Purchase storage purchase = array[i];
            returnWei = returnWei.add(purchase.contributedWei);
        }

        if (returnWei > 0) {
            msg.sender.transfer(returnWei);
        }

        delete purchases[msg.sender];
    }
}
