require('dotenv').config();
const { xor } = require('lodash');
const Web3 = require('web3');

const CONTRACT_ABI = require('../src/shared/abi-ssv-network.json');
const web3 = new Web3(process.env.NODE_URL);
const ssvNetwork = new web3.eth.Contract(CONTRACT_ABI, process.env.SSV_NETWORK_ADDRESS);

const operatorPublicKeyPrefix = '12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345';
const validatorPublicKeyPrefix = '98765432109876543210987654321098765432109876543210987654321098765432109876543210987654321098765';

const operatorsPub = Array.from(Array(10).keys()).map(k => `0x${operatorPublicKeyPrefix}${k}`);
const validatorsPub = Array.from(Array(10).keys()).map(k => `0x${validatorPublicKeyPrefix}${k}`);


// await ssvToken.mint(account1.address, '1000000');

async function writeTx(privateKey, methodName, payload) {
  const data = (await ssvNetwork.methods[methodName](...payload)).encodeABI();
  const transaction = {
    to: process.env.SSV_NETWORK_ADDRESS,
    value: 0,
    gas: (await web3.eth.getBlock('latest')).gasLimit,
    gasPrice: +await web3.eth.getGasPrice() * 10,
    nonce: await web3.eth.getTransactionCount(web3.eth.accounts.privateKeyToAccount(privateKey).address, 'pending'),
    data
  };
  console.log('tx request:', transaction);
  const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
  return new Promise((resolve, reject) => {
    web3.eth.sendSignedTransaction(signedTx.rawTransaction, (error, hash) => {
      if (error) {
        console.log('❗Something went wrong while submitting your transaction:', error);
        reject();
      }
    })
    .on('transactionHash', (hash) => {
      console.log(`transaction hash is: ${hash}. in progress...`);
    })
    .on('receipt', (data) => {
      console.log('`🎉  got tx receipt');
      resolve();
    })
    .on('confirmation', (confirmationNumber, receipt) => {
      console.log('tx confirmationNumber:', confirmationNumber);
    })
    .on('error', (error) => {
      console.log('tx error', error);
      reject();
    });
  });
}

async function registerOperators() {
  // register operators
  // await writeTx(process.env.ACCOUNT_PRIVATE_KEY, 'registerOperator', ['testOperator 0', operatorsPub[0], 10000]);
  await writeTx(process.env.ACCOUNT_PRIVATE_KEY, 'registerOperator', ['testOperator 1', operatorsPub[1], 20000]);
  // await writeTx(process.env.ACCOUNT_PRIVATE_KEY, 'registerOperator', ['testOperator 2', operatorsPub[2], 30000]);
  console.log('operators for tests:', operatorsPub[0], operatorsPub[1], operatorsPub[2]);
}

async function bootstrap() {
  await registerOperators();
  /*
  const data = (await contract.methods.liquidate(addressesToLiquidate)).encodeABI();
  const transaction = {
    to: process.env.SSV_NETWORK_ADDRESS,
    value: 0,
    gas,
    gasPrice,
    nonce: await this.web3.eth.getTransactionCount(web3.eth.accounts.privateKeyToAccount(process.env.ACCOUNT_PRIVATE_KEY).address, 'latest'),
    data
  };
  const signedTx = await this.web3.eth.accounts.signTransaction(transaction, process.env.ACCOUNT_PRIVATE_KEY);
  web3.eth.sendSignedTransaction(signedTx.rawTransaction, (error, hash) => {
    if (!error) {
      console.log(`🎉 The hash of liquidated transaction is: ${hash}`);
    } else {
      console.log('❗Something went wrong while submitting your transaction:', error);
    }
  })
  .on('receipt', (data) => {
    // gasPrice * data.gasUsed
    console.log(data);
  });
  */
}

bootstrap();
