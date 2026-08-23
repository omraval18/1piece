"use client";

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

function assistantText(message: UIMessage) {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n\n")
    .trim();
}

export function ChatView({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: UIMessage[];
}) {
  const router = useRouter();
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest({ messages, id: chatId }) {
          return {
            body: { id: chatId, message: messages[messages.length - 1] },
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, stop } = useChat({
    id,
    messages: initialMessages,
    transport,
    onFinish: () => {
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const streaming = status === "streaming" || status === "submitted";
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyAnswer(message: UIMessage) {
    const text = assistantText(message);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Ask any hardware compatibility question"
              description="CPU and motherboard, camera and lens, PSU and GPU, RAM, docks, chargers — any brands. The agent finds spec pages, scrapes them, and scores fit including BIOS or firmware caveats."
            />
          ) : (
            messages.map((message, index) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, partIndex) => {
                    if (part.type === "text") {
                      return (
                        <MessageResponse
                          key={`${message.id}-text-${partIndex}`}
                          caret="block"
                          isAnimating={
                            streaming &&
                            index === messages.length - 1 &&
                            message.role === "assistant"
                          }
                        >
                          {part.text}
                        </MessageResponse>
                      );
                    }
                    if (isToolUIPart(part)) {
                      const toolPart = part;
                      return (
                        <Tool defaultOpen key={toolPart.toolCallId}>
                          {toolPart.type === "dynamic-tool" ? (
                            <ToolHeader
                              type="dynamic-tool"
                              state={toolPart.state}
                              toolName={toolPart.toolName ?? "tool"}
                            />
                          ) : (
                            <ToolHeader
                              type={toolPart.type}
                              state={toolPart.state}
                            />
                          )}
                          <ToolContent>
                            <ToolInput input={toolPart.input} />
                            <ToolOutput
                              output={toolPart.output}
                              errorText={toolPart.errorText}
                            />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
                {message.role === "assistant" &&
                  assistantText(message) &&
                  !(streaming && index === messages.length - 1) && (
                    <MessageActions>
                      <MessageAction
                        label="Copy answer"
                        tooltip={copiedId === message.id ? "Copied" : "Copy"}
                        onClick={() => void copyAnswer(message)}
                      >
                        {copiedId === message.id ? (
                          <CheckIcon className="size-3.5" />
                        ) : (
                          <CopyIcon className="size-3.5" />
                        )}
                      </MessageAction>
                    </MessageActions>
                  )}
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="p-4">
        <PromptInput
          onSubmit={(message) => {
            const text = message.text.trim();
            if (!text) return;
            void sendMessage({ text });
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ryzen 9 9950X on an ASUS X670E-E — BIOS? Sony FE 200-600 on an A7 IV?" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit onStop={stop} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
