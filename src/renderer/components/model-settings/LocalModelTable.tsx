import React, { useState } from "react";
import { Column, TableView } from "../TableView";
import { Progress } from "../Progress";
import { useSharedState } from "../../contexts/SharedStateContext";
import { clippyApi } from "../../clippyApi";
import { prettyDownloadSpeed } from "../../helpers/convert-download-speed";
import { ManagedModel } from "../../../models";
import { isModelDownloading } from "../../../helpers/model-helpers";
import { getActiveModel } from "../../../helpers/model-selection-helpers";

export const LocalModelTable: React.FC = () => {
  const sharedState = useSharedState();
  const { models, settings } = sharedState;
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Check if Echo model is active (overrides local model)
  const activeModel = getActiveModel(sharedState);
  const isEchoActive = activeModel.type === "echo";

  const columns: Array<Column> = [
    { key: "default", header: "Selected", width: 70 },
    { key: "name", header: "Name" },
    {
      key: "size",
      header: "Size",
      render: (row) => `${row.size.toLocaleString()} MB`,
    },
    { key: "company", header: "Company" },
    { key: "downloaded", header: "Downloaded" },
  ];

  const modelKeys = Object.keys(models || {});
  const data = modelKeys.map((modelKey) => {
    const model = models?.[modelKey as keyof typeof models];

    return {
      default: model?.name === settings.selectedModel ? "✓" : "",
      name: model?.name,
      company: model?.company,
      size: model?.size,
      downloaded: model.downloaded ? "Yes" : "No",
    };
  });

  // Variables
  const selectedModel =
    models?.[modelKeys[selectedIndex] as keyof typeof models] || null;
  const isDownloading = isModelDownloading(selectedModel);
  const isDefaultModel = selectedModel?.name === settings.selectedModel;

  // Handlers
  const handleRowSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleDownload = async () => {
    if (selectedModel) {
      await clippyApi.downloadModelByName(data[selectedIndex].name);
    }
  };

  const handleDeleteOrRemove = async () => {
    if (selectedModel?.imported) {
      await clippyApi.removeModelByName(selectedModel.name);
    } else if (selectedModel) {
      await clippyApi.deleteModelByName(selectedModel.name);
    }
  };

  const handleMakeDefault = async () => {
    if (selectedModel) {
      await clippyApi.setState("settings.selectedModel", selectedModel.name);
      // Clear echo model selection to ensure local model takes precedence
      await clippyApi.setState("settings.selectedEchoModel", undefined);
    }
  };

  return (
    <div>
      {isEchoActive && (
        <div
          className="sunken-panel"
          style={{
            padding: "12px",
            marginBottom: "15px",
            backgroundColor: "#fff3cd",
            border: "1px solid #ffeaa7",
          }}
        >
          <strong>🌐 Echo Model Active</strong>
          <p
            style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#856404" }}
          >
            Local models are inactive because an Echo model ({activeModel.model}
            ) is currently selected. Clear the Echo model selection to use local
            models.
          </p>
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <p>
          <strong>Local AI Models</strong> - Downloaded to your computer
        </p>
        <p style={{ fontSize: "12px", color: "#666" }}>
          These models run entirely on your device. Larger models are more
          powerful but use more memory and are slower. Models use the GGUF
          format.
        </p>
      </div>

      <button
        style={{ marginBottom: 10, padding: "8px 12px" }}
        onClick={() => clippyApi.addModelFromFile()}
      >
        📁 Add model from file
      </button>

      <TableView
        columns={columns}
        data={data}
        onRowSelect={handleRowSelect}
        initialSelectedIndex={selectedIndex}
      />

      {selectedModel && (
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
              <strong>{selectedModel.name}</strong>
              {selectedModel.description && (
                <p style={{ margin: "8px 0", fontSize: "13px", color: "#555" }}>
                  {selectedModel.description}
                </p>
              )}

              <div
                style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}
              >
                <div>Size: {selectedModel.size.toLocaleString()} MB</div>
                <div>Company: {selectedModel.company || "Unknown"}</div>
                {selectedModel.imported && (
                  <div style={{ color: "#0066cc" }}>✓ Imported from file</div>
                )}
              </div>

              {selectedModel.homepage && (
                <p style={{ marginTop: "8px" }}>
                  <a
                    href={selectedModel.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "12px" }}
                  >
                    Visit Homepage
                  </a>
                </p>
              )}
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {!selectedModel.downloaded ? (
                <button
                  disabled={isDownloading}
                  onClick={handleDownload}
                  style={{ padding: "6px 12px" }}
                >
                  {isDownloading ? "Downloading..." : "Download Model"}
                </button>
              ) : (
                <>
                  {!isDefaultModel ? (
                    <button
                      disabled={isDownloading}
                      onClick={handleMakeDefault}
                      style={{ padding: "6px 12px" }}
                    >
                      Select This Model
                    </button>
                  ) : (
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
                  )}
                  <button
                    onClick={handleDeleteOrRemove}
                    style={{
                      padding: "6px 12px",
                      fontSize: "11px",
                      backgroundColor: "#ffe0e0",
                      border: "1px solid #ff9090",
                    }}
                  >
                    {selectedModel?.imported ? "Remove" : "Delete"} Model
                  </button>
                </>
              )}
            </div>
          </div>

          <LocalModelDownload model={selectedModel} />
        </div>
      )}
    </div>
  );
};

export default LocalModelTable;

export const LocalModelDownload: React.FC<{
  model?: ManagedModel;
}> = ({ model }) => {
  if (!model || !isModelDownloading(model)) {
    return null;
  }

  const downloadSpeed = prettyDownloadSpeed(
    model?.downloadState?.currentBytesPerSecond || 0,
  );

  return (
    <div style={{ marginTop: "15px" }}>
      <p style={{ fontSize: "12px", marginBottom: "8px" }}>
        Downloading {model.name}... ({downloadSpeed}/s)
      </p>
      <Progress progress={model.downloadState?.percentComplete || 0} />
    </div>
  );
};
