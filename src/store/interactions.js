import { 
  web3Loaded, 
  web3AccountLoaded, 
  tokenLoaded, 
  exchangeLoaded, 
  cancelledOrdersLoaded, 
  filledOrdersLoaded,
  allOrdersLoaded,
  orderCancelling, 
  orderCancelled, 
  orderFillling,
  orderFilled,
  etherBalanceLoaded,
  tokenBalanceLoaded,
  exchangeEtherBalanceLoaded,
  exchangeTokenBalanceLoaded,
  balancesLoaded, balancesLoading, buyOrderMaking, sellOrderMaking, orderMade
} from "./actions";
import Token from '../abis/Token.json';
import Exchange from '../abis/Exchange.json';
import Web3 from 'web3';
import { ETHER_ADDRESS } from '../helpers'

export const loadWeb3 = (dispach) => {
  const web3 = new Web3(Web3.givenProvider || 'http://localhost:7545');
  dispach(web3Loaded(web3));
  return web3;
}

export const loadAccount = async (web3, dispach) => {
  const accounts = await web3.eth.getAccounts();
  const account = accounts[0];
  dispach(web3AccountLoaded(account));
  return account;
}

export const loadToken = async (web3, networkId, dispach) => {
  try {
    const token = new web3.eth.Contract(Token.abi, Token.networks[networkId].address);
    dispach(tokenLoaded(token));
    return token;
  } catch (error) {
    console.error(error);
  }
  return null;
}

export const loadExchange = async (web3, networkId, dispach) => {
  try {
    const exchange = new web3.eth.Contract(Exchange.abi, Exchange.networks[networkId].address);
    dispach(exchangeLoaded(exchange));
    return exchange;
  } catch (error) {
    console.error(error);
  }
  return null;
}

export const loadAllOrder = async (exchange, dispatch) => {
  try {
    // Fetch cancelled orders (Cancel events)
    const cancelStream = await exchange.getPastEvents('Cancel', { fromBlock: 0, toBlock: 'latest' });
    const cancelOrders = cancelStream.map((event) => event.returnValues);
    // Add orders to sore
    dispatch(cancelledOrdersLoaded(cancelOrders));

    // Fetch filled orders (Trade events)
    const tradeStream = await exchange.getPastEvents('Trade', { fromBlock: 0, toBlock: 'latest' });
    const filledOrders = tradeStream.map((event) => event.returnValues);
    // Add orders to sore
    dispatch(filledOrdersLoaded(filledOrders));
    
    // Fetch all orders (Order events)
    const orderStream = await exchange.getPastEvents('Order', { fromBlock: 0, toBlock: 'latest' });
    const allOrders = orderStream.map((event) => event.returnValues);
    // Add orders to sore
    dispatch(allOrdersLoaded(allOrders));

  } catch (error) {
    console.error(error);
  }
}

export const cancelOrder = (dispatch, exchange, order, account) => {
  exchange.methods.cancelOrder(order.id).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(orderCancelling());
  })
  .on('error', (error) => {
    console.error(error);
    window.alert('There was an error!');
  })
}

export const fillOrder = (dispatch, exchange, order, account) => {
  exchange.methods.fillOrder(order.id).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(orderFillling());
  })
  .on('error', (error) => {
    console.error(error);
    window.alert('There was an error!');
  })
}

export const subscribeToEvents = async (exchange, dispatch) => {
  exchange.events.Cancel({}, (error, event) => {
    dispatch(orderCancelled(event.returnValues));
  })
  
  exchange.events.Trade({}, (error, event) => {
    dispatch(orderFilled(event.returnValues));
  })

  exchange.events.Deposit({}, (error, event) => {
    dispatch(balancesLoaded());
  })

  exchange.events.Withdraw({}, (error, event) => {
    dispatch(balancesLoaded());
  })

  exchange.events.Order({}, (error, event) => {
    dispatch(orderMade(event.returnValues));
  })
}

export const loadBalances = async (dispatch, web3, exchange, token, account) => {
  // Ether balance in wallet
  const etherBalance = await web3.eth.getBalance(account);
  dispatch(etherBalanceLoaded(etherBalance));

    // Token balance in wallet
    const tokenBalance = await token.methods.balanceOf(account).call();
    dispatch(tokenBalanceLoaded(tokenBalance));

  // Ether balance in exchange
  const exchangeEtherBalance = await exchange.methods.balanceOf(ETHER_ADDRESS, account).call();
  dispatch(exchangeEtherBalanceLoaded(exchangeEtherBalance));

  // Token balance in exchange
  const exchangeTokenBalance = await exchange.methods.balanceOf(token.options.address, account).call();
  dispatch(exchangeTokenBalanceLoaded(exchangeTokenBalance));

  // Trigger all balances loaded
  dispatch(balancesLoaded());
}

export const depositEther = (dispatch, exchange, web3, amount, account) => {
  exchange.methods.depositEther().send({ from: account, value: web3.utils.toWei(amount, 'ether') })
  .on('transactionHash', (hash) => {
    dispatch(balancesLoading());
  })
  .on('error', (error) => {
    console.error(error);
    window.alert('There was an error!');
  })
}

export const withdrawEther = (dispatch, exchange, web3, amount, account) => {
  exchange.methods.withdrawEther(web3.utils.toWei(amount, 'ether')).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(balancesLoading());
  })
  .on('error', (error) => {
    console.error(error);
    window.alert('There was an error!');
  })
}

export const depositToken = (dispatch, exchange, web3, token, amount, account) => {
  amount = web3.utils.toWei(amount, 'ether');

  token.methods.approve(exchange.options.address, amount).send({ from: account })
  .on('transactionHash', (hash) => {
    exchange.methods.depositToken(token.options.address, amount).send({ from: account })
    .on('transactionHash', (hash) => {
      dispatch(balancesLoading());
    })
  })
  .on('error', (error) => {
    console.error(error);
    window.alert('There was an error!');
  })
}

export const withdrawToken = (dispatch, exchange, web3, token, amount, account) => {
  exchange.methods.withdrawToken(token.options.address, web3.utils.toWei(amount, 'ether')).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(balancesLoading());
  })
  .on('error', (error) => {
    console.error(error);
    window.alert('There was an error!');
  })
}

export const makeBuyOrder = (dispatch, exchange, token, web3, order, account) => {
  const tokenGet = token.options.address;
  const amountGet = web3.utils.toWei(order.amount, 'ether');
  const tokenGive = ETHER_ADDRESS;
  const amountGive = web3.utils.toWei((order.amount * order.price).toString(), 'ether');

  exchange.methods.makeOrder(tokenGet, amountGet, tokenGive, amountGive).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(buyOrderMaking());
  })
  .on('error',(error) => {
    console.error(error);
    window.alert(`There was an error!`);
  })
}

export const makeSellOrder = (dispatch, exchange, token, web3, order, account) => {
  const tokenGet = ETHER_ADDRESS;
  const amountGet = web3.utils.toWei((order.amount * order.price).toString(), 'ether');
  const tokenGive = token.options.address;
  const amountGive = web3.utils.toWei(order.amount, 'ether');

  exchange.methods.makeOrder(tokenGet, amountGet, tokenGive, amountGive).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(sellOrderMaking());
  })
  .on('error',(error) => {
    console.error(error);
    window.alert(`There was an error!`);
  })
}