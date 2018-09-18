pragma solidity ^0.4.23;


contract Consts {
    uint public constant MIN_INVESTMENT = 10000000000000000; // 0.01 ETH
    uint public constant USDCENTS_HARD_CAP = 3000000000; // 1'000'000.00 USD
    uint public constant TOKEN_DECIMALS = 10;
    uint8 public constant TOKEN_DECIMALS_UINT8 = 10;
    uint public constant TOKEN_DECIMAL_MULTIPLIER = 10 ** TOKEN_DECIMALS;

    string public constant TOKEN_NAME = "Vaeon Token";
    string public constant TOKEN_SYMBOL = "VAEO";
    address public constant TARGET_USER = 0x862509647141f70c975cd02f3b4bde8a0669fde1;
    address public constant COLD_WALLET = 0x5e2909baee620b3aac56ab8dfeb1b4f096933705;

    uint public constant START_TIME = 1507734000;
    uint public constant END_TIME = 1507820400;
}
