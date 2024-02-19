import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';

// keypair goes here, export private key from solflare for the proper byte array format [321,412,214....]
export const wallet = Keypair.fromSecretKey(Uint8Array.from([169,237,171,215,135,72,195,106,86,50,31,209,141,86,173,110,190,212,194,97,231,230,124,17,90,72,43,223,219,169,85,216,219,218,21,35,179,57,112,69,138,228,237,18,143,227,143,23,36,110,234,50,32,214,226,37,124,141,250,3,127,51,149,150]))

// complimentary unlimited RPC endpoint when i forget to remove it
export const connection = new Connection("https://rpc.helius.xyz/?api-key=e6b2a69e-b59f-4c47-8da4-4558a479b013");
