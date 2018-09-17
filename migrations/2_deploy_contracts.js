const Token = artifacts.require('./MainToken.sol');
const Crowdsale = artifacts.require('./VaeonCrowdsale.sol');

module.exports = function (deployer, network, accounts) {
    deployer.deploy(Token)
        .then(function () {
            return deployer.deploy(
                Crowdsale,
                Token.address,
                1000,
                21995,
                86400
            );
        });

};


