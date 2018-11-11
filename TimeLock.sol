pragma solidity ^0.4.23;

/**
  * @author - Shane van Coller
  * @title Demo TimeLock contract for DapperNetwork bootcamp
  * @dev Contract will lock funds sent to it for a defined period of time. Once this
  * time period has elapsed, the sender will be able to withdraw the funds
  */
contract TimeLock {
    address public owner;
    uint public lockPeriod;
    mapping (address => Participant) public participants;

    struct Participant {
        uint lockPeriodStart;
        bool active;
        uint amount;
    }

    event FundsLocked(address participant, uint timeLocked);
    event FundsRelease(address participant, uint amountUnlocked, uint timeReleased);
    event LockPeriodChanged(address changeInitiator, uint oldLockPeriodValue, uint newLockPeriodValue);

    /**
     * @dev Modifier that only allows the contract owner to execute the function
     */
    modifier onlyOwner {
        require(msg.sender == owner, "Only the owner can perform this operation");
        _;
    }

    /**
     * @dev Constructor for the TimeLock contract
     * @param _initialLockPeriod Time in seconds to keep the funds locked. Once the time has elapsed, funds can be withdrawn
     */
    constructor(uint _initialLockPeriod) public {
        owner = msg.sender;
        lockPeriod = _initialLockPeriod;
    }

    /**
     * @dev Fallback function - not used and reverts if called
     */
    function() public {
        revert();
    }

    /**
     * @dev Payable function which locks the given funds for a period of time per user.
     * Once funds are locked, user cannot add addional funds
     */
    function lockFunds() public payable {
        Participant _p = participants[msg.sender];
        require(_p.active == false, "Sender already has funds locked");

        _p.active = true;
        _p.lockPeriodStart = now;
        _p.amount = msg.value;

        emit FundsLocked(msg.sender, now);
    }

    /**
     * @dev Function that releases funds back to the sender once the lock period has expired
     */
    function releaseFunds() public {
        Participant _p = participants[msg.sender];
        require(_p.active, "No locked funds for this address");
        require(now >= _p.lockPeriodStart + lockPeriod, "Lock period has not yet expired");

        uint _amountToUnlock = _p.amount;
        delete participants[msg.sender];

        msg.sender.transfer(_amountToUnlock);

        emit FundsRelease(msg.sender, _amountToUnlock, now);
    }

    /**
     * @dev Function to change the period funds are locked for.
     * Restriction that only contract owner can perform this function
     */
    function updateLockPeriod(uint _newPeriod) public onlyOwner {
        uint _oldPeriod = lockPeriod;
        lockPeriod = _newPeriod;

        emit LockPeriodChanged(msg.sender, _oldPeriod, lockPeriod);
    }
}