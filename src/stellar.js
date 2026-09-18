import * as StellarSdk from "@stellar/stellar-sdk";
import { fetchAccountViaApi, fetchPaymentsViaApi } from "./api";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const NETWORK = "TESTNET";
export const EXPLORER_BASE = "https://stellar.expert/explorer/testnet";

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

export function explorerAccountUrl(publicKey) {
  return `${EXPLORER_BASE}/account/${publicKey}`;
}

export function explorerTxUrl(hash) {
  return `${EXPLORER_BASE}/tx/${hash}`;
}

export async function fundWithFriendbot(publicKey) {
  const response = await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      text.includes("already") || response.status === 400
        ? "Account may already be funded. Refresh balances instead."
        : "Friendbot funding failed. Try again in a moment."
    );
  }
  return response.json();
}

function mapHorizonBalances(account) {
  return account.balances.map((b) => {
    if (b.asset_type === "native") {
      return {
        key: "native",
        code: "XLM",
        issuer: null,
        balance: b.balance,
        limit: null,
        isNative: true,
      };
    }
    return {
      key: `${b.asset_code}:${b.asset_issuer}`,
      code: b.asset_code,
      issuer: b.asset_issuer,
      balance: b.balance,
      limit: b.limit,
      isNative: false,
    };
  });
}

/** Prefer Helios backend; fall back to direct Horizon. */
export async function getAccountBalances(publicKey) {
  try {
    const data = await fetchAccountViaApi(publicKey);
    return data.balances;
  } catch {
    const account = await server.loadAccount(publicKey);
    return mapHorizonBalances(account);
  }
}

export async function getAccountDetails(publicKey) {
  try {
    return await fetchAccountViaApi(publicKey);
  } catch {
    const account = await server.loadAccount(publicKey);
    return {
      id: account.id,
      sequence: account.sequenceNumber(),
      subentryCount: account.subentry_count,
      thresholds: account.thresholds,
      balances: mapHorizonBalances(account),
      explorerUrl: explorerAccountUrl(publicKey),
    };
  }
}

export async function getBalance(publicKey) {
  const balances = await getAccountBalances(publicKey);
  const xlm = balances.find((b) => b.isNative);
  return xlm ? xlm.balance : "0";
}

export async function getTransactions(publicKey, limit = 15) {
  try {
    return await fetchPaymentsViaApi(publicKey, limit);
  } catch {
    const payments = await server
      .payments()
      .forAccount(publicKey)
      .limit(limit)
      .order("desc")
      .call();

    return payments.records
      .filter((p) => p.type === "payment")
      .map((p) => ({
        id: p.id,
        from: p.from,
        to: p.to,
        amount: p.amount,
        asset_type: p.asset_type,
        asset_code: p.asset_code || "XLM",
        transaction_hash: p.transaction_hash,
        created_at: p.created_at,
      }));
  }
}
