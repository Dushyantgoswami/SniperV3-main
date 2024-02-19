import * as spl from "@solana/spl-token"
import { Market } from '@openbook-dex/openbook'
import * as structs from "./structs.mjs"
import { connection, wallet } from './config.mjs';
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js'
import { createAssociatedTokenAccountIdempotent, getAssociatedTokenAddress, createSyncNativeInstruction, createAssociatedTokenAccountIdempotentInstruction} from "@solana/spl-token"
const wSol = new PublicKey("So11111111111111111111111111111111111111112")
const rayV4 = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8')
const openbookProgram = new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX')
const serumProgramId = new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin')
export async function derivePoolKeys(marketId) {
  const marketInfo = await getMarketInfo(marketId);
  const marketDeco = await getDecodedData(marketInfo);
  const baseMint = marketDeco.baseMint;
  const baseMintData = await getMintData(baseMint);
  const baseDecimals = await getDecimals(baseMintData);
  const ownerBaseAta = await getOwnerAta(baseMint, wallet.publicKey);
  const quoteMint = marketDeco.quoteMint;
  const quoteMintData = await getMintData(quoteMint);
  const quoteDecimals = await getDecimals(quoteMintData);
  const ownerQuoteAta = await getOwnerAta(quoteMint, wallet.publicKey);
  const authority = PublicKey.findProgramAddressSync([Buffer.from([97, 109, 109, 32, 97, 117, 116, 104, 111, 114, 105, 116, 121])], rayV4)[0];
  const marketAuthority = getVaultSigner(marketId, marketDeco);
  // get/derive all the pool keys
  const poolKeys = {
	keg: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    version: 4,
    marketVersion: 3,
    programId: rayV4,
    baseMint: baseMint,
    quoteMint: quoteMint,
    ownerBaseAta: ownerBaseAta,
    ownerQuoteAta: ownerQuoteAta,
    baseDecimals: baseDecimals,
    quoteDecimals: quoteDecimals,
	lpDecimals: baseDecimals,
    authority: authority,
    marketAuthority: marketAuthority,
    marketProgramId: openbookProgram,
    marketId: marketId,
    marketBids: marketDeco.bids,
    marketAsks: marketDeco.asks,
    marketQuoteVault: marketDeco.quoteVault,
    marketBaseVault: marketDeco.baseVault,
    marketEventQueue: marketDeco.eventQueue,
    id: PublicKey.findProgramAddressSync([rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('amm_associated_seed', 'utf-8')], rayV4)[0],
    baseVault: PublicKey.findProgramAddressSync([rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('coin_vault_associated_seed', 'utf-8')], rayV4)[0],
    coinVault: PublicKey.findProgramAddressSync([rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('pc_vault_associated_seed', 'utf-8')], rayV4)[0],
    lpMint: PublicKey.findProgramAddressSync([rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('lp_mint_associated_seed', 'utf-8')], rayV4)[0],
    lpVault: PublicKey.findProgramAddressSync([rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('temp_lp_token_associated_seed', 'utf-8')], rayV4)[0],
    targetOrders: PublicKey.findProgramAddressSync([rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('target_associated_seed', 'utf-8')], rayV4)[0],
    withdrawQueue: PublicKey.findProgramAddressSync([rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('withdraw_associated_seed', 'utf-8')], rayV4)[0],
    openOrders: PublicKey.findProgramAddressSync([rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('open_order_associated_seed', 'utf-8')], rayV4)[0],
	quoteVault: PublicKey.findProgramAddressSync([rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('pc_vault_associated_seed', 'utf-8')], rayV4)[0],
	lookupTableAccount: new PublicKey("11111111111111111111111111111111")
  };
  return poolKeys;
}
async function getMarketInfo(marketId) {
  let marketInfo;
  while(true) {
    marketInfo = await connection.getAccountInfo(marketId);
    if (marketInfo) { break; }
  }
  return marketInfo;
}
async function getDecodedData(marketInfo) {
  return await Market.getLayout(openbookProgram).decode(marketInfo.data);
}
async function getMintData(mint) {
  return await connection.getAccountInfo(mint);
}
async function getDecimals(mintData) {
  return structs.SPL_MINT_LAYOUT.decode(mintData.data).decimals;
}
async function getOwnerAta(mint, publicKey) {
const foundAta = PublicKey.findProgramAddressSync([publicKey.toBuffer(), spl.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], spl.ASSOCIATED_TOKEN_PROGRAM_ID)[0]
return(foundAta) }
function getVaultSigner(marketId, marketDeco) {
  const seeds = [marketId.toBuffer()];
  const seedsWithNonce = seeds.concat(Buffer.from([Number(marketDeco.vaultSignerNonce.toString())]), Buffer.alloc(7));
  return PublicKey.createProgramAddressSync(seedsWithNonce, openbookProgram);
}