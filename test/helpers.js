const Web3 = require('web3');
export const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));

export const ether = (n) => {
  return new web3.utils.BN(web3.utils.toWei(n.toString(), 'ether'));
}

export const tokens = (n) => ether(n);

export const wait = (seconds) => {
  const milliseconds = seconds * 1000;
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

export const EVM_REVERT = 'VM Exception while processing transaction: revert';
export const ETHER_ADDRESS = '0x0000000000000000000000000000000000000000';