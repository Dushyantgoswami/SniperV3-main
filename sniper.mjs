import { PublicKey } from '@solana/web3.js';
import { connection, wallet } from './config.mjs';
import * as spl from "@solana/spl-token"
import * as BL from "@solana/buffer-layout"
import { prelimTokenChecks } from "./prelimChecks.mjs"
import BN from "bn.js";
import { Metaplex } from "@metaplex-foundation/js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { derivePoolKeys } from "./poolKeys.mjs"
import {makeSwap} from "./swapTx2.mjs"
const rayV4 = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8')
const rayFee = new PublicKey("7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5")
const swappedInTokens = new Set();
const metaplex = Metaplex.make(connection)

const USER_SETTINGS_LAMPORTS_IN = 100000;
const USER_SETTINGS_PROFIT_MULTIPLIER_SWAP_OUT = 1.1;

//START SNIPER
Promise.all([ammLoop()])

async function ammLoop() {
  console.log("listening to raydium pool logs...");
  connection.onLogs(rayFee, async (logObj) => {
    if (!logObj.err) {
      for (const log of logObj["logs"]) {
        if (log.includes("ray_log")) {
          const rayLogSplit = log.split(" ");
          const rayLog = rayLogSplit[rayLogSplit.length - 1].replace("'", "");
          const logData = Buffer.from(rayLog, "base64");
          if (logData.length === 75) {
            const market = new PublicKey(logData.subarray(43, 75));
            const pool = PublicKey.findProgramAddressSync([rayV4.toBuffer(), market.toBuffer(), Buffer.from('amm_associated_seed', 'utf-8')], rayV4)['publicKey'];
            const openTimeMs = new BL.NearUInt64().decode(new Uint8Array(logData.subarray(1, 9))) * 1000;
            let timeDiff = openTimeMs - Date.now();
            console.log(`time until pool opens: ${timeDiff / 1000} seconds`)
            if (timeDiff < 1000 * 60 * 30) { // 30 minutes
              const poolKeys = await derivePoolKeys(market)
              //const checks = await prelimTokenChecks(poolKeys)      Uncomment these 3 lines to add optional preliminay token checks (anti-rug)
              //	if (checks === true) {                         //
              await executeSwaps(poolKeys, timeDiff, 0);
			  //	}                                             //
            }
          }
        }
      }
    }
  }, "singleGossip")
}

async function executeSwaps(poolKeys, timeDiff, priceIn) {
  // SWAP IN
  const swp = await makeSwap(poolKeys, USER_SETTINGS_LAMPORTS_IN, priceIn, false)
  await connection.sendTransaction(swp, [wallet], {
    skipPreflight: true,
    preflightCommitment: "finalized"
  })
  let symbol = poolKeys.baseMint.toString().slice(0, 5)
  symbol = await getSymbol(poolKeys.baseMint.toString())
  console.log(`swapped in ${symbol}, monitoring...`)
  swappedInTokens.add(poolKeys.baseMint.toString())
  let hasSwappedOut = false
  //START MONITORING SWAP GAINS
  const mon = setInterval(async () => {
    let monitorRes = await monitor(poolKeys, USER_SETTINGS_LAMPORTS_IN);
    console.log(`${symbol}: ${monitorRes.swappedInAmount}, current lamports value: ${Number(monitorRes.currentLamports.toFixed(0))}, swap out?: ${monitorRes.swapOut}`)
    if (monitorRes.swapOut === true) {
      //SWAP OUT
      const swp = await makeSwap(poolKeys, monitorRes.swappedInAmount, 0, true)
      const sent = await connection.sendTransaction(swp, [wallet], {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      })
      console.log(`swapped out ${monitorRes.swappedInAmount} ${symbol} for ${Number(monitorRes.currentLamports.toFixed(0))} lamports, tx: ${sent}, closing monitor.`)
      hasSwappedOut = true
      clearInterval(mon)
    }
  }, 1000)
}

async function getSymbol(mint) {
  try {
    let pda = metaplex.nfts().pdas().metadata({
      mint: new PublicKey(mint)
    });
    const mData = await Metadata.fromAccountAddress(connection, pda);
    let symbol = mData.data.symbol.toString().replaceAll('\x00', '');
    return (symbol)
  } catch {
    return ("N/A")
  }
}

async function monitor(poolKeys, USER_SETTINGS_LAMPORTS_IN) {
  const [baseVaultTotal, quoteVaultTotal, ownerVaultTotal] = await Promise.all([
    getUpdatedTokenAmount(poolKeys.baseVault),
    getUpdatedTokenAmount(poolKeys.quoteVault),
    getUpdatedTokenAmount(poolKeys.ownerBaseAta),
  ]);
  let swapOut = false
  const swapMath = Number(quoteVaultTotal.toString()) / Number(baseVaultTotal.toString());
  const currentValueSol = (Number(ownerVaultTotal) * swapMath) / Math.pow(10, 9);
  const currentValueLamports = Number(ownerVaultTotal) * swapMath
  const initialValueSol = Number(USER_SETTINGS_LAMPORTS_IN) / Math.pow(10, 9);
  if (currentValueSol >= initialValueSol * USER_SETTINGS_PROFIT_MULTIPLIER_SWAP_OUT) { swapOut = true }
  return ({
    currentLamports: currentValueLamports,
    swappedInAmount: ownerVaultTotal,
    swapOut: swapOut
  })
}

async function getUpdatedTokenAmount(ata) {
  let accountInfo = null;
  while (accountInfo === null) {
    accountInfo = await connection.getAccountInfo(ata, {
      commitment: "processed",
      dataSlice: {
        offset: 64,
        length: 8
      }
    });
    if (accountInfo === null) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  const balance = new BL.NearUInt64().decode(new Uint8Array((accountInfo).data.subarray(0, 8)));
  return balance;
}