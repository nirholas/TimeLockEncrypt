import expectThrow from './helpers/expectThrow';

const timeLockArtifact = artifacts.require('./TimeLock');
let timeLock;

const ParticipantStruct = {
    lockPeriodStart: 0,
    active: 1,
    amount: 2
};

contract('TimeLock Contract', (accounts) => {
    const [_deployer, _account1, _account2] = accounts;

    beforeEach(async () => {
        timeLock = await timeLockArtifact.new(3, {from: _deployer});
    });

    describe('Function: lockFunds', () => {
        it('should add funds to be locked', async () => {
            await timeLock.lockFunds({from: _account1, value: web3.toWei("1")});
            let participant = await timeLock.participants(_account1);
            assert.equal(participant[ParticipantStruct.active], true, "Participant should be active");
            assert.equal(participant[ParticipantStruct.amount], web3.toWei("1"), "Participant amount should be 1 eth");
        });

        it('should not allow multiple locks per account', async () => {
            await timeLock.lockFunds({from: _account1, value: web3.toWei("1")});
            let participant = await timeLock.participants(_account1);
            assert.equal(participant[ParticipantStruct.active], true, "Participant should be active");
            assert.equal(participant[ParticipantStruct.amount], web3.toWei("1"), "Participant amount should be 1 eth");

            await expectThrow(timeLock.lockFunds({from: _account1, value: web3.toWei("0.5")}));
            assert.equal(participant[ParticipantStruct.amount], web3.toWei("1"), "Participant amount should be 1 eth");
            assert.notEqual(participant[ParticipantStruct.amount], web3.toWei("1.5"), "Participant amount should not be 1.5 eth");
        });
    });

    describe('Function: releaseFunds', () => {
        it('should release funds', async () => {
            await timeLock.lockFunds({from: _account1, value: web3.toWei("10")});

            let preAccountBalance = web3.fromWei(web3.eth.getBalance(_account1)).toFixed(0);

            let participant = await timeLock.participants(_account1);
            let amountLocked = web3.fromWei(participant[ParticipantStruct.amount]).toFixed(0);

            await sleep(4000);

            await timeLock.releaseFunds({from: _account1});
            participant = await timeLock.participants(_account1);
            let postAccountBalance = web3.fromWei(web3.eth.getBalance(_account1)).toFixed(0);

            assert.equal(participant[ParticipantStruct.active], false, "Participant should not be active");
            assert.equal(participant[ParticipantStruct.amount], 0, "Participant amount should be 0");
            assert.equal(parseInt(preAccountBalance) + parseInt(amountLocked), postAccountBalance, "Incorrect amount returned to participant");
        });

        it('should not allow release before period elapse', async () => {
            await timeLock.lockFunds({from: _account1, value: web3.toWei("0.5")});
            let participant = await timeLock.participants(_account1);

            await expectThrow(timeLock.releaseFunds({from: _account1}));

            assert.equal(participant[ParticipantStruct.active], true, "Participant should be active");
            assert.equal(participant[ParticipantStruct.amount], web3.toWei("0.5"), "Participant amount should be 0.5");

            await sleep(4000);

            await timeLock.releaseFunds({from: _account1});
            participant = await timeLock.participants(_account1);

            assert.equal(participant[ParticipantStruct.active], false, "Participant should not be active");
            assert.equal(participant[ParticipantStruct.amount], 0, "Participant amount should be 0");
        });

        it('should attempt to release funds with an account that has not locked anything', async () => {
            let participant = await timeLock.participants(_account2);

            await expectThrow(timeLock.releaseFunds({from: _account2}));

            assert.equal(participant[ParticipantStruct.active], false, "Participant should not be active");
            assert.equal(participant[ParticipantStruct.amount], 0, "Participant amount should be 0");
        });
    });

    describe('Function: updateLockPeriod', () => {
        it('should update lockPeriod', async () => {
            await timeLock.updateLockPeriod(120, {from: _deployer});
            assert.equal(await timeLock.lockPeriod(), 120, "Lock period not set correctly - should 120 seconds");
        });

        it('should attempt to set lock period with non owner account', async () => {
            await expectThrow(timeLock.updateLockPeriod(400, {from: _account1}));
            assert.equal(await timeLock.lockPeriod(), 3, "Lock period should not have been changed");
        });
    });

    function sleep(_ms) {
        return new Promise(resolve => setTimeout(resolve, _ms));
    }
});

