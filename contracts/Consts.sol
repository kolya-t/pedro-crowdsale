pragma solidity ^0.4.23;


contract Consts {
    uint public constant MIN_INVESTMENT = 100000000000000000; // 0.1 ETH
    uint public constant USDCENTS_HARD_CAP = 100000000; // 1'000'000.00 USD
    uint public constant TOKEN_DECIMALS = 10;
    uint8 public constant TOKEN_DECIMALS_UINT8 = 10;
    uint public constant TOKEN_DECIMAL_MULTIPLIER = 10 ** TOKEN_DECIMALS;

    string public constant TOKEN_NAME = "Vaeon Token";
    string public constant TOKEN_SYMBOL = "VAEO";
    address public constant TARGET_USER = 0x8ffff2c69f000c790809f6b8f9abfcbaab46b322;
    address public constant COLD_WALLET = 0x9b37d7b266a41ef130c4625850c8484cf928000d;

    uint public constant START_TIME = 1507734000;
    uint public constant END_TIME = 1507820400;
}
