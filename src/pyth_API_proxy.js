// Import required libraries
const { Connection } = require('@solana/web3.js');
const { PriceStatus, PythHttpClient, getPythClusterApiUrl, getPythProgramKeyForCluster, PythCluster } = require('@pythnetwork/client');
const ethers = require('ethers'); // Import ethers.js for Ethereum-related functionality

const PYTHNET_CLUSTER_NAME = 'pythnet'; // Initialize the constant

// Define the Cloudflare Worker endpoint
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

// Define the handleRequest function to handle incoming requests
async function handleRequest(request) {
  try {
    // Perform your price query and calculations
    const symbol = 'Crypto.BTC/USD'; // Replace with the symbol you want to use
    const { price } = await getPrice(symbol);

    // Calculate fake bid and ask
    const fakeBid = price + (price * 0.001);
    const fakeAsk = price - (price * 0.001);

    // Sign the data with your EVM wallet's private key
    const privateKey = '1c8ee97c2a1c154e55c4362a18a0e0b62e7cbd64b88b42f15742f3e3dc2c1e91'; // Replace with your actual private key
    const dataToSign = { symbol, price, fakeBid, fakeAsk };
    const signature = await signData(dataToSign, privateKey);

    // Include the signature in the response
    dataToSign.signature = signature;

    // Create the SignedContextV1Struct
    const SignedContextV1Struct = {
      signer: '0x0124555E401547219fB024aE5F8C5101c6f7Cb24', // Replace with your signer's address
      signature,
      context: [dataToSign.symbol, dataToSign.price, dataToSign.fakeBid, dataToSign.fakeAsk],
    };

    // Return the SignedContextV1Struct as JSON
    return new Response(JSON.stringify(SignedContextV1Struct), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error(error); // Log the error and stack trace
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Implement a function to query the price data
async function getPrice(symbol) {
  const connection = new Connection(getPythClusterApiUrl(PYTHNET_CLUSTER_NAME));
  const pythPublicKey = getPythProgramKeyForCluster(PYTHNET_CLUSTER_NAME);
  const pythClient = new PythHttpClient(connection, pythPublicKey);
  const data = await pythClient.getData();
  const price = data.productPrice.get(symbol);
  return price;
}

// Implement a function to sign data with your EVM wallet's private key
async function signData(data, privateKey) {
  // Convert data to bytes and sign it with the private key
  const dataBytes = ethers.utils.arrayify(ethers.utils.solidityKeccak256(["uint256", "uint256", "uint256", "uint256", "uint256", "uint256", "uint256", "uint256"], data));
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(dataBytes);
  return signature;
}


