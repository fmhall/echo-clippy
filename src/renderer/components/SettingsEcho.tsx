import { useState, useEffect } from "react";
import { useSharedState } from "../contexts/SharedStateContext";
import { clippyApi } from "../clippyApi";
import { createEchoPaymentLink, getEchoBalance } from "./EchoUtils";
import { Balance } from "@zdql/echo-typescript-sdk";

export function SettingsEcho() {
  const sharedState = useSharedState();
  const [inputApiKey, setInputApiKey] = useState<string>("");
  const [balance, setBalance] = useState<Balance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState<boolean>(false);
  const [creditAmount, setCreditAmount] = useState<string>("10");
  const apiKey = sharedState.settings.echoApiKey || "";
  const baseUrl =
    sharedState.settings.echoBaseUrl || "https://echo.merit.systems";
  const appId =
    sharedState.settings.echoAppId || "81c9fab2-d93b-49e9-8a4e-04229e7fc4d9";
  const isConnected = !!apiKey;

  // Load API key into input field and handle migration from localStorage
  useEffect(() => {
    if (apiKey) {
      setInputApiKey(apiKey);
    } else {
      // Check for migration from localStorage
      const storedApiKey = localStorage.getItem("echo_api_key");
      if (storedApiKey) {
        // Migrate to state manager and clean up localStorage
        clippyApi.setState("settings.echoApiKey", storedApiKey);
        localStorage.removeItem("echo_api_key");
        setInputApiKey(storedApiKey);
      }
    }
  }, [apiKey]);

  const handleSaveApiKey = () => {
    if (inputApiKey.trim()) {
      clippyApi.setState("settings.echoApiKey", inputApiKey.trim());
    }
  };

  const handleClearApiKey = () => {
    clippyApi.setState("settings.echoApiKey", undefined);
    setInputApiKey("");
  };

  const handleGetApiKey = () => {
    const authUrl = `${baseUrl}/cli-auth?appId=${appId}`;
    window.open(authUrl, "_blank");
  };

  const handleBuyCredits = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!apiKey) return;

    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      console.error("Invalid amount:", creditAmount);
      return;
    }

    setIsCreatingPayment(true);
    try {
      await createEchoPaymentLink(apiKey, { amount }, baseUrl);
    } catch (error) {
      console.error("Failed to create payment link:", error);
      // You might want to show a user-friendly error message here
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // Load balance when API key changes
  useEffect(() => {
    if (apiKey) {
      setIsLoadingBalance(true);
      getEchoBalance(apiKey, baseUrl)
        .then((balance) => {
          console.log("Balance:", balance);
          setBalance(balance);
        })
        .catch((error) => {
          console.error("Failed to load balance:", error);
          setBalance(null);
        })
        .finally(() => {
          setIsLoadingBalance(false);
        });
    } else {
      setBalance(null);
    }
  }, [apiKey, baseUrl]);

  // Refresh balance after payment creation
  useEffect(() => {
    if (!isCreatingPayment && apiKey && balance) {
      let attempts = 0;
      const maxAttempts = 50;
      const originalBalance = balance.balance;

      const refreshInterval = setInterval(async () => {
        attempts++;

        try {
          const newBalance = await getEchoBalance(apiKey, baseUrl);
          console.log(`Balance refresh attempt ${attempts}:`, newBalance);

          // If balance changed or we've reached max attempts, stop refreshing
          if (
            newBalance.balance !== originalBalance ||
            attempts >= maxAttempts
          ) {
            setBalance(newBalance);
            clearInterval(refreshInterval);
          }
        } catch (error) {
          console.error(`Balance refresh attempt ${attempts} failed:`, error);
          if (attempts >= maxAttempts) {
            clearInterval(refreshInterval);
          }
        }
      }, 500);

      return () => clearInterval(refreshInterval);
    }
  }, [isCreatingPayment, apiKey, baseUrl, balance]);

  return (
    <div className="settings-section">
      <h3>Echo Cloud AI</h3>
      <p>
        Connect to Echo for enhanced AI capabilities with cloud-based models
        like GPT-4.
      </p>

      <div className="field-row">
        <label>Status:</label>
        <span style={{ color: isConnected ? "green" : "red" }}>
          {isConnected ? "✓ Connected" : "✗ Not connected"}
        </span>
      </div>

      {isConnected && (
        <>
          <div className="field-row">
            <label>API Key:</label>
            <span style={{ fontFamily: "monospace", fontSize: "10px" }}>
              {apiKey.substring(0, 8)}...{apiKey.substring(apiKey.length - 4)}
            </span>
          </div>
          <div className="field-row">
            <label>Balance:</label>
            <span style={{ fontFamily: "monospace", fontSize: "10px" }}>
              {isLoadingBalance
                ? "Loading..."
                : `$${balance?.balance.toFixed(2) || "0.00"}`}
            </span>
          </div>
          <div style={{ marginTop: "8px" }}>
            <form
              onSubmit={handleBuyCredits}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <label style={{ fontSize: "12px" }}>$</label>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                min="1"
                max="1000"
                step="1"
                placeholder="10"
                style={{
                  width: "60px",
                  textAlign: "center",
                  fontSize: "12px",
                }}
                disabled={isCreatingPayment}
              />
              <button
                type="submit"
                disabled={
                  isCreatingPayment ||
                  !creditAmount ||
                  parseFloat(creditAmount) <= 0
                }
              >
                {isCreatingPayment ? "Creating..." : "Buy Credits"}
              </button>
            </form>
          </div>
        </>
      )}

      <div>
        {!isConnected ? (
          <div>
            <button onClick={handleGetApiKey} style={{ marginBottom: "8px" }}>
              Get API Key from Echo
            </button>
            <p style={{ fontSize: "11px", color: "#666", margin: "4px 0" }}>
              This will open Echo in your browser where you can generate an API
              key.
            </p>

            <div className="field-row" style={{ marginTop: "8px" }}>
              <label>API Key:</label>
              <input
                type="password"
                value={inputApiKey}
                onChange={(e) => setInputApiKey(e.target.value)}
                placeholder="Paste your Echo API key here"
                style={{ width: "200px", marginRight: "8px" }}
              />
              <button onClick={handleSaveApiKey} disabled={!inputApiKey.trim()}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button onClick={handleClearApiKey}>Disconnect</button>
            <button
              onClick={() => window.open(`${baseUrl}/apps/${appId}`, "_blank")}
              style={{ marginLeft: "8px" }}
            >
              Open Dashboard
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: "16px", fontSize: "12px", color: "#666" }}>
        <p>
          Echo provides access to advanced AI models in the cloud. When
          connected, you can choose to use either local models or Echo's cloud
          models.
        </p>
        <p>
          Your API key is stored locally and used to authenticate with Echo's
          services.
        </p>
      </div>
    </div>
  );
}
