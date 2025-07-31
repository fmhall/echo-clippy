import { useState, useEffect } from "react";
import OpenAI from "openai";

import { Message } from "./Message";
import { ChatInput } from "./ChatInput";
import { ANIMATION_KEYS_BRACKETS } from "../clippy-animation-helpers";
import { useChat } from "../contexts/ChatContext";
import { electronAi } from "../clippyApi";
import { log } from "../logging";

export type EchoChatProps = {
  style?: React.CSSProperties;
};

export function EchoChat({ style }: EchoChatProps) {
  const { setAnimationKey, setStatus, status, messages, addMessage } = useChat();
  const [streamingMessageContent, setStreamingMessageContent] = useState<string>("");
  const [lastRequestUUID, setLastRequestUUID] = useState<string>(crypto.randomUUID());
  const [useEchoMode, setUseEchoMode] = useState(false);
  const [echoApiKey, setEchoApiKey] = useState<string>("");
  const [openai, setOpenai] = useState<OpenAI | null>(null);

  // Check for Echo API key and create OpenAI client
  useEffect(() => {
    const checkApiKey = () => {
      const storedApiKey = localStorage.getItem('echo_api_key');
      console.log('EchoChat: Checking for API key:', !!storedApiKey);
      if (storedApiKey) {
        console.log('EchoChat: API key found, creating OpenAI client');
        setEchoApiKey(storedApiKey);
        const client = new OpenAI({
          apiKey: storedApiKey,
          baseURL: 'https://echo.router.merit.systems/81c9fab2-d93b-49e9-8a4e-04229e7fc4d9',
          dangerouslyAllowBrowser: true,
        });
        setOpenai(client);
      } else {
        console.log('EchoChat: No API key found');
        setEchoApiKey("");
        setOpenai(null);
        setUseEchoMode(false); // Disable Echo mode if no API key
      }
    };

    checkApiKey();

    // Listen for storage changes (in case user updates API key in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'echo_api_key') {
        checkApiKey();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const isEchoConnected = !!echoApiKey;

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
        model: 'gpt-4o-mini',
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
    console.log('EchoChat: handleSendMessage called', { useEchoMode, isEchoConnected, hasOpenai: !!openai });
    if (useEchoMode && isEchoConnected && openai) {
      console.log('EchoChat: Using Echo mode');
      await handleSendMessageWithEcho(message);
    } else {
      console.log('EchoChat: Using local mode');
      await handleSendMessageLocal(message);
    }
  };

  return (
    <div style={style} className="chat-container">
      {/* Mode selector */}
      {isEchoConnected && (
        <div style={{ 
          padding: "8px", 
          borderBottom: "1px solid #ccc", 
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <label>
            <input
              type="checkbox"
              checked={useEchoMode}
              onChange={(e) => {
                console.log('EchoChat: Toggle changed to:', e.target.checked);
                setUseEchoMode(e.target.checked);
              }}
            />
            Use Echo Cloud AI (GPT-4o-mini)
          </label>
          {useEchoMode && (
            <span style={{ color: "#0066cc" }}>🌐 Cloud</span>
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