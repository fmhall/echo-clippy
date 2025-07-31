import { SharedState } from "../sharedState";
import { EchoModelName } from "../echoModels";

/**
 * Determines which model should be used based on the current state
 * Echo models take precedence over local models
 */
export function getActiveModel(state: SharedState): {
  type: "echo" | "local" | "none";
  model: string | null;
  isReady: boolean;
} {
  // Check for Echo model first (highest precedence)
  if (state.settings.selectedEchoModel && state.settings.echoApiKey) {
    const echoModel = state.echoModels[state.settings.selectedEchoModel as EchoModelName];
    return {
      type: "echo",
      model: state.settings.selectedEchoModel,
      isReady: !!echoModel,
    };
  }

  // Check for local model (lower precedence)
  if (state.settings.selectedModel) {
    const localModel = state.models[state.settings.selectedModel];
    return {
      type: "local",
      model: state.settings.selectedModel,
      isReady: !!(localModel && localModel.downloaded),
    };
  }

  // No model selected
  return {
    type: "none",
    model: null,
    isReady: false,
  };
}

/**
 * Validates that the model selection state is consistent
 */
export function validateModelSelectionState(state: SharedState): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check Echo model validation
  if (state.settings.selectedEchoModel) {
    if (!state.settings.echoApiKey) {
      issues.push("Echo model selected but no API key configured");
    }
    
    const echoModel = state.echoModels[state.settings.selectedEchoModel as EchoModelName];
    if (!echoModel) {
      issues.push(`Selected Echo model '${state.settings.selectedEchoModel}' not found in available models`);
    }
  }

  // Check local model validation
  if (state.settings.selectedModel) {
    const localModel = state.models[state.settings.selectedModel];
    if (!localModel) {
      issues.push(`Selected local model '${state.settings.selectedModel}' not found in available models`);
    } else if (!localModel.downloaded) {
      issues.push(`Selected local model '${state.settings.selectedModel}' is not downloaded`);
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Gets a human-readable description of the current model selection
 */
export function getModelSelectionDescription(state: SharedState): string {
  const activeModel = getActiveModel(state);
  
  switch (activeModel.type) {
    case "echo":
      return `Echo Model: ${activeModel.model} ${activeModel.isReady ? "(Ready)" : "(Configuration Issue)"}`;
    case "local":
      return `Local Model: ${activeModel.model} ${activeModel.isReady ? "(Downloaded)" : "(Not Downloaded)"}`;
    case "none":
      return "No model selected";
    default:
      return "Unknown model state";
  }
}