import { ether, tokens, EVM_REVERT, ETHER_ADDRESS } from './helpers';

const Token = artifacts.require('./Token');
const Exchange = artifacts.require('./Exchange');

require('chai').use(require('chai-as-promised')).should();

contract('Exchange', ([deployer, feeAccount, user1, user2]) => {

  let token, exchange;
  const feePercent = 10;

  beforeEach(async () => {
    // Deploy token
    token = await Token.new();

    // Deploy exchange
    exchange = await Exchange.new(feeAccount, feePercent);

    // Transfer some tokens to user1
    token.transfer(user1, tokens(100), { from: deployer });
  })

  describe('deployment', async () => {
    it('tracks the fee account', async () => {
      const result = await exchange.feeAccount();
      result.should.equal(feeAccount);
    })


    it('tracks the fee percent', async () => {
      const result = await exchange.feePercent();
      result.toString().should.equal(feePercent.toString());
    })
  })

  describe('depositing tokens', async () => {
    let result;
    const amount = tokens(10);

    describe('success', async () => {
      beforeEach(async () => {
        await token.approve(exchange.address, amount, { from: user1 } );
        result = await exchange.depositToken(token.address, amount, { from: user1 });
      });
  
      it('tracks the token deposit', async () => {
        // Check exchange token balance
        let balance = await token.balanceOf(exchange.address);
        balance.toString().should.equal(amount.toString());

        // Check tokens on exchange
        balance = await exchange.tokens(token.address, user1);
        balance.toString().should.equal(amount.toString());
      })

      it('emits a Deposit event', async () => {
        const log = result.logs[0];
        log.event.should.equal('Deposit');
        const event = log.args;
        event.token.toString().should.equal(token.address, 'token address is correct');
        event.user.toString().should.equal(user1, 'user address is correct');
        event.amount.toString().should.equal(amount.toString(), 'amount is correct');
        event.balance.toString().should.equal(amount.toString(), 'balance is correct');
      })
    });

    describe('failure', async () => {
      it('rejects Ether deposits', async () => {
        await exchange.depositToken(ETHER_ADDRESS, amount, { from: user1 }).should.be.rejectedWith(EVM_REVERT);
      });

      it('fails if no tokens are approved', async () => {
        // Don't approve any tokens before depositing
        await exchange.depositToken(token.address, amount, { from: user1 }).should.be.rejectedWith(EVM_REVERT);
      });
    });
  });

  describe('depositing ether', async () => {
    let result;
    let amount = ether(1);

    beforeEach(async () => {
      result = await exchange.depositEther({ from: user1, value: amount });
    });

    it('tracks the Ether deposit', async () => {
      const balance = await exchange.tokens(ETHER_ADDRESS, user1);
      balance.toString().should.equal(amount.toString());
    })

    it('emits a Deposit event', async () => {
      const log = result.logs[0];
      log.event.should.equal('Deposit');
      const event = log.args;
      event.token.toString().should.equal(ETHER_ADDRESS, 'Ether address is correct');
      event.user.toString().should.equal(user1, 'user address is correct');
      event.amount.toString().should.equal(amount.toString(), 'amount is correct');
      event.balance.toString().should.equal(amount.toString(), 'balance is correct');
    })
  });

  describe('fallback', async () => {
    it('reverts when Ether is sent', async () => {
      await exchange.sendTransaction({ value: 1, from: user1 }).should.be.rejectedWith(EVM_REVERT);
    });
  });

  describe('withdrawing ether', async () => {
    let result;
    let amount = ether(1);

    beforeEach(async () => {
      // Deposit Ether first
      result = await exchange.depositEther({ from: user1, value: amount });
    });

    describe('success', async () => {
      beforeEach(async () => {
        // Withdraw Ether
        result = await exchange.withdrawEther(amount, { from: user1  });
      });

      it('withdraws Ether funds', async () => {
        const balance = await exchange.tokens(ETHER_ADDRESS, user1);
        balance.toString().should.equal('0');
      });

      it('emits a Withdraw event', async () => {
        const log = result.logs[0];
        log.event.should.equal('Withdraw');
        const event = log.args;
        event.token.toString().should.equal(ETHER_ADDRESS, 'Ether address is correct');
        event.user.toString().should.equal(user1, 'user address is correct');
        event.amount.toString().should.equal(amount.toString(), 'amount is correct');
        event.balance.toString().should.equal('0', 'balance is correct');
      })
    });

    describe('failure', async () => {
      it('rejects withdraws for insufficient balances', async () => {
        await exchange.withdrawEther(ether(100), {from: user1}).should.be.rejectedWith(EVM_REVERT);
      });
    });
  });

  describe('withdrawing tokens', async () => {
    let result;
    let amount = tokens(10);

    describe('success', async () => {
      beforeEach(async () => {
        // Deposit tokens first
        await token.approve(exchange.address, amount, { from: user1 });
        await exchange.depositToken(token.address, amount, { from: user1 });

        // Withdraw token
        result = await exchange.withdrawToken(token.address, amount, { from: user1  });
      });

      it('withdraws Token funds', async () => {
        const balance = await exchange.tokens(token.address, user1);
        balance.toString().should.equal('0');
      });

      it('emits a Withdraw event', async () => {
        const log = result.logs[0];
        log.event.should.equal('Withdraw');
        const event = log.args;
        event.token.toString().should.equal(token.address, 'token address is correct');
        event.user.toString().should.equal(user1, 'user address is correct');
        event.amount.toString().should.equal(amount.toString(), 'amount is correct');
        event.balance.toString().should.equal('0', 'balance is correct');
      });
    });

    describe('failure', async () => {
      it('rejects Ether withdraws', async () => {
        await exchange.withdrawToken(ETHER_ADDRESS, tokens(100), {from: user1}).should.be.rejectedWith(EVM_REVERT);
      });

      it('rejects withdraws for insufficient balances', async () => {
        await exchange.withdrawToken(token.address, tokens(100), {from: user1}).should.be.rejectedWith(EVM_REVERT);
      });
    });
  });

  describe('checking balances', async () => {
    beforeEach(async () => {
      await exchange.depositEther({from: user1, value: ether(1)});
    });

    it('returns user balance', async () => {
      const result = await exchange.balanceOf(ETHER_ADDRESS, user1);
      result.toString().should.equal(ether(1).toString());
    });
  });

  describe('making orders', async () => {
    let result;

    beforeEach(async () => {
      result = await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), {from: user1});
    });

    it('tracks the newly created order', async () => {
      const orderCount = await exchange.orderCount();
      orderCount.toString().should.equal('1');
      const order = await exchange.orders('1');
      order.id.toString().should.equal('1', 'id is correct');
      order.user.toString().should.equal(user1, 'user is correct');
      order.tokenGet.toString().should.equal(token.address, 'tokenGet is correct');
      order.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct');
      order.tokenGive.toString().should.equal(ETHER_ADDRESS, 'tokenGive is correct');
      order.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct');
      order.timestamp.toString().length.should.be.at.least(1, 'timestamp is present');
    });

    it('emits an Order event', async () => {
      const log = result.logs[0];
      log.event.should.equal('Order');
      const event = log.args;
      event.id.toString().should.equal('1', 'id is correct');
      event.user.toString().should.equal(user1, 'user is correct');
      event.tokenGet.toString().should.equal(token.address, 'tokenGet is correct');
      event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct');
      event.tokenGive.toString().should.equal(ETHER_ADDRESS, 'tokenGive is correct');
      event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct');
      event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present');
    });

  });

  describe('order actions', async () => {

    beforeEach(async () => {
      // user1 deposit ether
      await exchange.depositEther({from: user1, value: ether(1)});

      // give tokens to user2
      await token.transfer(user2, tokens(100), { from: deployer });

      // user2 deposit tokens
      await token.approve(exchange.address, tokens(2), { from: user2 });
      await exchange.depositToken(token.address, tokens(2), {from: user2 });

      // user1 makes an order to buy tokens with ether
      await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), {from: user1});
    });

    describe('filling orders', async () => {
      let result;

      describe('success', async () => {
        beforeEach(async () => {
          // user2 fills order
          result = await exchange.fillOrder('1', {from: user2});
        });

        it('executes the trade & charge fees', async () => {
          let balance = await exchange.balanceOf(token.address, user1);
          balance.toString().should.equal(tokens(1).toString(), 'user1 received tokens');
          balance = await exchange.balanceOf(ETHER_ADDRESS, user2);
          balance.toString().should.equal(ether(1).toString(), 'user2 received ether');
          balance = await exchange.balanceOf(ETHER_ADDRESS, user1);
          balance.toString().should.equal('0', 'user1 ether deducted');
          balance = await exchange.balanceOf(token.address, user2);
          balance.toString().should.equal(tokens(0.9).toString(), 'user2 tokens deducted with fee applied');
          const feeAccount = await exchange.feeAccount();
          balance = await exchange.balanceOf(token.address, feeAccount);
          balance.toString().should.equal(tokens(0.1).toString(), 'feeAccount received fee');
        });

        it('updates filled orders', async () => {
          const orderFilled = await exchange.orderFilled(1);
          orderFilled.should.equal(true);
        });

        it('emits Trade event', async () => {
          const log = result.logs[0];
          log.event.should.equal('Trade');
          const event = log.args;
          event.id.toString().should.equal('1', 'id is correct');
          event.user.toString().should.equal(user1, 'user is correct');
          event.tokenGet.toString().should.equal(token.address, 'tokenGet is correct');
          event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct');
          event.tokenGive.toString().should.equal(ETHER_ADDRESS, 'tokenGive is correct');
          event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct');
          event.userFill.should.equal(user2, 'userFill is correct');
          event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present');
        });
      });

      describe('failure', async () => {
        it('rejects invalid order ids', async () => {
          const invalidId = 99999;
          await exchange.fillOrder(invalidId, { from: user2 }).should.be.rejectedWith(EVM_REVERT);
        });

        it('rejects already filled orders', async () => {
          // Fill the order
          await exchange.fillOrder('1', { from: user2 }).should.be.fulfilled;
          // Try to fill it again
          await exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT);
        });

        it('rejects cancelled orders', async () => {
          // Cancel the order
          await exchange.cancelOrder('1', { from: user1 }).should.be.fulfilled;
          // Try to fill it again
          await exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT);
        });

      });
    });

    describe('cancelling orders', async () => {
      let result;

      describe('success', async() => {
        beforeEach(async () => {
          result = await exchange.cancelOrder('1', {from: user1});
        });

        it('updates cancelled orders', async () => {
          const orderCancelled = await exchange.orderCancelled('1');
          orderCancelled.should.equal(true);
        });

        it('emits Cancel event', async () => {
          const log = result.logs[0];
          log.event.should.equal('Cancel');
          const event = log.args;
          event.id.toString().should.equal('1', 'id is correct');
          event.user.toString().should.equal(user1, 'user is correct');
          event.tokenGet.toString().should.equal(token.address, 'tokenGet is correct');
          event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct');
          event.tokenGive.toString().should.equal(ETHER_ADDRESS, 'tokenGive is correct');
          event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct');
          event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present');
        });
      });

      describe('failure', async() => {
        it('rejects invalid order ids', async () => {
          const invalidOrderId = 99999;
          await exchange.cancelOrder(invalidOrderId, {from: user1}).should.be.rejectedWith(EVM_REVERT);
        });

        it('rejects unauthorized cancelations', async () => {
          await exchange.cancelOrder('1', {from: user2}).should.be.rejectedWith(EVM_REVERT);
        });
      });

    });
  });

});