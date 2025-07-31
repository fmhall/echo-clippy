import { EchoClient } from "@zdql/echo-typescript-sdk";
import type {
  CreatePaymentLinkResponse,
  Balance,
} from "@zdql/echo-typescript-sdk";

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
