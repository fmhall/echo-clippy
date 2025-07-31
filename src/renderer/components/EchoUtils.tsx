import { EchoClient } from "@zdql/echo-typescript-sdk";
import type {
  CreatePaymentLinkResponse,
  Balance,
} from "@zdql/echo-typescript-sdk";
import { OpenAI } from "openai";

/**
 * Get an authenticated Echo client
 * @param apiKey - The API key to use for authentication
 * @param baseUrl - The base URL for the Echo API
 * @throws {Error} If no valid authentication is found
 */
export async function getAuthenticatedEchoClient(
  apiKey: string,
  baseUrl: string = "https://echo.merit.systems",
): Promise<EchoClient> {
  if (!apiKey) {
    throw new Error("No API key provided");
  }
  return new EchoClient({
    apiKey,
    baseUrl,
  });
}

/**
 * Remove stored Echo credentials - this should be handled by the component
 * @deprecated Use clippyApi.setState directly in components
 */
export async function logoutFromEcho(): Promise<void> {
  console.warn("logoutFromEcho is deprecated, use clippyApi.setState directly");
}

/**
 * Payment options for creating Echo payment links
 */
export interface PaymentOptions {
  amount?: number;
  description?: string;
}

/**
 * Create an Echo payment link
 * @param apiKey - The API key for authentication
 * @param options - Payment configuration options
 * @param baseUrl - The base URL for the Echo API
 * @returns Promise that resolves to payment link response
 */
export async function createEchoPaymentLink(
  apiKey: string,
  options: PaymentOptions = {},
  baseUrl: string = "https://echo.merit.systems",
): Promise<CreatePaymentLinkResponse> {
  const client = await getAuthenticatedEchoClient(apiKey, baseUrl);

  const { amount = 10, description = "Echo credits" } = options;

  if (!amount || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const response = await client.createPaymentLink({
    amount: parseFloat(amount.toString()),
    description,
  });

  // Open the payment link in the browser
  window.open(response.paymentLink.url, "_blank");

  return response;
}

export async function getEchoBalance(
  apiKey: string,
  baseUrl: string = "https://echo.merit.systems",
): Promise<Balance> {
  try {
    const client = await getAuthenticatedEchoClient(apiKey, baseUrl);
    return client.getBalance();
  } catch (error) {
    console.error("Error getting Echo balance:", error);
    return { totalPaid: 0, totalSpent: 0, balance: 0 };
  }
}

export async function useEchoModel(
  message: string,
  model: string = "gpt-4o-mini",
  apiKey: string,
  baseUrl: string,
): Promise<string> {
  console.log("Using Echo model:", model);
  console.log("Using Echo API key:", apiKey);
  console.log("Using Echo base URL:", baseUrl);
  console.log("Using Echo message:", message);
  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseUrl,
    dangerouslyAllowBrowser: true,
  });

  const randomNumber = Math.random().toFixed(10);

  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      { role: "user", content: randomNumber + " what number is this" },
    ],
    temperature: 1,
  });

  console.log(response.choices[0]?.message?.content);
  return response.choices[0]?.message?.content ?? "";
}

/**
 * Use OpenAI vision model to analyze a screenshot
 * @param screenshotDataUrl - Base64 data URL of the screenshot
 * @param prompt - The prompt to send with the image
 * @param model - The OpenAI model to use (should support vision)
 * @param apiKey - OpenAI API key
 * @param baseUrl - Base URL for the API
 * @returns Promise that resolves to the AI's response
 */
export async function useOpenAIVision(
  screenshotDataUrl: string,
  prompt: string = "What do you see in this screenshot? Give me a brief, helpful comment about what's happening on the user's screen.",
  model: string = "gpt-4o-mini",
  apiKey: string,
  baseUrl: string = "https://api.openai.com/v1",
): Promise<string> {
  console.log("Using OpenAI Vision model:", model);
  console.log(
    "Using OpenAI API key:",
    apiKey ? `${apiKey.substring(0, 10)}...` : "undefined",
  );
  console.log("Using OpenAI base URL:", baseUrl);
  console.log("Screenshot data URL length:", screenshotDataUrl.length);

  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseUrl,
    dangerouslyAllowBrowser: true,
  });

  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: screenshotDataUrl,
            },
          },
        ],
      },
    ],
    max_tokens: 100,
    temperature: 0.7,
  });

  console.log("OpenAI Vision response:", response.choices[0]?.message?.content);
  return (
    response.choices[0]?.message?.content ??
    "I can see your screen but cannot provide a comment right now."
  );
}
