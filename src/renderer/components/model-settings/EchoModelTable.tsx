import React, { useState, useMemo } from "react";
import { Column, TableView } from "../TableView";
import { useSharedState } from "../../contexts/SharedStateContext";
import { clippyApi } from "../../clippyApi";
import { EchoModel, EchoModelName } from "../../../echoModels";
import { getActiveModel } from "../../../helpers/model-selection-helpers";

export const EchoModelTable: React.FC = () => {
  const { echoModels, settings } = useSharedState();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const columns: Array<Column> = [
    { key: "selected", header: "✓", width: 20 },
    { key: "name", header: "Model Name", width: 150 },
    { key: "maxTokens", header: "Max Tokens", width: 70 },
    { key: "inputCost", header: "In $/M", width: 60 },
    { key: "outputCost", header: "Out $/M", width: 60 },
    { key: "provider", header: "Provider", width: 100 },
  ];

  // Convert echo models to table data
  const { modelKeys, data } = useMemo(() => {
    console.log("EchoModelTable: echoModels data:", echoModels);
    console.log(
      "EchoModelTable: echoModels keys:",
      Object.keys(echoModels || {}),
    );

    const keys = Object.keys(echoModels || {}) as EchoModelName[];
    const tableData = keys.map((modelKey) => {
      const model = echoModels[modelKey];
      console.log("EchoModelTable: Processing model:", modelKey, model);

      if (!model) {
        console.warn("EchoModelTable: Model data is missing for:", modelKey);
        return {
          selected: "",
          name: modelKey,
          maxTokens: "N/A",
          inputCost: "N/A",
          outputCost: "N/A",
          provider: "Unknown",
        };
      }

      return {
        selected: modelKey === settings.selectedEchoModel ? "✓" : "",
        name: modelKey,
        maxTokens: model.max_tokens?.toLocaleString() || "N/A",
        inputCost: model.input_cost_per_token
          ? `$${(model.input_cost_per_token * 1000000).toFixed(2)}`
          : "N/A",
        outputCost: model.output_cost_per_token
          ? `$${(model.output_cost_per_token * 1000000).toFixed(2)}`
          : "N/A",
        provider: (model as any).litellm_provider || "OpenAI",
      };
    });

    console.log("EchoModelTable: Final table data:", tableData);

    // If no data, provide some test data to verify table is working
    if (tableData.length === 0) {
      console.log("EchoModelTable: No data found, providing test data");
      return {
        modelKeys: ["gpt-4o-mini", "gpt-4o", "claude-3-5-sonnet"],
        data: [
          {
            selected: "",
            name: "gpt-4o-mini",
            maxTokens: "16,384",
            inputCost: "$0.15",
            outputCost: "$0.60",
            provider: "OpenAI",
          },
          {
            selected: "",
            name: "gpt-4o",
            maxTokens: "16,384",
            inputCost: "$2.50",
            outputCost: "$10.00",
            provider: "OpenAI",
          },
          {
            selected: "",
            name: "claude-3-5-sonnet",
            maxTokens: "8,192",
            inputCost: "$3.00",
            outputCost: "$15.00",
            provider: "Anthropic",
          },
        ],
      };
    }

    return { modelKeys: keys, data: tableData };
  }, [echoModels, settings.selectedEchoModel]);

  // Get selected model details
  const selectedModel = modelKeys[selectedIndex];
  const selectedModelData = selectedModel ? echoModels[selectedModel] : null;
  const isCurrentlySelected = selectedModel === settings.selectedEchoModel;
  const hasApiKey = !!settings.echoApiKey;

  const handleRowSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleSelectModel = async () => {
    if (selectedModel) {
      await clippyApi.setState("settings.selectedEchoModel", selectedModel);
    }
  };

  const handleClearSelection = async () => {
    await clippyApi.setState("settings.selectedEchoModel", undefined);
  };

  const openEchoSettings = () => {
    // This would navigate to Echo settings tab if we had that
    console.log("Navigate to Echo settings");
  };

  if (!hasApiKey) {
    return (
      <div>
        <div
          className="sunken-panel"
          style={{
            padding: "20px",
            textAlign: "center",
            backgroundColor: "#f0f0f0",
            marginBottom: "20px",
          }}
        >
          <h3>Echo API Key Required</h3>
          <p>
            To use Echo models, you need to configure your API key in the Echo
            settings.
          </p>
          <button
            onClick={openEchoSettings}
            style={{ marginTop: "10px", padding: "8px 16px" }}
          >
            Configure Echo Settings
          </button>
        </div>

        <div style={{ opacity: 0.5 }}>
          <h4>Available Echo Models (Preview)</h4>
          <TableView
            columns={columns}
            data={data}
            onRowSelect={() => {}} // Disabled
            initialSelectedIndex={0}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <p>
          <strong>Cloud AI Models</strong> - Powered by Echo API
        </p>
        <p style={{ fontSize: "12px", color: "#666" }}>
          These models run in the cloud and don't require local downloads. Usage
          is charged per token based on the model's pricing.
        </p>
      </div>

      <TableView
        columns={columns}
        data={data}
        onRowSelect={handleRowSelect}
        initialSelectedIndex={selectedIndex}
        style={{ maxHeight: "200px", overflow: "auto" }}
      />

      {selectedModelData && (
        <div
          className="model-details sunken-panel"
          style={{ marginTop: "20px", padding: "15px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <strong>{selectedModel}</strong>
              <div
                style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}
              >
                <div>
                  Max Input Tokens:{" "}
                  {selectedModelData.max_input_tokens?.toLocaleString() ||
                    "N/A"}
                </div>
                <div>
                  Max Output Tokens:{" "}
                  {selectedModelData.max_output_tokens?.toLocaleString() ||
                    "N/A"}
                </div>
                <div>
                  Provider:{" "}
                  {(selectedModelData as any).litellm_provider || "OpenAI"}
                </div>
              </div>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {!isCurrentlySelected ? (
                <button
                  onClick={handleSelectModel}
                  style={{ padding: "6px 12px" }}
                >
                  Select This Model
                </button>
              ) : (
                <>
                  <button
                    disabled
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#e0f0e0",
                      border: "1px solid #90c090",
                    }}
                  >
                    ✓ Currently Selected
                  </button>
                  <button
                    onClick={handleClearSelection}
                    style={{
                      padding: "6px 12px",
                      fontSize: "11px",
                      backgroundColor: "#f0f0f0",
                    }}
                  >
                    Clear Selection
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Pricing Information */}
          <div
            style={{
              marginTop: "15px",
              padding: "10px",
              backgroundColor: "#f8f8f8",
              borderRadius: "4px",
              fontSize: "11px",
            }}
          >
            <strong>Pricing per million tokens:</strong>
            <div>
              Input: $
              {(selectedModelData.input_cost_per_token * 1000000).toFixed(2)}
            </div>
            <div>
              Output: $
              {(selectedModelData.output_cost_per_token * 1000000).toFixed(2)}
            </div>
          </div>

          {/* Model Capabilities */}
          {(selectedModelData as any).supports_vision && (
            <div
              style={{ marginTop: "10px", fontSize: "12px", color: "#0066cc" }}
            >
              ✓ Supports Vision (Image Input)
            </div>
          )}
          {(selectedModelData as any).supports_function_calling && (
            <div style={{ fontSize: "12px", color: "#0066cc" }}>
              ✓ Supports Function Calling
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EchoModelTable;
