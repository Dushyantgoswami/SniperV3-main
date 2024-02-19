import { PublicKey, TransactionInstruction, Transaction, ComputeBudgetProgram, SystemProgram} from '@solana/web3.js';
import { wallet } from './config.mjs';
import { BN } from "bn.js"
import * as spl from "@solana/spl-token"
const rayV4 = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8')

export async function makeSwap(poolKeys, amountIn, minAmountOut, reverse) {
    const programId = rayV4
    const account1 = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")   // token program
    const account2 = poolKeys.id  // amm id  writable
	const account3 = poolKeys.authority  // amm authority
	const account4 = poolKeys.openOrders // amm open orders  writable
	const account5 = poolKeys.targetOrders // amm target orders  writable
    const account6 = poolKeys.baseVault   // pool coin token account  writable  AKA baseVault
    const account7 = poolKeys.quoteVault // pool pc token account  writable   AKA quoteVault
	const account8 = poolKeys.marketProgramId  // serum program id
	const account9 = poolKeys.marketId //   serum market  writable
	const account10 = poolKeys.marketBids // serum bids  writable
    const account11 = poolKeys.marketAsks     // serum asks  writable
    const account12 = poolKeys.marketEventQueue  // serum event queue  writable
	const account13 = poolKeys.marketBaseVault  // serum coin vault  writable     AKA marketBaseVault
	const account14 = poolKeys.marketQuoteVault //   serum pc vault  writable    AKA marketQuoteVault
	const account15 = poolKeys.marketAuthority // serum vault signer       AKA marketAuthority
	let inAmount = amountIn
	let minAmount = minAmountOut
    let account16 = poolKeys.ownerQuoteAta     // user source token account  writable
    let account17 = poolKeys.ownerBaseAta  // user dest token account   writable
	const account18 = wallet.publicKey 		 // user owner (signer)  writable
	if (reverse === true) {
	account16 = poolKeys.ownerBaseAta
	account17 = poolKeys.ownerQuoteAta
 }
	const args = { amountIn: new BN(inAmount), minimumAmountOut: new BN(0) };
	const buffer = Buffer.alloc(16);
	args.amountIn.toArrayLike(Buffer, 'le', 8).copy(buffer, 0);
	args.minimumAmountOut.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
	const prefix = Buffer.from([0x09]);
	const instructionData = Buffer.concat([prefix, buffer]);
    const accountMetas = [
	{pubkey: account1, isSigner: false, isWritable: false},
	{pubkey: account2, isSigner: false, isWritable: true},
	{pubkey: account3, isSigner: false, isWritable: false},
	{pubkey: account4, isSigner: false, isWritable: true},
	{pubkey: account5, isSigner: false, isWritable: true},
	{pubkey: account6, isSigner: false, isWritable: true},
	{pubkey: account7, isSigner: false, isWritable: true},
	{pubkey: account8, isSigner: false, isWritable: false},
	{pubkey: account9, isSigner: false, isWritable: true},
	{pubkey: account10, isSigner: false, isWritable: true},
	{pubkey: account11, isSigner: false, isWritable: true},
	{pubkey: account12, isSigner: false, isWritable: true},
	{pubkey: account13, isSigner: false, isWritable: true},
	{pubkey: account14, isSigner: false, isWritable: true},
	{pubkey: account15, isSigner: false, isWritable: false},
	{pubkey: account16, isSigner: false, isWritable: true},
	{pubkey: account17, isSigner: false, isWritable: true},
	{pubkey: account18, isSigner: true, isWritable: true}]
	//@ts-ignore
	const UNITPRICE = ComputeBudgetProgram.setComputeUnitPrice({microLamports: 111102});
	//@ts-ignore
	const UNITLIMIT = ComputeBudgetProgram.setComputeUnitLimit({units: 100000});
	const createWsolQuoteAta = spl.createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, poolKeys.ownerQuoteAta, wallet.publicKey, poolKeys.quoteMint)
	const createTokenBaseAta = spl.createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, poolKeys.ownerBaseAta, wallet.publicKey, poolKeys.baseMint)
    const swap = new TransactionInstruction({ keys: accountMetas, programId, data: instructionData });
	const closeSol = spl.createCloseAccountInstruction(poolKeys.ownerQuoteAta, wallet.publicKey, wallet.publicKey)
	const closeAta = spl.createCloseAccountInstruction(poolKeys.ownerBaseAta, wallet.publicKey, wallet.publicKey)
 	const transaction = new Transaction();
	if (reverse === false) {
 	transaction.add(UNITLIMIT);
 	transaction.add(UNITPRICE);
 	transaction.add(createWsolQuoteAta);
	transaction.add(SystemProgram.transfer({fromPubkey: wallet.publicKey, toPubkey: poolKeys.ownerQuoteAta, lamports: amountIn }), spl.createSyncNativeInstruction(poolKeys.ownerQuoteAta)); // 10000000 lamports will send 0.01 sol to the ata
	transaction.add(createTokenBaseAta)
	transaction.add(swap)
	transaction.add(closeSol)
 }
	if (reverse === true) {
 	transaction.add(UNITLIMIT);
 	transaction.add(UNITPRICE);
 	transaction.add(createWsolQuoteAta);
	transaction.add(swap)
	transaction.add(closeSol)
	transaction.add(closeAta)
	}
	return(transaction)
	}