import React, { Component } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { connect } from 'react-redux';
import { fillOrder } from '../store/interactions';
import { accountSelector, exchangeSelector, orderBookLoadedSelector, orderBookSelector, orderFillingSelector } from '../store/selectors';
import Spinner from './Spinner';

const renderOrder = (order, props) => {
  const { dispatch, exchange, account } = props;
  return(
    <OverlayTrigger
      key={order.id}
      placement='auto'
      overlay={
        <Tooltip id={order.id}>
          {`Click here to ${order.orderFillAction}`}
        </Tooltip>
      }
    >
      <tr 
        key={order.id} 
        className="order-book-order"
        onClick={(e) => {
          fillOrder(dispatch, exchange, order, account);
        }}
        >
        <td>{order.tokenAmount}</td>
        <td className={`text-${order.orderTypeClass}`}>{order.tokenPrice}</td>
        <td>{order.etherAmount}</td>
      </tr>
    </OverlayTrigger>
  )
}

const showOrderBookOrders = (props) => {
  const { orderBook } = props;
  return(
    <tbody>
      {orderBook.sellOrders.map((order) => renderOrder(order, props))}
      <tr>
        <th>DAPP</th>
        <th>DAPP/ETH</th>
        <th>ETH</th>
      </tr>
      {orderBook.buyOrders.map((order) => renderOrder(order, props))}
    </tbody>
  )
}

class OrderBook extends Component {
  render() {
    return (
      <div className="vertical">
        <div className="card bg-dark text-white">
          <div className="card-header">
            Order Book
          </div>
          <div className="card-body">

            <table className="table table-dark table-sm small">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>DAPP</th>
                  <th>DAPP/ETH</th>
                </tr>
              </thead>
              { this.props.showOrderBook ? showOrderBookOrders(this.props) : <Spinner type="table"/> }
            </table>

          </div>
        </div>
      </div>

    )
  }
}

function mapStateToProps(state) {
  const orderBookLoaded = orderBookLoadedSelector(state);
  const orderFilling = orderFillingSelector(state);
  return {
    showOrderBook: orderBookLoaded && !orderFilling,
    orderBook: orderBookSelector(state),
    exchange: exchangeSelector(state),
    account: accountSelector(state)
  }
}

export default connect(mapStateToProps)(OrderBook);