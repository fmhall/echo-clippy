import { useEffect, useState } from "react";
import { clippyApi } from "../clippyApi";
import { useSharedState } from "../contexts/SharedStateContext";
import { Checkbox } from "./Checkbox";

export const SettingsAdvanced: React.FC = () => {
  const { settings } = useSharedState();
  const [sources, setSources] = useState<any[]>([]);

  useEffect(() => {
    clippyApi.listSources().then(setSources);
  }, []);

  return (
    <div>
      <fieldset>
        <legend>Automatic Updates</legend>
        <Checkbox
          id="autoUpdates"
          label="Automatically keep Clippy up to date"
          checked={!settings.disableAutoUpdate}
          onChange={(checked) => {
            clippyApi.setState("settings.disableAutoUpdate", !checked);
          }}
        />

        <button
          style={{ marginTop: "10px" }}
          onClick={() => clippyApi.checkForUpdates()}
        >
          Check for Updates
        </button>
      </fieldset>
      <fieldset>
        <legend>Configuration</legend>
        <p>
          Clippy keeps its configuration in JSON files. Click these buttons to
          open them in your default JSON editor. After editing, restart Clippy
          to apply the changes.
        </p>
        <button onClick={clippyApi.openStateInEditor}>
          Open Configuration File
        </button>
        <button onClick={clippyApi.openDebugStateInEditor}>
          Open Debug File
        </button>
      </fieldset>
      <fieldset>
        <legend>Vision Features</legend>
        <Checkbox
          id="useVision"
          label="Enable screenshots for vision-capable models"
          checked={settings.useVision ?? true}
          onChange={(checked) => {
            clippyApi.setState("settings.useVision", checked);
          }}
        />
        <div className="field-row" style={{ marginTop: "10px" }}>
          <label htmlFor="visionCadence">Screenshot interval (seconds):</label>
          <input
            id="visionCadence"
            type="number"
            min="1"
            max="300"
            step="1"
            value={settings.visionCadence ?? 10}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value)) {
                clippyApi.setState("settings.visionCadence", value);
              }
            }}
            style={{ width: "80px", marginLeft: "10px" }}
          />
        </div>
        <div className="field-row" style={{ marginTop: "10px" }}>
          <label htmlFor="visionSourceNumber">Screenshot source:</label>
          <select
            id="visionSourceNumber"
            value={settings.visionSourceNumber ?? 0}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value)) {
                clippyApi.setState("settings.visionSourceNumber", value);
              }
            }}
            style={{ width: "80px", marginLeft: "10px" }}
          >
            {sources.map((source, index) => (
              <option key={index} value={index}>
                {source.name} ({source.id})
              </option>
            ))}
          </select>
        </div>
      </fieldset>
      <fieldset>
        <legend>Delete All Models</legend>
        <p>
          This will delete all models from Clippy. This action is not
          reversible.
        </p>
        <button onClick={clippyApi.deleteAllModels}>Delete All Models</button>
      </fieldset>
    </div>
  );
};
