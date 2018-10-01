const Token = artifacts.require('./VaeonToken.sol');
const Crowdsale = artifacts.require('./VaeonCrowdsale.sol');

module.exports = function (deployer, network, accounts) {
    deployer.deploy(Token)
        .then(function (token) {
            return deployer.deploy(
                Crowdsale,
                token.address, // _token
                500000000,    // _centToTknCentRate
                350000001,  // _ethUsdCentRate
                1200,  // _stopAfterSeconds
                1538503200, // _startTime
                1541181600, // _endTime
                '0x20bED3C89831E304FF04464CAA5b47eB8FAb5c6E',    // _targetUser
                '0x2ec10bAbc27Fd435C62861d95704089eEd81e9E6' // _coldWallet
            ).then((cs) => {
                return token.transferOwnership(cs.address).then(() => {
                    return cs.init();
                })
            });
        });
};


