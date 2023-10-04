// Import required libraries
const { Connection } = require('@solana/web3.js');
const { PriceStatus, PythHttpClient, getPythClusterApiUrl, getPythProgramKeyForCluster, PythCluster } = require('@pythnetwork/client');
const ethers = require('ethers'); // Import ethers.js for Ethereum-related functionality

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
    const signature = await signData(symbol, price, fakeBid, fakeAsk, privateKey);

    console.log('Signature:', signature); // Log the signature

    // Create the SignedContextV1Struct
    const SignedContextV1Struct = {
      signer: '0x0124555E401547219fB024aE5F8C5101c6f7Cb24', // Replace with your signer's address
      signature: signature,
      context: dataBytes,
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
async function signData(symbol, price, fakeBid, fakeAsk, privateKey) {
  console.log('Symbol:', symbol);
  console.log('Price:', price);
  console.log('Fake Bid:', fakeBid);
  console.log('Fake Ask:', fakeAsk);

  // Convert datat into string
  const priceString = String(price); // Ensure price is a string
  const fakeBidString = String(fakeBid); // Ensure fakeBid is a string
  const fakeAskString = String(fakeAsk); // Ensure fakeAsk is a string
  console.log('priceString:', priceString);
  console.log('fakeBidString:', fakeBidString);
  console.log('fakeAskString:', fakeAskString);

  // Convert data to bytes and sign it with the private key
  const priceParsed = ethers.utils.parseEther(priceString); // Ensure price is a string
  const fakeBidParsed = ethers.utils.parseEther(fakeBidString); // Ensure fakeBid is a string
  const fakeAskParsed = ethers.utils.parseEther(fakeAskString); // Ensure fakeAsk is a string

  const dataBytes = ethers.utils.solidityKeccak256(
    ["string", "uint256", "uint256", "uint256"],
    [symbol, priceParsed, fakeBidParsed, fakeAskParsed]
  );

  console.log('Data Bytes:', dataBytes); // Log the data bytes for debugging

  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(dataBytes);

  console.log('Signature:', signature); // Log the generated signature

  return signature;
}



