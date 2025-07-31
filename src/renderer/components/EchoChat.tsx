import { useState, useEffect } from "react";
import OpenAI from "openai";

import { Message } from "./Message";
import { ChatInput } from "./ChatInput";
import { ANIMATION_KEYS_BRACKETS } from "../clippy-animation-helpers";
import { useChat } from "../contexts/ChatContext";
import { useSharedState } from "../contexts/SharedStateContext";
import { electronAi } from "../clippyApi";
import { log } from "../logging";

export type EchoChatProps = {
  style?: React.CSSProperties;
};

export function EchoChat({ style }: EchoChatProps) {
  const { setAnimationKey, setStatus, status, messages, addMessage } = useChat();
  const sharedState = useSharedState();
  const [streamingMessageContent, setStreamingMessageContent] = useState<string>("");
  const [lastRequestUUID, setLastRequestUUID] = useState<string>(crypto.randomUUID());
  const [useEchoMode, setUseEchoMode] = useState(false);
  const [openai, setOpenai] = useState<OpenAI | null>(null);

  // Get echo settings from shared state
  const echoApiKey = sharedState.settings.echoApiKey || "";
  const echoRouterUrl = sharedState.settings.echoRouterUrl || "https://echo.router.merit.systems";
  const selectedEchoModel = sharedState.settings.selectedEchoModel;
  const selectedLocalModel = sharedState.settings.selectedModel;
  const isEchoConnected = !!echoApiKey;
  const shouldUseEcho = isEchoConnected && !!selectedEchoModel;

  // Create OpenAI client when echo settings change
  useEffect(() => {
    console.log('EchoChat: Checking for API key and selected model:', !!echoApiKey, selectedEchoModel);
    if (echoApiKey && selectedEchoModel) {
      console.log('EchoChat: API key and model found, creating OpenAI client');
      const client = new OpenAI({
        apiKey: echoApiKey,
        baseURL: echoRouterUrl,
        dangerouslyAllowBrowser: true,
      });
      setOpenai(client);
      setUseEchoMode(true); // Auto-enable Echo mode when model is selected
    } else {
      console.log('EchoChat: No API key or model found');
      setOpenai(null);
      setUseEchoMode(false);
    }
  }, [echoApiKey, echoRouterUrl, selectedEchoModel]);

  const handleAbortMessage = () => {
    electronAi.abortRequest(lastRequestUUID);
  };

  const handleSendMessageWithEcho = async (message: string) => {
    if (status !== "idle" || !isEchoConnected || !openai) {
      console.error('Echo chat not connected');
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
    log('Echo chat thinking');

    try {
      // Create a system prompt that includes animation instructions
      const systemPrompt = `You are Clippy, Microsoft's helpful assistant. You can express emotions and actions through animation keys. 
Available animations: ${ANIMATION_KEYS_BRACKETS.join(", ")}
Use animation keys at the start of your response when appropriate. For example, start with [Thinking] when pondering, [Congratulate] when celebrating, [Alert] for warnings, etc.`;

      const response = await openai.chat.completions.create({
        model: selectedEchoModel || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10).map(msg => ({
            role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
            content: msg.content
          })),
          { role: 'user', content: message }
        ],
        stream: true,
      });

      let fullContent = "";
      let filteredContent = "";
      let hasSetAnimationKey = false;

      setStatus("responding");

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || "";
        
        if (!hasSetAnimationKey) {
          const { text, animationKey } = filterMessageContent(fullContent + content);
          filteredContent = text;
          fullContent = fullContent + content;

          if (animationKey) {
            setAnimationKey(animationKey);
            hasSetAnimationKey = true;
          }
        } else {
          filteredContent += content;
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
      log('Echo chat error:', error);
      
      // Fallback to local model
      // await handleSendMessageLocal(message);
    } finally {
      setStreamingMessageContent("");
      setStatus("idle");
    }
  };

  const handleSendMessageLocal = async (message: string) => {
    log('Echo chat sending message locally');
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

        if (!hasSetAnimationKey) {
          const { text, animationKey } = filterMessageContent(
            fullContent + chunk,
          );

          filteredContent = text;
          fullContent = fullContent + chunk;

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
    console.log('EchoChat: handleSendMessage called', { shouldUseEcho, isEchoConnected, hasOpenai: !!openai, selectedEchoModel });
    if (shouldUseEcho && openai) {
      console.log('EchoChat: Using Echo mode with model:', selectedEchoModel);
      await handleSendMessageWithEcho(message);
    } else {
      console.log('EchoChat: Using local mode');
      await handleSendMessageLocal(message);
    }
  };

  return (
    <div style={style} className="chat-container">
      {/* Model status indicator */}
      {(shouldUseEcho || isEchoConnected) && (
        <div style={{ 
          padding: "8px", 
          borderBottom: "1px solid #ccc", 
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: shouldUseEcho ? "#f0f8ff" : "#fafafa"
        }}>
          <div>
            {shouldUseEcho ? (
              <>
                <span style={{ color: "#0066cc", fontWeight: "bold" }}>🌐 Echo Model:</span>
                <span style={{ marginLeft: "6px" }}>{selectedEchoModel}</span>
              </>
            ) : isEchoConnected ? (
              <span style={{ color: "#666" }}>Using local model: {selectedLocalModel}</span>
            ) : (
              <span style={{ color: "#666" }}>Using local model - add cloud models in settings.</span>
            )}
          </div>
          {shouldUseEcho && (
            <span style={{ 
              fontSize: "10px", 
              color: "#0066cc",
              backgroundColor: "#e0f0ff",
              padding: "2px 6px",
              borderRadius: "3px"
            }}>
              CLOUD
            </span>
          )}
        </div>
      )}
      
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      {status === "responding" && (
        <Message
          message={{
            id: "streaming",
            content: streamingMessageContent,
            sender: "clippy",
            createdAt: Date.now(),
          }}
        />
      )}
      <ChatInput onSend={handleSendMessage} onAbort={handleAbortMessage} />
    </div>
  );
}

/**
 * Filter the message content to get the text and animation key
 *
 * @param content - The content of the message
 * @returns The text and animation key
 */
function filterMessageContent(content: string): {
  text: string;
  animationKey: string;
} {
  let text = content;
  let animationKey = "";

  if (content === "[") {
    text = "";
  } else if (/^\[[A-Za-z]*$/m.test(content)) {
    text = content.replace(/^\[[A-Za-z]*$/m, "").trim();
  } else {
    // Check for animation keys in brackets
    for (const key of ANIMATION_KEYS_BRACKETS) {
      if (content.startsWith(key)) {
        animationKey = key.slice(1, -1);
        text = content.slice(key.length).trim();
        break;
      }
    }
  }

  return { text, animationKey };
}