import {
  Accessor,
  For,
  Setter,
  Show,
  createEffect,
  createSignal,
  onCleanup,
} from "solid-js";
import {
  FiArrowDown,
  FiRefreshCcw,
  FiSend,
  FiStopCircle,
} from "solid-icons/fi";
import { FaSolidPlus } from "solid-icons/fa";
import {
  isMessageArray,
  messageRoleFromIndex,
  type Message,
} from "~/types/messages";
import { Topic } from "~/types/topics";
import { AfMessage } from "../Atoms/AfMessage";
import { BsPencilFill } from "solid-icons/bs";

export interface LayoutProps {
  setTopics: Setter<Topic[]>;
  isCreatingNormalTopic: Accessor<boolean>;
  setSelectedTopic: Setter<Topic | undefined>;
  selectedTopic: Accessor<Topic | undefined>;
  setOpeniFrame: Setter<boolean>;
  setGetSpecficFiles: Setter<boolean>;
  docText: Accessor<string[]>;
}

const scrollToBottomOfMessages = () => {
  // const element = document.getElementById("topic-messages");
  // if (!element) {
  //   console.error("Could not find element with id 'topic-messages'");
  //   return;
  // }
  // element.scrollIntoView({ block: "end" });
};

const MainLayout = (props: LayoutProps) => {
  const apiHost = import.meta.env.VITE_API_HOST as unknown as string;

  const resizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    setNewMessageContent(textarea.value);
  };

  const [loadingMessages, setLoadingMessages] = createSignal<boolean>(true);
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = createSignal<string>("");
  const [atMessageBottom, setAtMessageBottom] = createSignal<boolean>(true);
  const [streamingCompletion, setStreamingCompletion] =
    createSignal<boolean>(false);
  const [completionAbortController, setCompletionAbortController] =
    createSignal<AbortController>(new AbortController());
  const [disableAutoScroll, setDisableAutoScroll] =
    createSignal<boolean>(false);
  const [triggerScrollToBottom, setTriggerScrollToBottom] =
    createSignal<boolean>(false);
  const [quizMode, setQuizMode] = createSignal<boolean>(false);
  const [answerMode, setAnswerMode] = createSignal<boolean>(false);

  createEffect(() => {
    const element = document.getElementById("topic-layout");
    if (!element) {
      console.error("Could not find element with id 'topic-layout'");
      return;
    }

    setAtMessageBottom(
      element.scrollHeight - element.scrollTop === element.clientHeight,
    );

    element.addEventListener("scroll", () => {
      setAtMessageBottom(
        element.scrollHeight - element.scrollTop === element.clientHeight,
      );
    });

    onCleanup(() => {
      element.removeEventListener("scroll", () => {
        setAtMessageBottom(
          element.scrollHeight - element.scrollTop === element.clientHeight,
        );
      });
    });
  });
  createEffect(() => {
    window.addEventListener("wheel", (event) => {
      const delta = Math.sign(event.deltaY);
      7;

      if (delta === -1) {
        setDisableAutoScroll(true);
      }
    });
  });

  createEffect(() => {
    const triggerScrollToBottomVal = triggerScrollToBottom();
    const disableAutoScrollVal = disableAutoScroll();
    if (triggerScrollToBottomVal && !disableAutoScrollVal) {
      scrollToBottomOfMessages();
      setTriggerScrollToBottom(false);
    }
  });

  const handleReader = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
  ) => {
    let done = false;
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      if (doneReading) {
        done = doneReading;
        setStreamingCompletion(false);
      }
      if (value) {
        const decoder = new TextDecoder();
        const chunk = decoder.decode(value);

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          const newMessage = {
            content: lastMessage.content + chunk,
          };
          return [...prev.slice(0, prev.length - 1), newMessage];
        });

        setTriggerScrollToBottom(true);
      }
    }
  };

  const fetchCompletion = async ({
    new_message_content,
    topic_id,
    regenerateLastMessage,
  }: {
    new_message_content: string;
    topic_id: string | undefined;
    regenerateLastMessage?: boolean;
  }) => {
    let finalTopicId = topic_id;
    setStreamingCompletion(true);

    const plain_new_message_content = new_message_content;
    if (quizMode()) {
      if (!answerMode()) {
        new_message_content = `Give me only five to ten multiple choice and fill in the blank test questions on the subject of ${new_message_content} based on the following notes, and don't include any extra words or suggestions.`;
        setAnswerMode(true);
      } else {
        new_message_content = `Check the following answers based on the previously-stated quiz questions: ${new_message_content}`;
        setAnswerMode(false);
        setQuizMode(false);
      }
    }
    if (props.docText().length > 0) {
      new_message_content = `${props
        .docText()
        .join(" ")} ${new_message_content}`;
    }

    if (!finalTopicId) {
      setNewMessageContent("");
      const isNormalTopic = props.isCreatingNormalTopic();

      let body: object = {
        resolution: new_message_content,
      };

      if (isNormalTopic) {
        body = {
          resolution: new_message_content,
          normal_chat: true,
        };
      }

      const topicResponse = await fetch(`${apiHost}/topic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!topicResponse.ok) {
        setStreamingCompletion(false);
        const newEvent = new CustomEvent("show-toast", {
          detail: {
            type: "error",
            message: "Error creating topic",
          },
        });
        window.dispatchEvent(newEvent);
        return;
      }

      const newTopic = (await topicResponse.json()) as unknown as Topic;
      props.setTopics((prev) => {
        return [newTopic, ...prev];
      });
      props.setSelectedTopic({
        id: newTopic.id,
        resolution: newTopic.resolution,
        side: newTopic.side,
        normal_chat: newTopic.normal_chat,
        set_inline: true,
      });
      finalTopicId = newTopic.id;
    }

    let requestMethod = "POST";
    if (regenerateLastMessage) {
      requestMethod = "DELETE";
      setMessages((prev): Message[] => {
        const newMessages = [{ content: "" }];
        return [...prev.slice(0, -1), ...newMessages];
      });
    } else {
      setNewMessageContent("");
      const newMessageTextarea = document.querySelector(
        "#new-message-content-textarea",
      ) as HTMLTextAreaElement | undefined;
      newMessageTextarea && resizeTextarea(newMessageTextarea);

      setMessages((prev) => {
        if (prev.length === 0) {
          return [
            { content: "" },
            { content: plain_new_message_content },
            { content: "" },
          ];
        }
        const newMessages = [
          { content: plain_new_message_content },
          { content: "" },
        ];
        return [...prev, ...newMessages];
      });
    }

    try {
      const res = await fetch(`${apiHost}/message`, {
        method: requestMethod,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          new_message_content,
          topic_id: finalTopicId,
        }),
        signal: completionAbortController().signal,
      });
      // get the response as a stream
      const reader = res.body?.getReader();
      if (!reader) {
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = await handleReader(reader);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (
    topicId: string | undefined,
    abortController: AbortController,
  ) => {
    if (!topicId) {
      return;
    }

    setLoadingMessages(true);
    const res = await fetch(`${apiHost}/messages/${topicId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      signal: abortController.signal,
    });
    const data: unknown = await res.json();
    if (data && isMessageArray(data)) {
      setMessages(data);
    }
    setLoadingMessages(false);
    scrollToBottomOfMessages();
  };

  createEffect(() => {
    const curTopic = props.selectedTopic();

    if (curTopic?.set_inline) {
      setLoadingMessages(false);
      return;
    }

    setMessages([]);
    const fetchMessagesAbortController = new AbortController();
    void fetchMessages(curTopic?.id, fetchMessagesAbortController);

    onCleanup(() => {
      fetchMessagesAbortController.abort();
    });
  });

  const submitNewMessage = () => {
    const topic_id = props.selectedTopic()?.id;
    if (!topic_id || !newMessageContent() || streamingCompletion()) {
      return;
    }
    void fetchCompletion({
      new_message_content: newMessageContent(),
      topic_id,
    });
  };

  return (
    <>
      <Show
        when={
          (loadingMessages() && props.selectedTopic()) ||
          (streamingCompletion() && messages().length == 0)
        }
      >
        <div class="flex w-full flex-col">
          <div class="flex w-full flex-col items-center justify-center">
            <img src="/thinking.gif" class="aspect-square w-[128px]" />
          </div>
        </div>
      </Show>
      <Show when={!loadingMessages() || !props.selectedTopic()}>
        <div class="relative flex w-full flex-col justify-between">
          <div class="flex flex-col items-center pb-32" id="topic-messages">
            <For each={messages()}>
              {(message, idx) => {
                return (
                  <AfMessage
                    normalChat={!!props.selectedTopic()?.normal_chat}
                    role={messageRoleFromIndex(idx())}
                    content={message.content}
                    streamingCompletion={streamingCompletion}
                    onEdit={(content: string) => {
                      const newMessage: Message = {
                        content: "",
                      };
                      setMessages((prev) => {
                        return [...prev.slice(0, idx() + 1), newMessage];
                      });
                      completionAbortController().abort();
                      setCompletionAbortController(new AbortController());
                      fetch(`${apiHost}/message`, {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        credentials: "include",
                        signal: completionAbortController().signal,
                        body: JSON.stringify({
                          new_message_content: content,
                          message_sort_order: idx(),
                          topic_id: props.selectedTopic()?.id,
                        }),
                      })
                        .then((response) => {
                          if (!response.ok) {
                            return;
                          }
                          const reader = response.body?.getReader();
                          if (!reader) {
                            return;
                          }
                          setStreamingCompletion(true);
                          setDisableAutoScroll(false);
                          handleReader(reader).catch((e) => {
                            console.error("Error handling reader: ", e);
                          });
                        })
                        .catch((e) => {
                          console.error(
                            "Error fetching completion on edit message: ",
                            e,
                          );
                        });
                    }}
                  />
                );
              }}
            </For>
          </div>

          <div class="dark:via-zinc-800 dark:to-zinc-900 fixed bottom-0 right-0 flex w-full flex-col items-center space-y-4 via-zinc-200 to-zinc-100 p-4 lg:w-4/5">
            <Show when={messages().length > 0}>
              <div class="flex w-full justify-center">
                <Show when={!streamingCompletion()}>
                  <button
                    classList={{
                      "flex w-fit items-center justify-center space-x-4 rounded-xl bg-neutral-50 px-4 py-2 text-sm dark:bg-neutral-700 dark:text-white":
                        true,
                      "ml-auto": !atMessageBottom(),
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      const topic_id = props.selectedTopic()?.id;
                      if (!topic_id) {
                        return;
                      }
                      void fetchCompletion({
                        new_message_content: "",
                        topic_id,
                        regenerateLastMessage: true,
                      });
                    }}
                  >
                    <FiRefreshCcw />
                    <p>Regenerate Response</p>
                  </button>
                </Show>
                <Show when={streamingCompletion()}>
                  <button
                    classList={{
                      "flex w-fit items-center justify-center space-x-4 rounded-xl bg-neutral-50 px-4 py-2 text-sm dark:bg-neutral-700 dark:text-white":
                        true,
                      "ml-auto": !atMessageBottom(),
                    }}
                    onClick={() => {
                      completionAbortController().abort();
                      setCompletionAbortController(new AbortController());
                      setStreamingCompletion(false);
                    }}
                  >
                    <FiStopCircle class="h-5 w-5" />
                    <p>Stop Generating</p>
                  </button>
                </Show>
                <Show when={!atMessageBottom()}>
                  <button
                    class="dark:bg-neutral-700 dark:text-white ml-auto flex w-fit items-center justify-center space-x-4 rounded-full bg-neutral-50 p-2 text-sm"
                    onClick={() => {
                      scrollToBottomOfMessages();
                    }}
                  >
                    <FiArrowDown class="h-5 w-5" />
                  </button>
                </Show>
              </div>
            </Show>

            <div class="flex w-full flex-col">
              <div class="flex items-center">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setQuizMode((quizMode) => !quizMode);
                  }}
                  classList={{
                    "bg-beige my-2 flex max-w-fit flex-row items-center rounded-md border border-black px-3 py-1 hover:bg-neutral-200":
                      true,
                    "bg-secondary dark:bg-neutral-700": quizMode(),
                  }}
                >
                  <div class="flex flex-row items-center space-x-2">
                    <span class="text-xl">
                      <BsPencilFill />
                    </span>
                    <span>{answerMode() ? "Answer mode" : "Quiz mode"}</span>
                  </div>
                </button>
                <Show when={quizMode()}>
                  <p class="bg-background pl-3">
                    {answerMode()
                      ? "Insert your answers to the above questions in the appropriate format:"
                      : "Insert the topic you want to quiz on:"}
                  </p>
                </Show>
              </div>
              <div class="flex w-full flex-row">
                <form class="relative flex h-fit max-h-[calc(100vh-32rem)] w-full flex-col items-center overflow-y-auto overflow-x-hidden rounded-xl bg-neutral-50 py-1 pl-4 pr-6 text-neutral-800">
                  <Show when={props.isCreatingNormalTopic()}>
                    <button
                      classList={{
                        "flex h-10 w-10 items-center justify-center absolute left-[0px] bottom-0":
                          true,
                        "text-neutral-400": !newMessageContent(),
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        props.setOpeniFrame(true);
                        props.setGetSpecficFiles(true);
                      }}
                    >
                      <FaSolidPlus />
                    </button>
                  </Show>
                  <textarea
                    id="new-message-content-textarea"
                    class="ml-10 w-full resize-none whitespace-pre-wrap bg-transparent py-1 scrollbar-thin scrollbar-track-neutral-200 scrollbar-thumb-neutral-400 scrollbar-track-rounded-md scrollbar-thumb-rounded-md focus:outline-none"
                    placeholder={
                      props.isCreatingNormalTopic() &&
                      props.docText().length === 0
                        ? "Specify documents to chat with!"
                        : "Write a question or prompt for the assistant..."
                    }
                    value={newMessageContent()}
                    disabled={
                      streamingCompletion() ||
                      (props.isCreatingNormalTopic() &&
                        props.docText().length === 0)
                    }
                    onInput={(e) => resizeTextarea(e.target)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const new_message_content = newMessageContent();
                        if (!new_message_content) {
                          return;
                        }
                        const topic_id = props.selectedTopic()?.id;
                        void fetchCompletion({
                          new_message_content,
                          topic_id,
                        });
                        return;
                      }
                    }}
                    rows="1"
                  />
                  <button
                    type="submit"
                    classList={{
                      "flex h-10 w-10 items-center justify-center absolute right-[0px] bottom-0":
                        true,
                      "text-neutral-400": !newMessageContent(),
                    }}
                    disabled={!newMessageContent() || streamingCompletion()}
                    onClick={(e) => {
                      e.preventDefault();
                      submitNewMessage();
                    }}
                  >
                    <FiSend />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};

export default MainLayout;
