require('dotenv').config();
const Web3 = require('web3');

const SSV_NETWORK_ADDRESS_ABI = require('../src/shared/v2.abi.json');
const SSV_TOKEN_ADDRESS_ABI = require('../src/shared/ssv-token.abi.json');

const web3 = new Web3(process.env.NODE_URL);
const contracts = {
  [process.env.SSV_NETWORK_ADDRESS]: new web3.eth.Contract(SSV_NETWORK_ADDRESS_ABI, process.env.SSV_NETWORK_ADDRESS),
  [process.env.SSV_TOKEN_ADDRESS]: new web3.eth.Contract(SSV_TOKEN_ADDRESS_ABI, process.env.SSV_TOKEN_ADDRESS),
};

const operatorPublicKeyPrefix = '12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345';
const validatorPublicKeyPrefix = '98765432109876543210987654321098765432109876543210987654321098765432109876543210987654321098765';

const operatorsPub = Array.from(Array(10).keys()).map(k => `0x${operatorPublicKeyPrefix}${k}`);
const validatorsPub = Array.from(Array(10).keys()).map(k => `0x${validatorPublicKeyPrefix}${k}`);

const ownerValidators = [
  '652c90ac47fb219b39fa9b2fd7d52910300625c4af3e1a70e867b5ecad4049e2',
  '9e14ec09c1ab8a1adf938699ec7e113460d5d5d4330a6b421fda4a9bc665e674',
  'f38f928f8f13079eedd50304b3ab571e83653ac22d7e215f154cf11fb6c52755',
  '85e9c9cca3ef301d646b175c21eff69722ca795cef246c69f16c57e9d36f7dc8',
  'a5db5d2529f66092fc0f22c88a0523354b14b600dd42b55e798f54108b20ce09',
  '0ea43e660288594beae456303da92faa5ec5b82a67c42f8c417ef0ff8ffed12e',
  'e68b5898dadf3dc8a3c11154257ea1d6e9e9cd6828d5ee601d5a70293ae9a46c',
  '9cb53e0ce246dea2aaf8f97ca458e42a93a3cbc1a238a246ad6f6ad9f121e13e'
]

async function writeTx(contractAddress, privateKey, methodName, payload, value = 0) {
  const data = payload && (await contracts[contractAddress].methods[methodName](...payload)).encodeABI();
  // const gas = payload && await (await contracts[contractAddress].methods[methodName](...payload)).estimateGas() * 2;

  const transaction = {
    to: contractAddress,
    value,
    nonce: await web3.eth.getTransactionCount(web3.eth.accounts.privateKeyToAccount(privateKey).address, 'pending'),
    data
  };
  const gas = payload && await web3.eth.estimateGas({ ...transaction, from: web3.eth.accounts.privateKeyToAccount(privateKey).address }) * 2;

  transaction.gas = gas || 1500000;
  transaction.gasPrice = +await web3.eth.getGasPrice() * 10;

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
    .on('error', (error) => {
      console.log('tx error', error);
      reject();
    });
  });
}

async function registerOperators() {
  // register operators
  await writeTx(process.env.SSV_NETWORK_ADDRESS, process.env.ACCOUNT_PRIVATE_KEY, 'registerOperator', ['testOperator 0', operatorsPub[0], 10000]);
  await writeTx(process.env.SSV_NETWORK_ADDRESS, process.env.ACCOUNT_PRIVATE_KEY, 'registerOperator', ['testOperator 1', operatorsPub[1], 20000]);
  await writeTx(process.env.SSV_NETWORK_ADDRESS, process.env.ACCOUNT_PRIVATE_KEY, 'registerOperator', ['testOperator 2', operatorsPub[2], 30000]);
  await writeTx(process.env.SSV_NETWORK_ADDRESS, process.env.ACCOUNT_PRIVATE_KEY, 'registerOperator', ['testOperator 3', operatorsPub[3], 10000]);
  console.log('operators for tests:', operatorsPub[0], operatorsPub[1], operatorsPub[2]);
}

async function registerValidators() {
  const tokens = '18000000';
  let idx = 1;
  for (const privateKey of ownerValidators) {
    const address = web3.eth.accounts.privateKeyToAccount(privateKey).address;
    console.log(address, 'transfer eth for gas');
    await writeTx(address, process.env.ACCOUNT_PRIVATE_KEY, null, null, '500000000000000000');
    console.log(address, 'mint tokens for validators');
    await writeTx(process.env.SSV_TOKEN_ADDRESS, process.env.ACCOUNT_PRIVATE_KEY, 'mint', [address, tokens]);
    console.log(address, 'register validator', process.env.SSV_TOKEN_ADDRESS, privateKey, 'approve', [process.env.SSV_NETWORK_ADDRESS, tokens]);
    await writeTx(process.env.SSV_TOKEN_ADDRESS, privateKey, 'approve', [process.env.SSV_NETWORK_ADDRESS, tokens]);
    await writeTx(process.env.SSV_NETWORK_ADDRESS, privateKey, 'registerValidator', [
      validatorsPub[idx],
      [1,2,3,4],
      operatorsPub.slice(0, 4),
      operatorsPub.slice(0, 4),
      tokens
    ]);
    idx++;
  }
}

async function bootstrap() {
  // await registerOperators();
  await registerValidators();
}

bootstrap();
