// Import required libraries
const { Connection } = require('@solana/web3.js');
const { PriceStatus, PythHttpClient, getPythClusterApiUrl, getPythProgramKeyForCluster, PythCluster } = require('@pythnetwork/client');
const ethers = require('ethers');
import { BigNumber } from "ethers";

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
    const url = new URL(request.url);
    const inputToken = url.searchParams.get('input');
    const outputToken = url.searchParams.get('output');

    if (!inputToken || !outputToken) {
      return new Response(JSON.stringify({ error: 'Both input and output tokens are required.' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const symbol = 'Crypto.BTC/USD';
    const price = await getPrice();

    //ob contract address
    const ob_address = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";

    //Broker ID 
    const Broker_ID = 123;

    // Eth mainnet Contract addresses for test
    const BTC_token_address = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";
    const USDT_token_address = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

    // Calculate fake bid and ask
    const fakeBid = price + (price * 0.001);
    const fakeAsk = price - (price * 0.001);

    const fakeAskInverted = Math.trunc((1e18 * 1e18) / (1e18 * fakeAsk));

    // Amount limits
    const AmountBuy = 10;
    const AmountSell = 10 * price;

    // Calculate expiry (current time + 1 minute)
    const now = new Date(); // Get the current date and time
    const expiry = Math.floor((now.getTime() + 1 * 60 * 1000) / 1000);

    // Sign the data with your EVM wallet's private key
    const privateKey = '1c8ee97c2a1c154e55c4362a18a0e0b62e7cbd64b88b42f15742f3e3dc2c1e91'; // Replace with your actual private key
    const signer = new ethers.Wallet(privateKey);

    // Convert address from 20 to 32 bytes
    const BTC_addressto32 = ethers.utils.zeroPad(ethers.utils.arrayify(BTC_token_address), 32);
    const USDT_addressto32 = ethers.utils.zeroPad(ethers.utils.arrayify(USDT_token_address), 32);

    let context, signature;

    if (inputToken === 'USDT' && outputToken === 'BTC') {
      // User wants to swap USDT for BTC (Buy)
      context = [
        ethers.utils.solidityKeccak256(["address", "address", "address"], [ USDT_token_address, BTC_token_address, ob_address]).toString(),
        BigNumber.from(Broker_ID).toString(),
        ethers.utils.parseEther(AmountBuy.toString()).toString(),
        ethers.utils.parseEther(fakeBid.toString()).toString(),
        BigNumber.from(expiry).toString()
      ];
      signature = await signer.signMessage(ethers.utils.arrayify(ethers.utils.solidityKeccak256(
        ["uint256", "uint256", "uint256", "uint256", "uint256"],
        context
      )));
    } else if (inputToken === 'BTC' && outputToken === 'USDT') {
      // User wants to swap BTC for USDT (Sell)
      context = [
        ethers.utils.solidityKeccak256(["address", "address", "address"], [BTC_token_address, USDT_token_address, ob_address]).toString(),
        BigNumber.from(Broker_ID).toString(),
        ethers.utils.parseEther(AmountSell.toString()).toString(),
        ethers.utils.parseEther(fakeAskInverted.toString()).toString(),
        BigNumber.from(expiry).toString()
      ];
      signature = await signer.signMessage(ethers.utils.arrayify(ethers.utils.solidityKeccak256(
        ["uint256", "uint256", "uint256", "uint256", "uint256"],
        context
      )));
    } else {
      return new Response(JSON.stringify({ error: 'Invalid input and output tokens.' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Create the SignedContextV1Struct
    const SignedContextV1Struct = {
      signer: '0x0124555E401547219fB024aE5F8C5101c6f7Cb24', // Replace with your signer's address
      signature: signature,
      context: context
    };

    // Return the SignedContextV1Struct as JSON
    return new Response(JSON.stringify([SignedContextV1Struct]), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error:', error);
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

