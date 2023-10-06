// Import required libraries
const { Connection } = require('@solana/web3.js');
const { PriceStatus, PythHttpClient, getPythClusterApiUrl, getPythProgramKeyForCluster, PythCluster } = require('@pythnetwork/client');
const ethers = require('ethers'); // Import ethers.js for Ethereum-related functionality
import { BigNumber } from "ethers"
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

    // Calculate expiry (current time + 1 minute)
    const now = new Date(); // Get the current date and time
    const expiry = Math.floor((now.getTime() + 1 * 60 * 1000) / 1000);   
    
    // Sign the data with your EVM wallet's private key
    const privateKey = '1c8ee97c2a1c154e55c4362a18a0e0b62e7cbd64b88b42f15742f3e3dc2c1e91'; // Replace with your actual private key
    
    const context = [
      ethers.utils.formatBytes32String(symbol).toString(),
      ethers.utils.parseEther(price.toString()).toString(),
      ethers.utils.parseEther(fakeBid.toString()).toString(),
      ethers.utils.parseEther(fakeAsk.toString()).toString(),
      BigNumber.from(expiry).toString()
    ]

    console.log = ('context :', context)

  const signer = new ethers.Wallet(privateKey);
  const signature = await signer.signMessage(ethers.utils.arrayify(ethers.utils.solidityKeccak256(
    ["uint256", "uint256", "uint256", "uint256", "uint256"],
    context
  )));

    // Create the SignedContextV1Struct
    const SignedContextV1Struct = {
      signer: '0x0124555E401547219fB024aE5F8C5101c6f7Cb24', // Replace with your signer's address
      signature: signature,
      context: context
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
        return price.price; // Return the price value
      } else {
        return null; // Return null if price is unavailable
      }
    }
  }
}

