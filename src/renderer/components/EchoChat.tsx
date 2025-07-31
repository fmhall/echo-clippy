import { useState, useEffect } from "react";
import OpenAI from "openai";

import { Message } from "./Message";
import { ChatInput } from "./ChatInput";
import { useChat } from "../contexts/ChatContext";
import { useSharedState } from "../contexts/SharedStateContext";
import { electronAi } from "../clippyApi";
import { log } from "../logging";
import { filterMessageContent } from "../helpers/message-content-helpers";

export type EchoChatProps = {
  style?: React.CSSProperties;
};

export function EchoChat({ style }: EchoChatProps) {
  const {
    setAnimationKey,
    setStatus,
    status,
    messages,
    addMessage,
    getSystemPrompt,
  } = useChat();
  const sharedState = useSharedState();
  const [streamingMessageContent, setStreamingMessageContent] =
    useState<string>("");
  const [lastRequestUUID, setLastRequestUUID] = useState<string>(
    crypto.randomUUID(),
  );
  const [useEchoMode, setUseEchoMode] = useState(false);
  const [openai, setOpenai] = useState<OpenAI | null>(null);

  // Get echo settings from shared state
  const echoApiKey = sharedState.settings.echoApiKey || "";
  const echoRouterUrl =
    sharedState.settings.echoRouterUrl || "https://echo.router.merit.systems";
  const selectedEchoModel = sharedState.settings.selectedEchoModel;
  const selectedLocalModel = sharedState.settings.selectedModel;
  const isEchoConnected = !!echoApiKey;
  const shouldUseEcho = isEchoConnected && !!selectedEchoModel;

  // Create OpenAI client when echo settings change
  useEffect(() => {
    console.log(
      "EchoChat: Checking for API key and selected model:",
      !!echoApiKey,
      selectedEchoModel,
    );
    if (echoApiKey && selectedEchoModel) {
      console.log("EchoChat: API key and model found, creating OpenAI client");
      const client = new OpenAI({
        apiKey: echoApiKey,
        baseURL: echoRouterUrl,
        dangerouslyAllowBrowser: true,
      });
      setOpenai(client);
      setUseEchoMode(true); // Auto-enable Echo mode when model is selected
    } else {
      console.log("EchoChat: No API key or model found");
      setOpenai(null);
      setUseEchoMode(false);
    }
  }, [echoApiKey, echoRouterUrl, selectedEchoModel]);

  const handleAbortMessage = () => {
    electronAi.abortRequest(lastRequestUUID);
  };

  const handleSendMessageWithEcho = async (message: string) => {
    if (status !== "idle" || !isEchoConnected || !openai) {
      console.error("Echo chat not connected");
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: message,
      sender: "user",
      createdAt: Date.now(),
    };

    await addMessage(userMessage);
    setStreamingMessageContent("");
    setStatus("thinking");
    log("Echo chat thinking");

    try {
      // Use the system prompt from shared state
      const systemPrompt = getSystemPrompt();
      console.log("Echo creating stream with model:", selectedEchoModel);
      console.log("Echo system prompt:", systemPrompt);
      console.log("Echo messages count:", messages.length);

      const response = await openai.chat.completions.create({
        model: selectedEchoModel || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10).map((msg) => ({
            role:
              msg.sender === "user"
                ? ("user" as const)
                : ("assistant" as const),
            content: msg.content,
          })),
          { role: "user", content: message },
        ],
        stream: true,
      });

      console.log("Echo stream created successfully");

      let fullContent = "";
      let filteredContent = "";
      let hasSetAnimationKey = false;

      setStatus("responding");

      for await (const chunk of response) {
        console.log(
          "timestamp:",
          Date.now(),
          "Echo streaming chunk received, content length:",
          chunk.choices[0]?.delta?.content?.length,
        );

        // Check if chunk has the expected structure
        if (!chunk.choices || !chunk.choices[0]) {
          console.warn("Echo chunk missing choices:", chunk);
          continue;
        }

        const content = chunk.choices[0]?.delta?.content || "";
        console.log("Echo extracted content:", JSON.stringify(content));

        // Skip empty content chunks
        if (!content) {
          console.log("Echo skipping empty content chunk");
          continue;
        }

        fullContent = fullContent + content;
        console.log("Echo fullContent so far:", fullContent.length);

        if (!hasSetAnimationKey) {
          const { text, animationKey } = filterMessageContent(fullContent);
          filteredContent = text;
          console.log(
            "Echo filtered content (before animation key):",
            filteredContent.length,
          );

          if (animationKey) {
            console.log("Echo animation key found:", animationKey);
            setAnimationKey(animationKey);
            hasSetAnimationKey = true;
          }
        } else {
          filteredContent += content;
          console.log(
            "Echo filtered content (after animation key):",
            filteredContent.length,
          );
        }

        console.log("Echo setting streaming content:", filteredContent.length);
        setStreamingMessageContent(filteredContent);
      }

      // Once streaming is complete, add the full message to the messages array
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: filteredContent,
        sender: "clippy",
        createdAt: Date.now(),
      };

      addMessage(assistantMessage);
    } catch (error) {
      log("Echo chat error:", error);

      // Fallback to local model
      // await handleSendMessageLocal(message);
    } finally {
      setStreamingMessageContent("");
      setStatus("idle");
    }
  };

  const handleSendMessageLocal = async (message: string) => {
    log("Echo chat sending message locally");
    if (status !== "idle") {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: message,
      sender: "user",
      createdAt: Date.now(),
    };

    await addMessage(userMessage);
    setStreamingMessageContent("");
    setStatus("thinking");

    try {
      const requestUUID = crypto.randomUUID();
      setLastRequestUUID(requestUUID);

      const response = await window.electronAi.promptStreaming(message, {
        requestUUID,
      });

      let fullContent = "";
      let filteredContent = "";
      let hasSetAnimationKey = false;

      for await (const chunk of response) {
        if (fullContent === "") {
          setStatus("responding");
        }

        fullContent = fullContent + chunk;

        if (!hasSetAnimationKey) {
          const { text, animationKey } = filterMessageContent(fullContent);

          filteredContent = text;

          if (animationKey) {
            setAnimationKey(animationKey);
            hasSetAnimationKey = true;
          }
        } else {
          filteredContent += chunk;
        }

        setStreamingMessageContent(filteredContent);
      }

      // Once streaming is complete, add the full message to the messages array
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: filteredContent,
        sender: "clippy",
        createdAt: Date.now(),
      };

      addMessage(assistantMessage);
    } catch (error) {
      console.error(error);
    } finally {
      setStreamingMessageContent("");
      setStatus("idle");
    }
  };

  const handleSendMessage = async (message: string) => {
    console.log("EchoChat: handleSendMessage called", {
      shouldUseEcho,
      isEchoConnected,
      hasOpenai: !!openai,
      selectedEchoModel,
    });
    if (shouldUseEcho && openai) {
      console.log("EchoChat: Using Echo mode with model:", selectedEchoModel);
      await handleSendMessageWithEcho(message);
    } else {
      console.log("EchoChat: Using local mode");
      await handleSendMessageLocal(message);
    }
  };

  return (
    <div style={style} className="chat-container">
      {/* Model status indicator */}
      {(shouldUseEcho || isEchoConnected) && (
        <div
          style={{
            padding: "8px",
            borderBottom: "1px solid #ccc",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: shouldUseEcho ? "#f0f8ff" : "#fafafa",
          }}
        >
          <div>
            {shouldUseEcho ? (
              <>
                <span style={{ color: "#0066cc", fontWeight: "bold" }}>
                  🌐 Echo Model:
                </span>
                <span style={{ marginLeft: "6px" }}>{selectedEchoModel}</span>
              </>
            ) : isEchoConnected ? (
              <span style={{ color: "#666" }}>
                Using local model: {selectedLocalModel}
              </span>
            ) : (
              <span style={{ color: "#666" }}>
                Using local model - add cloud models in settings.
              </span>
            )}
          </div>
          {shouldUseEcho && (
            <span
              style={{
                fontSize: "10px",
                color: "#0066cc",
                backgroundColor: "#e0f0ff",
                padding: "2px 6px",
                borderRadius: "3px",
              }}
            >
              CLOUD
            </span>
          )}
        </div>
      )}

      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      {status === "responding" && (
        <>
          {console.log(
            "Echo rendering streaming message with content length:",
            streamingMessageContent.length,
            "content:",
            JSON.stringify(streamingMessageContent.substring(0, 50)),
          )}
          <Message
            message={{
              id: "streaming",
              content: streamingMessageContent,
              sender: "clippy",
              createdAt: Date.now(),
            }}
          />
        </>
      )}
      <ChatInput onSend={handleSendMessage} onAbort={handleAbortMessage} />
    </div>
  );
}
