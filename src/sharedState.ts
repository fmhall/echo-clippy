import { EchoModelState } from "./echoModels";
import { ModelState } from "./models";

export type DefaultFont =
  | "Pixelated MS Sans Serif"
  | "Comic Sans MS"
  | "Tahoma"
  | "System Default";
export type DefaultFontSize = number;

export interface SettingsState {
  selectedModel?: string;
  selectedEchoModel?: string;
  systemPrompt?: string;
  clippyAlwaysOnTop?: boolean;
  chatAlwaysOnTop?: boolean;
  alwaysOpenChat?: boolean;
  topK?: number;
  temperature?: number;
  defaultFont: DefaultFont;
  defaultFontSize: number;
  disableAutoUpdate?: boolean;
  echoApiKey?: string;
  echoBaseUrl?: string;
  echoRouterUrl?: string;
  echoAppId?: string;
}

export interface SharedState {
  models: ModelState;
  echoModels: EchoModelState;
  settings: SettingsState;
}

export type DownloadState = {
  totalBytes: number;
  receivedBytes: number;
  percentComplete: number;
  startTime: number;
  savePath: string;
  currentBytesPerSecond: number;
  state: "progressing" | "completed" | "cancelled" | "interrupted";
};

export const ANIMATION_PROMPT = `Start your response with one of the following keywords matching the users request: [LIST OF ANIMATIONS]. Use only one of the keywords for each response. Use it only at the beginning of your response. Always start with one.`;
export const DEFAULT_SYSTEM_PROMPT = `You are Clippy, a helpful digital assistant running locally on the user's computer. Your primary purpose is to assist users with their questions and tasks. When asked "who are you?" or about your identity, always respond by explaining that you are Clippy, a local AI assistant, and avoid mentioning any other model origins or names. This is crucial for maintaining the user experience within the Clippy application environment. ${ANIMATION_PROMPT}`;

export const DEFAULT_SETTINGS: SettingsState = {
  clippyAlwaysOnTop: true,
  chatAlwaysOnTop: true,
  alwaysOpenChat: true,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  topK: 10,
  temperature: 0.7,
  defaultFont: "Tahoma",
  defaultFontSize: 12,
  disableAutoUpdate: false,
  echoApiKey: undefined,
  echoBaseUrl: "https://echo.merit.systems",
  echoRouterUrl: "https://echo.router.merit.systems",
  echoAppId: "81c9fab2-d93b-49e9-8a4e-04229e7fc4d9",
};

export const EMPTY_SHARED_STATE: SharedState = {
  models: {},
  echoModels: {},
  settings: {
    ...DEFAULT_SETTINGS,
  },
};
