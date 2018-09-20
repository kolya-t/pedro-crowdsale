pragma solidity ^0.4.23;


contract Consts {
    uint public constant MIN_INVESTMENT = 100000000000000000; // 0.1 ETH
    uint public constant USDCENTS_HARD_CAP = 3000000000; // 30'000'000.00 USD
    uint public constant TOKEN_DECIMALS = 10;
    uint8 public constant TOKEN_DECIMALS_UINT8 = 10;
    uint public constant TOKEN_DECIMAL_MULTIPLIER = 10 ** TOKEN_DECIMALS;

    string public constant TOKEN_NAME = "Vaeon Token";
    string public constant TOKEN_SYMBOL = "VAEO";
}
