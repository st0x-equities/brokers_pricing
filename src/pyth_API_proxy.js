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
    
    const symbolHash = await generateSymbolBytes(symbol);
    const priceHash = await generatePriceBytes(price);
    const fakeBidHash = await generateFakeBidBytes(fakeBid);
    const fakeAskHash = await generateFakeAskBytes(fakeAsk);
   
    const bidSignature = await signBid(fakeBidHash, privateKey);
    const askSignature = await signAsk(fakeAskHash, privateKey);

    console.log('Symbol Hash:', symbolHash); // Log the symbol hash for debugging
    console.log('Price Hash:', priceHash); // Log the price hash for debugging
    console.log('Fake Bid Hash:', fakeBidHash); // Log the fake bid hash for debugging
    console.log('Fake Ask Hash:', fakeAskHash); // Log the fake ask hash for debugging
    console.log('Signature:', bidSignature); // Log the signature
    console.log('Signature:', askSignature); // Log the signature

    // Create the SignedContextV1Struct
    const SignedContextV1Struct = {
      signer: '0x0124555E401547219fB024aE5F8C5101c6f7Cb24', // Replace with your signer's address
      symbol: symbolHash,
      price: priceHash,
      fakeBid: fakeBidHash,
      bidSignature: bidSignature,
      fakeAsk: fakeAskHash,
      askSignature : askSignature,
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

// Function to generate bytes for the symbol
async function generateSymbolBytes(symbol) {
  const symbolHash = ethers.utils.solidityKeccak256(["string"], [symbol]);
  return symbolHash;
}

// Function to generate bytes for the price
async function generatePriceBytes(price) {
  const priceParsed = ethers.utils.parseEther(price.toString());
  const priceHash = ethers.utils.solidityKeccak256(["uint256"], [priceParsed]);
  return priceHash;
}

// Function to generate bytes for the fake bid
async function generateFakeBidBytes(fakeBid) {
  const fakeBidParsed = ethers.utils.parseEther(fakeBid.toString());
  const fakeBidHash = ethers.utils.solidityKeccak256(["uint256"], [fakeBidParsed]);
  return fakeBidHash;
}

// Function to generate bytes for the fake ask
async function generateFakeAskBytes(fakeAsk) {
  const fakeAskParsed = ethers.utils.parseEther(fakeAsk.toString());
  const fakeAskHash = ethers.utils.solidityKeccak256(["uint256"], [fakeAskParsed]);
  return fakeAskHash;
}

// Implement a function to sign fakebid with your EVM wallet's private key
async function signBid(fakeBid, privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(fakeBid);
  return signature;
}

// Implement a function to sign fakeask with your EVM wallet's private key
async function signAsk(fakeAsk, privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(fakeAsk);
  return signature;
}



