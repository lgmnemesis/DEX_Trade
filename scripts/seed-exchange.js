const { ether, tokens, ETHER_ADDRESS, wait, web3 } = require("../test/helpers");

const Token = artifacts.require("Token");
const Exchange = artifacts.require("Exchange");

module.exports = async function(callback) {

  try {
    const accounts = await web3.eth.getAccounts();
    const token = await Token.deployed();
    const exchange = await Exchange.deployed();

    // Give tokens to acccounts[1]
    const sender = accounts[0];
    const receiver = accounts[1];
    let amount =  web3.utils.toWei('10000', 'ether'); // 10000 tokens

    await token.transfer(receiver, amount, {from: sender});
    console.log(`Transferred ${amount} tokens from ${sender} to ${receiver}`);

    // Set up exchange users
    const user1 = accounts[0];
    const user2 = accounts[1];

    // User 1 deposit ether
    amount = 1;
    await exchange.depositEther({from: user1, value: ether(amount)});
    console.log(`Deposited ${amount} Ether from ${user1}`);

    // User 2 approve tokens
    amount = 10000;
    await token.approve(exchange.address, tokens(amount), {from: user2});

    // User 2 deposit tokens
    await exchange.depositToken(token.address, tokens(amount), {from: user2});
    console.log(`Deposited ${amount} tokens from ${user2}`);

    ///// Seed cancelled orders

    // User 1 makes order to take tokens
    let result = await exchange.makeOrder(token.address, tokens(100), ETHER_ADDRESS, ether(0.1), {from: user1});
    console.log(`Made order from ${user1}`);

    // User 1 cancells order
    let orderId = result.logs[0].args.id;
    await exchange.cancelOrder(orderId, {from: user1});
    console.log(`Cancalled order from ${user1}`);

    ///// Seed filled orders
    // User 1 makes order
    result = await exchange.makeOrder(token.address, tokens(100), ETHER_ADDRESS, ether(0.1), {from: user1});
    console.log(`Made order from ${user1}`);

    // User 2 Fills order
    orderId = result.logs[0].args.id;
    await exchange.fillOrder(orderId, {from: user2});
    console.log(`Filled order from ${user2}`);

    // Wait 1 second
    await wait(1);

    // User 1 makes a second order
    result = await exchange.makeOrder(token.address, tokens(50), ETHER_ADDRESS, ether(0.01), {from: user1});
    console.log(`Made a second order from ${user1}`);

    // User 2 Fills order
    orderId = result.logs[0].args.id;
    await exchange.fillOrder(orderId, {from: user2});
    console.log(`Filled order from ${user2}`);

    // Wait 1 second
    await wait(1);

    // User 1 makes a final order
    result = await exchange.makeOrder(token.address, tokens(200), ETHER_ADDRESS, ether(0.15), {from: user1});
    console.log(`Made order from ${user1}`);

    // User 2 Fills order
    orderId = result.logs[0].args.id;
    await exchange.fillOrder(orderId, {from: user2});
    console.log(`Filled order from ${user2}`);

    // Wait 1 second
    await wait(1);


    // User 1 makes 10 orders
    for (let i = 1; i <= 10 ; i++) {
      result = await exchange.makeOrder(token.address, tokens(10 * i), ETHER_ADDRESS, ether(0.01), {from: user1});
      console.log(`Made order from ${user1}`);

      // Wait 1 second
      await wait(1);
    }

    // User 2 makes 10 orders
    for (let i = 1; i <= 10 ; i++) {
      result = await exchange.makeOrder(ETHER_ADDRESS, ether(0.01), token.address, tokens(10 * i), {from: user2});
      console.log(`Made order from ${user2}`);

      // Wait 1 second
      await wait(1);
    }

  } catch (error) {
    console.error(error);
  }

  callback();
}