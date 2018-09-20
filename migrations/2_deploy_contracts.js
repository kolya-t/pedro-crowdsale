const Token = artifacts.require('./VaeonToken.sol');
const Crowdsale = artifacts.require('./VaeonCrowdsale.sol');

module.exports = function (deployer, network, accounts) {
    deployer.deploy(Token)
        .then(function () {
            return deployer.deploy(
                Crowdsale,
                Token.address,
                75000000000,
                21995,
                86400,
                1507734000,
                1510326000,
                accounts[0],
                accounts[1]
            );
        });
};


