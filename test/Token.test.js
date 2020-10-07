import { tokens, EVM_REVERT } from './helpers';

const Token = artifacts.require('./Token');

require('chai').use(require('chai-as-promised')).should();

contract('Token', ([deployer, receiver, exchange, approver]) => {

  let token;
  const name = 'DApp Token';
  const symbol = 'DAPP';
  const decimals = '18';
  const totalSupply = tokens(1000000).toString();

  beforeEach(async () => {
    token = await Token.new();
  })

  describe('deployment', () => {
    it('track the name', async () => {
      const result = await token.name();
      result.should.equal(name);
    })

    it('track the symbol', async () => {
      const result = await token.symbol();
      result.should.equal(symbol);
    })

    it('track the decimals', async () => {
      const result = await token.decimals();
      result.toString().should.equal(decimals);
    })

    it('track the total supply', async () => {
      const result = await token.totalSupply();
      result.toString().should.equal(totalSupply.toString());
    })

    it('assigns the total supply to the developer', async () => {
      const result = await token.balanceOf(deployer);
      result.toString().should.equal(totalSupply.toString());
    })
  })

  describe('sending tokens', () => {
    let amount, result;

    describe('success', () => {
      beforeEach(async () => {
        // Transfer
        amount = tokens(100);
        result = await token.transfer(receiver, amount, {from: deployer})
      })

      it('transfers token balances', async () => {
        let balanceOf = await token.balanceOf(deployer);
        balanceOf.toString().should.equal(tokens(999900).toString())
        balanceOf = await token.balanceOf(receiver);
        balanceOf.toString().should.equal(amount.toString())
      })

      it('emits a transfer event', async () => {
        const log = result.logs[0];
        log.event.should.equal('Transfer');
        const event = log.args;
        event.from.toString().should.equal(deployer, 'from is correct');
        event.to.toString().should.equal(receiver, 'to is correct');
        event.value.toString().should.equal(amount.toString(), 'value is correct');
      })
    });

    describe('failure', () => {
      it('rejects insufficient balances', async () => {
        // Attempt to transfer tokens more than you have.
        let invalidAmount = tokens(100000000); // 100 million - greater than total supply
        await token.transfer(receiver, invalidAmount, { from: deployer }).should.be.rejectedWith(EVM_REVERT);

        // Attempt to transfer tokens when you have none
        invalidAmount = tokens(10); // receiver has no tokens
        await token.transfer(deployer, invalidAmount, { from: receiver }).should.be.rejectedWith(EVM_REVERT);
      })

      it('rejects invalid receiver', async () => {
        const invalidReceiver = '0x0';
        await token.transfer(invalidReceiver, amount, { from: deployer }).should.be.rejected;
      })
    });
  });

  describe('approving tokens', () => {
    let amount, result;

    beforeEach(async () => {
      amount = tokens(100);
      result = await token.approve(exchange, amount, {from: deployer});
    })

    describe('success', () => {
      it('allocates an allowance for delegated token spending on exchange', async () => {
        const allowance = await token.allowance(deployer, exchange);
        allowance.toString().should.equal(amount.toString());
      })

      it('emits an approval event', async () => {
        const log = result.logs[0];
        log.event.should.equal('Approval');
        const event = log.args;
        event.owner.toString().should.equal(deployer, 'owner is correct');
        event.spender.toString().should.equal(exchange, 'spender is correct');
        event.value.toString().should.equal(amount.toString(), 'value is correct');
      })
    });

    describe('failure', () => {
      it('rejects insufficient balances', async () => {
        // Attempt to transfer tokens more than you have.
        let invalidAmount = tokens(100000000); // 100 million - greater than total supply
        await token.approve(exchange, invalidAmount, { from: deployer }).should.be.rejectedWith(EVM_REVERT);

        // Attempt to transfer tokens when you have none
        invalidAmount = tokens(10); // receiver has no tokens
        await token.approve(exchange, invalidAmount, { from: approver }).should.be.rejectedWith(EVM_REVERT);
      })

      it('rejects invalid spenders', async () => {
        await token.approve(0x0, amount, {from: deployer}).should.be.rejected;
      })
    });
    
  });

  describe('delegated token transfers', () => {
    let amount, result;

    beforeEach(async () => {
      amount = tokens(100);
      await token.approve(exchange, amount, {from: deployer})
    })

    describe('success', () => {
      beforeEach(async () => {
        // Transfer
        result = await token.transferFrom(deployer, receiver, amount, {from: exchange})
      })

      it('transfers token balances', async () => {
        let balanceOf = await token.balanceOf(deployer);
        balanceOf.toString().should.equal(tokens(999900).toString())
        balanceOf = await token.balanceOf(receiver);
        balanceOf.toString().should.equal(amount.toString())
      })

      it('reset allowance', async () => {
        const allowance = await token.allowance(deployer, exchange);
        allowance.toString().should.equal('0');
      })

      it('emits a transfer event', async () => {
        const log = result.logs[0];
        log.event.should.equal('Transfer');
        const event = log.args;
        event.from.toString().should.equal(deployer, 'from is correct');
        event.to.toString().should.equal(receiver, 'to is correct');
        event.value.toString().should.equal(amount.toString(), 'value is correct');
      })
    });

    describe('failure', () => {
      it('rejects insufficient balances', async () => {
        // Attempt to transfer tokens more than you have.
        let invalidAmount = tokens(100000000); // 100 million - greater than total supply
        await token.transferFrom(deployer, receiver, invalidAmount, { from: exchange }).should.be.rejectedWith(EVM_REVERT);
      })

      it('rejects invalid receiver', async () => {
        const invalidReceiver = '0x0';
        await token.transferFrom(deployer, invalidReceiver, amount, { from: exchange }).should.be.rejected;
      })
    });
  });

});