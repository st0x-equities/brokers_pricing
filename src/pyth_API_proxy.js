// Import required libraries
const { Connection } = require('@solana/web3.js');
const { PriceStatus, PythHttpClient, getPythClusterApiUrl, getPythProgramKeyForCluster, PythCluster } = require('@pythnetwork/client');
const ethers = require('ethers'); // Import ethers.js for Ethereum-related functionality
const { FixedNumber } = require('ethers'); // Import FixedNumber from ethers.js

const PYTHNET_CLUSTER_NAME = 'pythnet'; // Initialize the constant
const connection = new Connection(getPythClusterApiUrl(PYTHNET_CLUSTER_NAME));
const pythPublicKey = getPythProgramKeyForCluster(PYTHNET_CLUSTER_NAME);

// Define the Cloudflare Worker endpoint
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

// Define the handleRequest function to handle incoming requests
async function handleRequest(request) {
  try {
    const symbol = 'Crypto.BTC/USD';
    const price = await getPrice();

    // Calculate fake bid and ask
    const fakeBid = price + (price * 0.001);
    const fakeAsk = price - (price * 0.001);

    console.log('Price:', price); // Log the retrieved price
    console.log('Fake Bid:', fakeBid); // Log the fake bid
    console.log('Fake Ask:', fakeAsk); // Log the fake ask

    // Sign the data with your EVM wallet's private key
    const privateKey = '1c8ee97c2a1c154e55c4362a18a0e0b62e7cbd64b88b42f15742f3e3dc2c1e91'; // Replace with your actual private key
    const dataToSign = { symbol, price, fakeBid, fakeAsk };
    const signature = await signData(dataToSign, privateKey);

    console.log('Signature:', signature); // Log the signature

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
    console.error('Error:', error); // Log the error and stack trace
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Modify the getPrice function to return the price
async function getPrice() {
  const pythClient = new PythHttpClient(connection, pythPublicKey);
  const data = await pythClient.getData();

  for (const symbol of data.symbols) {
    if (symbol === 'Crypto.BTC/USD') { // Check if the symbol is Crypto.BTC/USD
      const price = data.productPrice.get(symbol);

      if (price && price.price && price.confidence) {
        console.log(`${symbol}: $${price.price} \xB1$${price.confidence}`);
        return price.price; // Return the price value
      } else {
        console.log(`${symbol}: price currently unavailable. status is ${PriceStatus[price.status]}`);
        return null; // Return null if price is unavailable
      }
    }
  }
}

// Implement a function to sign data with your EVM wallet's private key
async function signData(data, privateKey) {
  // Convert data to bytes and sign it with the private key
  const dataBytes = ethers.utils.arrayify(ethers.utils.solidityKeccak256(
    ["string", "uint256", "uint256", "uint256"], // Use "uint256" for FixedNumber values
    [data.symbol, FixedNumber.fromValue(data.price [decimals = 18 [format = "ufixed256x18"]]), FixedNumber.fromValue(data.fakeBid [decimals = 18 [format = "ufixed256x18"]]),FixedNumber.fromValue(data.fakeAsk [decimals = 18 [format = "ufixed256x18"]])] // Convert to FixedNumber
  ));

  console.log('Data to Sign:', data); // Log the data to sign
  console.log('Data Bytes:', dataBytes); // Log the data bytes for debugging

  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(dataBytes);

  console.log('Signature:', signature); // Log the generated signature

  return signature;
}

