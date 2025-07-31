import { useEffect, useState, useRef } from "react";
import { useSharedState } from "../contexts/SharedStateContext";
import { useOpenAIVision } from "./EchoUtils";
import { log } from "../logging";
import { clippyApi } from "../clippyApi";

const SPEECH_SHOW_TIME = 3000; // Show message for 3 seconds
const SPEECH_WAIT_TIME = 8000; // Wait 8 seconds before showing next message

const SPEECH_MESSAGES = [
  "Hello! I'm Clippy, your helpful assistant.",
  "Need help with something?",
  "I'm here to assist you!",
  "Click me to open the chat!",
  "What can I help you with today?",
  "I love helping users like you!",
];

export function ClippySpeechBubble() {
  console.log("ClippySpeechBubble component rendered");
  const [isVisible, setIsVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const timeoutRefs = useRef<number[]>([]);
  const { settings } = useSharedState();

  const model = settings.selectedEchoModel;
  const apiKey = settings.echoApiKey;
  const echoRouterUrl =
    settings.echoRouterUrl || "https://echo.router.merit.systems";

  // Helper function to clear all timeouts
  const clearAllTimeouts = () => {
    timeoutRefs.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    timeoutRefs.current = [];
  };

  // Helper function to add a timeout
  const addTimeout = (callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(() => {
      // Remove this timeout from the array when it fires
      timeoutRefs.current = timeoutRefs.current.filter(
        (id) => id !== timeoutId,
      );
      callback();
    }, delay);
    timeoutRefs.current.push(timeoutId);
    return timeoutId;
  };

  useEffect(() => {
    console.log("ClippySpeechBubble useEffect triggered");
    const showRandomMessage = async () => {
      try {
        // Debug logging
        log("ClippySpeechBubble - Settings check:", {
          apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : "undefined",
          echoRouterUrl,
          model,
          hasApiKey: !!apiKey,
          hasechoRouterUrl: !!echoRouterUrl,
        });

        // Pick a random message
        let randomMessage: string;
        if (!apiKey) {
          log("Using static message - missing OpenAI API key", {
            hasApiKey: !!apiKey,
            hasEchoRouterUrl: !!echoRouterUrl,
            apiKeyType: typeof apiKey,
            echoRouterUrlType: typeof echoRouterUrl,
          });
          randomMessage =
            SPEECH_MESSAGES[Math.floor(Math.random() * SPEECH_MESSAGES.length)];
        } else {
          log("Taking screenshot and calling OpenAI Vision with:", {
            model,
            hasApiKey: !!apiKey,
            echoRouterUrl,
          });

          // Take a screenshot
          const screenshotDataUrl = await clippyApi.takeScreenshot();
          log("Screenshot taken, data URL length:", screenshotDataUrl.length);

          // Use OpenAI Vision to analyze the screenshot
          const prompt = "Describe the image in a very short sentence.";

          randomMessage = await useOpenAIVision(
            screenshotDataUrl,
            prompt,
            model,
            apiKey,
            echoRouterUrl,
          );
          log("Got response from OpenAI Vision:", randomMessage);
        }

        setCurrentMessage(randomMessage);
        setIsVisible(true);

        // Hide the message after SPEECH_SHOW_TIME
        addTimeout(() => {
          setIsVisible(false);
          // Schedule next message after SPEECH_WAIT_TIME
          addTimeout(() => {
            showRandomMessage();
          }, SPEECH_WAIT_TIME);
        }, SPEECH_SHOW_TIME);
      } catch (error) {
        console.error("Error showing speech message:", error);
        // Fall back to static message on error
        const randomMessage =
          SPEECH_MESSAGES[Math.floor(Math.random() * SPEECH_MESSAGES.length)];
        setCurrentMessage(randomMessage);
        setIsVisible(true);

        addTimeout(() => {
          setIsVisible(false);
          addTimeout(() => {
            showRandomMessage();
          }, SPEECH_WAIT_TIME);
        }, SPEECH_SHOW_TIME);
      }
    };

    // Start the cycle after initial delay
    addTimeout(() => {
      showRandomMessage();
    }, 2000); // Initial delay of 2 seconds

    // Clean up timeouts when component unmounts or dependencies change
    return clearAllTimeouts;
  }, [model, apiKey, echoRouterUrl]);

  // Don't render anything if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="window"
      style={{
        width: "180px", // Reduced width to fit better
        height: "100%", // Fill the full height of the container
        marginBottom: "8px", // Spacing between bubble and Clippy
        marginLeft: "0", // Align to left edge
        marginRight: "auto", // Let it position naturally
        position: "relative",
        fontSize: "11px",
        padding: "6px 8px",
        borderRadius: "8px 8px 2px 8px", // Rounded corners except bottom-right for speech tail
        boxSizing: "border-box", // Include padding in width calculation
        wordWrap: "break-word", // Prevent text overflow
        overflow: "visible", // Ensure content is visible
        animation: "fadeIn 0.3s ease-in", // Smooth fade in
        display: "flex", // Use flexbox for content alignment
        alignItems: "center", // Center content vertically
      }}
    >
      <div
        style={{
          lineHeight: "1.3",
          width: "100%",
          overflow: "visible",
          textAlign: "center", // Center text horizontally
        }}
      >
        {currentMessage}
      </div>

      {/* Speech bubble tail pointing to Clippy */}
      <div
        style={{
          position: "absolute",
          bottom: "-6px",
          right: "30px", // Adjusted position for smaller bubble
          width: "0",
          height: "0",
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid #c0c0c0", // Match window background
        }}
      />

      {/* Inner shadow for the tail */}
      <div
        style={{
          position: "absolute",
          bottom: "-4px",
          right: "31px", // Adjusted position for smaller bubble
          width: "0",
          height: "0",
          borderLeft: "4px solid transparent",
          borderRight: "4px solid transparent",
          borderTop: "4px solid #dfdfdf", // Slightly lighter for inner part
        }}
      />
    </div>
  );
}
