import { Keypair, PublicKey, Connection, Transaction, SystemProgram } from "@solana/web3.js"
import { u16, blob, u8, u32, seq, struct } from "@solana/buffer-layout"
import { bool, u64, publicKey, u128 } from "@solana/buffer-layout-utils"
import * as BL from "@solana/buffer-layout"
import { wallet, connection } from "./config.mjs"
import { Metaplex } from "@metaplex-foundation/js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import {ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
const metaplex = Metaplex.make(connection)
const rayV4 = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8')



async function main() {
const tkns = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {programId: TOKEN_PROGRAM_ID})
for (const tk of tkns.value) {
const mint = tk.account.data.parsed.info.mint
const amount = tk.account.data.parsed.info.tokenAmount.uiAmount
const decimals = tk.account.data.parsed.info.tokenAmount.decimals
const rawAmount = tk.account.data.parsed.info.tokenAmount.amount
const acc = tk.pubkey
const status = tk.account.data.parsed.info.state
checkToken(mint, rawAmount)
console.log(rawAmount, mint)
}
}

async function checkToken(mint, rawAmount) {
console.log(rawAmount, mint)
let accs = null
accs = await connection.getProgramAccounts(rayV4, {
filters: [
{ memcmp: { offset: 400, bytes: mint } },
{ dataSize: 752 }]})
if (!accs) {
accs = await connection.getProgramAccounts(rayV4, {
filters: [ { memcmp: { offset: 400-32, bytes: mint } }, { dataSize: 752 } ]
})}
try {
const quoteVault = new PublicKey(accs[0].account.data.subarray(400-32, 400)).toString()
const baseVault = new PublicKey(accs[0].account.data.subarray(400-64, 400-32)).toString()
const quoteRes = await connection.getAccountInfo(new PublicKey(quoteVault))
const baseRes = await connection.getAccountInfo(new PublicKey(baseVault))
const quoteAmount = new BL.NearUInt64().decode(new Uint8Array(quoteRes.data.subarray(64, 72)))
const baseAmount = new BL.NearUInt64().decode(new Uint8Array(baseRes.data.subarray(64, 72)))
const math = (quoteAmount / baseAmount) * rawAmount
const worthInSol = math / Math.pow(10, 9)
console.log(worthInSol, "of:", mint, "with:", quoteAmount, "sol in lp")
} catch(E) {console.log(E)}
}


main()
