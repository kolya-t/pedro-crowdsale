pragma solidity ^0.4.23;

import "./MainCrowdsale.sol";


contract WhitelistedCrowdsale is MainCrowdsale {
    mapping (address => bool) private whitelist;

    event WhitelistedAddressAdded(address indexed _address);
    event WhitelistedAddressRemoved(address indexed _address);

    /**
     * @dev throws if buyer is not whitelisted.
     * @param _buyer address
     */
    modifier onlyIfWhitelisted(address _buyer) {
        require(whitelist[_buyer]);
        _;
    }

    function _addAddressToWhitelist(address _address) internal {
        whitelist[_address] = true;
        emit WhitelistedAddressAdded(_address);

        Purchase[] storage purchArray = purchases[_address];
        for (uint i = 0; i < purchArray.length; i++) {
            Purchase storage purchase = purchArray[i];
            if (purchase.isPending) {
                _deliverTokens(_address, purchase.contributedWei.mul(purchase.rate).div(1 ether));
                purchase.isPending = false;
            }
        }
    }

    /**
     * @dev add single address to whitelist
     */
    function addAddressToWhitelist(address _address) external onlyOwner {
        _addAddressToWhitelist(_address);
    }

    /**
     * @dev add addresses to whitelist
     */
    function addAddressesToWhitelist(address[] _addresses) external onlyOwner {
        for (uint i = 0; i < _addresses.length; i++) {
            _addAddressToWhitelist(_addresses[i]);
        }
    }

    function _removeAddressFromWhitelist(address _address) internal {
        delete whitelist[_address];
        emit WhitelistedAddressRemoved(_address);
    }

    /**
     * @dev remove single address from whitelist
     */
    function removeAddressFromWhitelist(address _address) external onlyOwner {
        _removeAddressFromWhitelist(_address);
    }

    /**
     * @dev remove addresses from whitelist
     */
    function removeAddressesFromWhitelist(address[] _addresses) external onlyOwner {
        for (uint i = 0; i < _addresses.length; i++) {
            _removeAddressFromWhitelist(_addresses[i]);
        }
    }

    /**
     * @dev getter to determine if address is in whitelist
     */
    function isWhitelisted(address _address) public view returns (bool) {
        return whitelist[_address];
    }

    /**
     * @dev Extend parent behavior requiring beneficiary to be in whitelist.
     * @param _beneficiary Token beneficiary
     * @param _weiAmount Amount of wei contributed
     */
    function _preValidatePurchase(
        address _beneficiary,
        uint256 _weiAmount
    )
        internal
        onlyIfWhitelisted(_beneficiary)
    {
        super._preValidatePurchase(_beneficiary, _weiAmount);
    }
}
