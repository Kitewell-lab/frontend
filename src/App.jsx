import { useState, useCallback, useEffect } from "react";
import {
  checkFreighterInstalled,
  connectFreighterWallet,
  sendPaymentWithFreighter,
  changeTrustWithFreighter,
} from "./freighter";
import {
  fundWithFriendbot,
  getAccountBalances,
  getTransactions,
  explorerAccountUrl,
  explorerTxUrl,
} from "./stellar";
import { fetchHealth, fetchNetworkInfo } from "./api";
import "./App.css";

const TABS = ["Wallet", "Fund", "Assets", "Send", "History", "Lab"];

export default function App() {
  const [activeTab, setActiveTab] = useState("Wallet");
  const [publicKey, setPublicKey] = useState(null);
  const [freighterInstalled, setFreighterInstalled] = useState(null);
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState("");
  const [toast, setToast] = useState(null);
  const [sendForm, setSendForm] = useState({ destination: "", amount: "", memo: "" });
  const [trustForm, setTrustForm] = useState({ code: "", issuer: "", limit: "1000000" });
  const [labInfo, setLabInfo] = useState(null);
  const [labError, setLabError] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4200);
  };

  const xlmBalance = balances.find((b) => b.isNative)?.balance ?? null;

  useEffect(() => {
    checkFreighterInstalled().then(setFreighterInstalled);
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!publicKey) return;
    setLoading("balance");
    try {
      const next = await getAccountBalances(publicKey);
      setBalances(next);
    } catch {
      setBalances([]);
      showToast("Account not found on Testnet yet. Fund it with Friendbot.", "error");
    } finally {
      setLoading("");
    }
  }, [publicKey]);

  const handleConnect = async () => {
    setLoading("connect");
    try {
      const address = await connectFreighterWallet();
      setPublicKey(address);
      setBalances([]);
      setTransactions([]);
      showToast("Freighter connected.");
      try {
        const next = await getAccountBalances(address);
        setBalances(next);
      } catch {
        /* unfunded until Friendbot */
      }
    } catch (e) {
      showToast(e.message || "Failed to connect Freighter.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleDisconnect = () => {
    setPublicKey(null);
    setBalances([]);
    setTransactions([]);
    showToast("Disconnected.");
  };

  const handleFund = async () => {
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    setLoading("fund");
    try {
      await fundWithFriendbot(publicKey);
      const next = await getAccountBalances(publicKey);
      setBalances(next);
      showToast("Funded with Testnet XLM via Friendbot.");
    } catch (e) {
      showToast(e.message || "Funding failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleTrust = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    if (!trustForm.code || !trustForm.issuer) {
      return showToast("Asset code and issuer are required.", "error");
    }
    setLoading("trust");
    const code = trustForm.code.toUpperCase();
    try {
      await changeTrustWithFreighter(
        publicKey,
        trustForm.code,
        trustForm.issuer,
        trustForm.limit || "1000000"
      );
      const next = await getAccountBalances(publicKey);
      setBalances(next);
      setTrustForm({ code: "", issuer: "", limit: "1000000" });
      showToast(`Trustline for ${code} submitted.`);
    } catch (err) {
      showToast(err.message || "Change trust failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    if (!sendForm.destination || !sendForm.amount) {
      return showToast("Destination and amount are required.", "error");
    }
    setLoading("send");
    try {
      const result = await sendPaymentWithFreighter(
        publicKey,
        sendForm.destination,
        sendForm.amount,
        sendForm.memo
      );
      const next = await getAccountBalances(publicKey);
      setBalances(next);
      setSendForm({ destination: "", amount: "", memo: "" });
      showToast(`Payment submitted · ${result.hash.slice(0, 12)}…`);
    } catch (err) {
      showToast(err.message || "Payment failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleHistory = async () => {
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    setLoading("history");
    try {
      const txs = await getTransactions(publicKey);
      setTransactions(txs);
      if (txs.length === 0) showToast("No payments yet.", "info");
    } catch {
      showToast("Could not load payment history.", "error");
    } finally {
      setLoading("");
    }
  };

  const requireWallet = !publicKey;

  const loadLabInfo = async () => {
    setLoading("lab");
    setLabError(null);
    try {
      const [health, network] = await Promise.all([fetchHealth(), fetchNetworkInfo()]);
      setLabInfo({ health, network });
    } catch (e) {
      setLabInfo(null);
      setLabError(
        e.message ||
          "Backend offline. Start it with: npm run dev:backend"
      );
    } finally {
      setLoading("");
    }
  };

  return (
    <div className="app">
      <div className="aurora" aria-hidden="true" />

      {toast && <div className={`toast toast--${toast.type}`}>{toast.message}</div>}

      <header className="header">
        <div className="header__brand">
          <KitewellMark />
          <div className="header__titles">
            <span className="header__name">Kitewell</span>
            <span className="header__tag">Stellar Testnet lab</span>
          </div>
        </div>
        <span className="badge">Testnet</span>
      </header>

      <main className="main">
        <section className="hero-card">
          {publicKey ? (
            <>
              <div className="hero-card__status">
                <span className="status-dot" />
                Connected via Freighter
              </div>
              <div className="hero-card__balance">
                <span className="eyebrow">XLM balance</span>
                <span className="hero-card__amount">
                  {xlmBalance !== null
                    ? `${parseFloat(xlmBalance).toLocaleString(undefined, { maximumFractionDigits: 7 })} XLM`
                    : "—"}
                  <button
                    className="icon-btn"
                    onClick={refreshBalances}
                    disabled={loading === "balance"}
                    title="Refresh balances"
                    type="button"
                  >
                    {loading === "balance" ? <Spinner size={14} /> : "↻"}
                  </button>
                </span>
              </div>
              <div className="hero-card__key">
                <span className="eyebrow">Public key</span>
                <code>{shorten(publicKey)}</code>
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(publicKey);
                    showToast("Address copied.");
                  }}
                  title="Copy"
                >
                  ⎘
                </button>
                <a
                  className="text-link"
                  href={explorerAccountUrl(publicKey)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Explorer ↗
                </a>
              </div>
              {balances.filter((b) => !b.isNative).length > 0 && (
                <div className="asset-chips">
                  {balances
                    .filter((b) => !b.isNative)
                    .slice(0, 6)
                    .map((b) => (
                      <span key={b.key} className="chip">
                        {parseFloat(b.balance).toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}{" "}
                        {b.code}
                      </span>
                    ))}
                </div>
              )}
            </>
          ) : (
            <div className="hero-card__empty">
              <p className="hero-card__lead">No wallet connected</p>
              <p className="muted">
                Connect Freighter to fund, trust assets, and send Testnet XLM.
              </p>
            </div>
          )}
        </section>

        <nav className="tabs" aria-label="Lab sections">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`tab ${activeTab === t ? "tab--active" : ""}`}
              onClick={() => {
                setActiveTab(t);
                if (t === "History") handleHistory();
                if (t === "Lab") loadLabInfo();
                if ((t === "Wallet" || t === "Assets") && publicKey) refreshBalances();
              }}
            >
              {t}
            </button>
          ))}
        </nav>

        <section className="panel">
          {activeTab === "Wallet" && (
            <div className="section">
              <h2>Connect wallet</h2>
              {freighterInstalled === false && (
                <div className="info-box info-box--warning">
                  <span className="eyebrow">Freighter not detected</span>
                  <p className="muted">
                    Install the{" "}
                    <a href="https://www.freighter.app/" target="_blank" rel="noreferrer">
                      Freighter extension
                    </a>{" "}
                    and switch it to <strong>Testnet</strong>.
                  </p>
                </div>
              )}
              {requireWallet ? (
                <>
                  <p className="muted">
                    Kitewell requests access with Freighter&apos;s{" "}
                    <code>setAllowed</code> / <code>getAddress</code> APIs. Keys never leave
                    the extension.
                  </p>
                  <button
                    className="btn btn--primary"
                    type="button"
                    onClick={handleConnect}
                    disabled={loading === "connect" || freighterInstalled === false}
                  >
                    {loading === "connect" ? (
                      <>
                        <Spinner /> Connecting…
                      </>
                    ) : (
                      "Connect Freighter"
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="info-box">
                    <span className="eyebrow">Connected address</span>
                    <code>{publicKey}</code>
                  </div>
                  <button className="btn btn--secondary" type="button" onClick={handleDisconnect}>
                    Disconnect
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === "Fund" && (
            <div className="section">
              <h2>Fund with Friendbot</h2>
              <p className="muted">
                Activate the account on Testnet and receive free XLM. Mainnet is never used.
              </p>
              {publicKey && (
                <div className="info-box">
                  <span className="eyebrow">Funding address</span>
                  <code>{publicKey}</code>
                </div>
              )}
              <button
                className="btn btn--primary"
                type="button"
                onClick={handleFund}
                disabled={loading === "fund" || requireWallet}
              >
                {loading === "fund" ? (
                  <>
                    <Spinner /> Funding…
                  </>
                ) : (
                  "Request Friendbot XLM"
                )}
              </button>
            </div>
          )}

          {activeTab === "Assets" && (
            <div className="section">
              <h2>Balances & trustlines</h2>
              <p className="muted">
                View holdings and open a trustline with Freighter{" "}
                <code>signTransaction</code>.
              </p>

              {balances.length > 0 ? (
                <ul className="balance-list">
                  {balances.map((b) => (
                    <li key={b.key} className="balance-row">
                      <div>
                        <strong>{b.code}</strong>
                        {!b.isNative && (
                          <span className="muted balance-row__issuer">
                            {shorten(b.issuer)}
                          </span>
                        )}
                      </div>
                      <span>
                        {parseFloat(b.balance).toLocaleString(undefined, {
                          maximumFractionDigits: 7,
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  {requireWallet
                    ? "Connect a wallet to load balances."
                    : "No balances yet — fund the account first."}
                </p>
              )}

              <form onSubmit={handleTrust} className="form">
                <h3 className="subhead">Add trustline</h3>
                <label className="label">Asset code</label>
                <input
                  className="input"
                  value={trustForm.code}
                  onChange={(e) => setTrustForm({ ...trustForm, code: e.target.value })}
                  placeholder="USDC"
                  maxLength={12}
                  required
                />
                <label className="label">Issuer</label>
                <input
                  className="input"
                  value={trustForm.issuer}
                  onChange={(e) => setTrustForm({ ...trustForm, issuer: e.target.value })}
                  placeholder="G…"
                  required
                />
                <label className="label">Limit</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="any"
                  value={trustForm.limit}
                  onChange={(e) => setTrustForm({ ...trustForm, limit: e.target.value })}
                />
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={loading === "trust" || requireWallet}
                >
                  {loading === "trust" ? (
                    <>
                      <Spinner /> Signing…
                    </>
                  ) : (
                    "Sign changeTrust"
                  )}
                </button>
              </form>
            </div>
          )}

          {activeTab === "Send" && (
            <div className="section">
              <h2>Send XLM</h2>
              <p className="muted">
                Builds a payment op, signs in Freighter, then submits to Horizon Testnet.
              </p>
              <form onSubmit={handleSend} className="form">
                <label className="label">Destination</label>
                <input
                  className="input"
                  type="text"
                  placeholder="G…"
                  value={sendForm.destination}
                  onChange={(e) => setSendForm({ ...sendForm, destination: e.target.value })}
                  required
                />
                <label className="label">Amount (XLM)</label>
                <input
                  className="input"
                  type="number"
                  step="0.0000001"
                  min="0.0000001"
                  placeholder="e.g. 10"
                  value={sendForm.amount}
                  onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                  required
                />
                <label className="label">Memo (optional)</label>
                <input
                  className="input"
                  type="text"
                  maxLength={28}
                  placeholder="Up to 28 characters"
                  value={sendForm.memo}
                  onChange={(e) => setSendForm({ ...sendForm, memo: e.target.value })}
                />
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={loading === "send" || requireWallet}
                >
                  {loading === "send" ? (
                    <>
                      <Spinner /> Signing in Freighter…
                    </>
                  ) : (
                    "Sign & send"
                  )}
                </button>
              </form>
            </div>
          )}

          {activeTab === "Lab" && (
            <div className="section">
              <div className="section__row">
                <h2>Lab stack</h2>
                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={loadLabInfo}
                  disabled={loading === "lab"}
                >
                  {loading === "lab" ? (
                    <>
                      <Spinner /> Checking…
                    </>
                  ) : (
                    "Refresh"
                  )}
                </button>
              </div>
              <p className="muted">
                Kitewell is three repos: <code>frontend</code> · <code>backend</code> ·{" "}
                <code>contract</code>. This panel reads the local API and contract config.
              </p>
              {labError && (
                <div className="info-box info-box--warning">
                  <span className="eyebrow">Backend</span>
                  <p className="muted">{labError}</p>
                </div>
              )}
              {labInfo && (
                <>
                  <div className="info-box">
                    <span className="eyebrow">Backend health</span>
                    <code>
                      {labInfo.health.service} · {labInfo.health.network} · ok=
                      {String(labInfo.health.ok)}
                    </code>
                  </div>
                  <div className="info-box">
                    <span className="eyebrow">Horizon</span>
                    <code>{labInfo.network.horizonUrl}</code>
                  </div>
                  <div className="info-box">
                    <span className="eyebrow">Soroban · kitewell</span>
                    <code>
                      {labInfo.network.contract?.kitewell ||
                        "Not deployed yet — see the contract repo README"}
                    </code>
                    <p className="muted" style={{ marginTop: 6 }}>
                      Status: {labInfo.network.contract?.status}
                    </p>
                  </div>
                </>
              )}
              {!labInfo && !labError && (
                <p className="muted">Open this tab to probe the backend.</p>
              )}
            </div>
          )}

          {activeTab === "History" && (
            <div className="section">
              <div className="section__row">
                <h2>Payment history</h2>
                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={handleHistory}
                  disabled={loading === "history" || requireWallet}
                >
                  {loading === "history" ? (
                    <>
                      <Spinner /> Loading…
                    </>
                  ) : (
                    "Refresh"
                  )}
                </button>
              </div>
              {transactions.length > 0 ? (
                <div className="tx-list">
                  {transactions.map((tx) => {
                    const isOutgoing = tx.from === publicKey;
                    return (
                      <div
                        key={tx.id}
                        className={`tx-item ${isOutgoing ? "tx-item--out" : "tx-item--in"}`}
                      >
                        <div className="tx-item__direction">
                          {isOutgoing ? "Sent" : "Received"}
                        </div>
                        <div className="tx-item__amount">
                          {parseFloat(tx.amount).toLocaleString()} {tx.asset_code || "XLM"}
                        </div>
                        <div className="tx-item__addr muted">
                          {isOutgoing
                            ? `To ${shorten(tx.to)}`
                            : `From ${shorten(tx.from)}`}
                        </div>
                        <a
                          href={explorerTxUrl(tx.transaction_hash)}
                          target="_blank"
                          rel="noreferrer"
                          className="tx-item__link"
                        >
                          Explorer ↗
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !loading && <p className="muted">No payments yet.</p>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <strong>Kitewell</strong> · Stellar Testnet · Freighter ·{" "}
        <a
          href="https://github.com/ayyldCem-0/frontend"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}

function shorten(key) {
  if (!key || key.length < 12) return key;
  return `${key.slice(0, 6)}…${key.slice(-6)}`;
}

function KitewellMark() {
  return (
    <svg className="mark" width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
      <rect width="36" height="36" rx="10" fill="#121826" />
      <path d="M18 5 L31 18 L18 31 L5 18 Z" fill="#7DD3FC" />
      <path d="M18 11 L25 18 L18 25 L11 18 Z" fill="#0369A1" />
    </svg>
  );
}

function Spinner({ size = 16 }) {
  return (
    <svg
      className="spinner"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
