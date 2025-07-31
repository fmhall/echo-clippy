import React, { useState } from "react";
import { useSharedState } from "../contexts/SharedStateContext";
import { EchoModelTable, LocalModelTable } from "./model-settings";

export const SettingsModel: React.FC = () => {
  const { settings } = useSharedState();
  const [activeTab, setActiveTab] = useState<"echo" | "local">("echo");

  // Determine which model is actually selected (Echo takes precedence)
  const hasEchoModel = !!settings.selectedEchoModel;
  const hasApiKey = !!settings.echoApiKey;

  return (
    <div>
      {/* <p style={{ marginBottom: "20px" }}>
        Choose between cloud-based AI models (Echo) or locally downloaded models. 
        Echo models require an API key but offer powerful capabilities without downloads.
        {" "}
        <a
          href="https://github.com/felixrieseberg/clippy?tab=readme-ov-file#downloading-more-models"
          target="_blank"
        >
          More information.
        </a>
      </p> */}

      {/* Tab Navigation */}
      <div className="tabs" style={{ display: "flex", marginBottom: "20px" }}>
        <button
          className={`tab ${activeTab === "echo" ? "active" : ""}`}
          onClick={() => setActiveTab("echo")}
          style={{
            padding: "8px 16px",
            marginRight: "4px",
            border: "1px solid #ccc",
            backgroundColor: activeTab === "echo" ? "#e0e0e0" : "#f5f5f5",
            cursor: "pointer",
            borderBottom:
              activeTab === "echo" ? "2px solid #0066cc" : "1px solid #ccc",
          }}
        >
          🌐 Echo Models {hasEchoModel && hasApiKey && "(Active)"}
        </button>
        <button
          className={`tab ${activeTab === "local" ? "active" : ""}`}
          onClick={() => setActiveTab("local")}
          style={{
            padding: "8px 16px",
            border: "1px solid #ccc",
            backgroundColor: activeTab === "local" ? "#e0e0e0" : "#f5f5f5",
            cursor: "pointer",
            borderBottom:
              activeTab === "local" ? "2px solid #0066cc" : "1px solid #ccc",
          }}
        >
          💾 Local Models {!hasEchoModel && "(Active)"}
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "echo" ? <EchoModelTable /> : <LocalModelTable />}
      </div>
    </div>
  );
};
