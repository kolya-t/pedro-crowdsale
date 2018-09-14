pragma solidity ^0.4.23;


contract Consts {
    uint public constant UPDATE_FREQUENCY = 1 days;
    uint public constant MIN_INVESTMENT = 100000000000000000; // 0.1 ETH
    uint public constant TOKEN_DECIMALS = 10;
    uint8 public constant TOKEN_DECIMALS_UINT8 = 10;
    uint public constant TOKEN_DECIMAL_MULTIPLIER = 10 ** TOKEN_DECIMALS;

    string public constant TOKEN_NAME = "Pedro Token";
    string public constant TOKEN_SYMBOL = "PEDRO";
    bool public constant PAUSED = false;
    address public constant TARGET_USER = 0x8ffff2c69f000c790809f6b8f9abfcbaab46b322;

    uint public constant START_TIME = 1507734000;

    bool public constant CONTINUE_MINTING = false;
}
