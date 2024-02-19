import { PublicKey } from '@solana/web3.js';
import { connection } from './config.mjs';
import * as spl from "@solana/spl-token"

async function getOwnerAta(mint, publicKey) {
const foundAta = PublicKey.findProgramAddressSync([publicKey.toBuffer(), spl.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], spl.ASSOCIATED_TOKEN_PROGRAM_ID)[0]
return(foundAta) }


export async function prelimTokenChecks(poolKeys) {
  const txs = await connection.getConfirmedSignaturesForAddress2(poolKeys.lpMint, { limit: 2 });
  if (txs.length < 1000 && txs.length > 0) {
  const firstTx = await connection.getParsedTransaction(txs[txs.length-1].signature, {maxSupportedTransactionVersion: 0});
 if (firstTx) {
  const creator = firstTx.transaction?.message?.accountKeys[0].pubkey.toString()
  const creatorAta = await getOwnerAta(poolKeys.baseMint, new PublicKey(creator))
  const largestHolders = await connection.getTokenLargestAccounts(poolKeys.baseMint, "processed");
  const totalSupply = await connection.getTokenSupply(poolKeys.baseMint, "processed");
  const lpMintSupply = await connection.getTokenSupply(poolKeys.lpMint, "processed")
  console.log("lpMint:", poolKeys.lpMint.toString())
  const maxAllowed = Number(totalSupply.value) * 0.4;
  for (let holder of largestHolders.value) {
    if (Number(holder.amount) > maxAllowed && holder.address.toString() == creatorAta[0].toString()) {
		console.log(poolKeys.baseMint.toString(), "half the supply owned by creator, ignoring")
      return false } }
	if (Number(lpMintSupply.value) > 0) {
		console.log(poolKeys.baseMint.toString(), "unburned LP, ignoring")
		return(false)
	}
console.log(poolKeys.baseMint.toString(), "lpMint:", poolKeys.lpMint.toString(), "passes checks")
return(true) }
if (!firstTx) {
return(false)
}

  }

 }