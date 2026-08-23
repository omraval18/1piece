"use client";

import { useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Ask about nozzle and hotend fit"
              description="The model can list catalog parts, extract specs, and score compatibility. Tool calls are saved with the thread."
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
            <PromptInputTextarea placeholder="Will an E3D V6 brass nozzle fit a stock Creality hotend?" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit onStop={stop} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
