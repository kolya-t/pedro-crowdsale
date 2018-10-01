const ganache = require('ganache-core');
const BigNumber = require('bignumber.js');

BigNumber.config({ EXPONENTIAL_AT: 100 });

const HDWalletProvider = require("truffle-hdwallet-provider");
const mnemonic = "...";

module.exports = {
    networks: {
        ganache: {
            network_id: '*', // eslint-disable-line camelcase
            provider: ganache.provider({
                total_accounts: 6, // eslint-disable-line camelcase
                default_balance_ether: BigNumber(1e+99), // eslint-disable-line camelcase
                mnemonic: 'crowdsale',
                time: new Date('2017-10-10T15:00:00Z'),
                debug: false,
                // ,logger: console
            })
        },
        localhost: {
            host: 'localhost',
            port: 7545,
            network_id: '*', // eslint-disable-line camelcase
        },
        ropsten: {
            provider: function() {
                return new HDWalletProvider(mnemonic, "https://ropsten.infura.io/v3/...")
            },
            network_id: 3
        }
    },
    solc: {
        optimizer: {
            enabled: true,
            runs: 200,
        },
    },
    network: 'ropsten',
    mocha: {
        bail: true,
        fullTrace: true,
    },
};
