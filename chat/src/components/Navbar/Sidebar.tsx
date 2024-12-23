import {
  BiRegularBrain,
  BiRegularChat,
  BiRegularCheck,
  BiRegularLogOut,
  BiRegularPlus,
  BiRegularTrash,
  BiRegularUpload,
  BiRegularX,
} from "solid-icons/bi";
import { Accessor, createSignal, For, Setter, Show } from "solid-js";
import type { Topic } from "~/types/topics";

export interface SidebarProps {
  topics: Accessor<Topic[]>;
  refetchTopics: () => Promise<Topic[]>;
  setIsCreatingTopic: (value: boolean) => boolean;
  currentTopic: Accessor<Topic | undefined>;
  setCurrentTopic: (topic: Topic | undefined) => void;
  setSideBarOpen: Setter<boolean>;
  setIsCreatingNormalTopic: Setter<boolean>;
  setOpeniFrame: Setter<boolean>;
  setUploadingFiles: Setter<boolean>;
}

export const Sidebar = (props: SidebarProps) => {
  const apiHost = import.meta.env.VITE_API_HOST as unknown as string;

  const [editingIndex, setEditingIndex] = createSignal(-1);
  const [editingTopic, setEditingTopic] = createSignal("");
  const submitEditText = async () => {
    const topics = props.topics();
    const topic = topics[editingIndex()];

    const res = await fetch(`${apiHost}/topic`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        topic_id: topic.id,
        side: topic.side,
        resolution: editingTopic(),
      }),
    });

    if (!res.ok) {
      console.log("Error changing topic name (need toast)");
      return;
    }

    setEditingIndex(-1);
    void props.refetchTopics();
  };

  const deleteSelected = async () => {
    const res = await fetch(`${apiHost}/topic`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        topic_id: props.currentTopic()?.id,
      }),
    });

    if (res.ok) {
      props.setCurrentTopic(undefined);
      void props.refetchTopics();
    }
  };

  const logout = () => {
    void fetch(`${apiHost}/auth`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }).then((response) => {
      if (!response.ok) {
        return;
      }
      window.location.href = "/auth/login";
    });
  };

  return (
    <div class="dark:text-gray-50 absolute z-50 flex h-screen w-screen flex-row bg-beige lg:relative lg:w-full">
      <div class="dark:bg-neutral-800 flex h-full w-2/3 flex-col bg-beige-900 lg:w-full">
        <div class="flex w-full flex-col space-y-2 px-2 py-2 ">
          <a href="/" class="flex items-center space-x-1 px-3 py-2">
            <div class="flex items-center">
              <img class="max-w-[50px]" src="./logo.png" />
              <div class="pl-2 text-lg">
                <span>StudySphere</span>
              </div>
            </div>
          </a>
          <button
            onClick={() => {
              props.setIsCreatingNormalTopic(false);
              props.setIsCreatingTopic(true);
              props.setCurrentTopic(undefined);
              props.setSideBarOpen(false);
            }}
            class="dark:border-neutral-400 dark:hover:bg-neutral-700 flex w-full flex-row items-center rounded-md border border-black px-3  py-1 hover:bg-neutral-200"
          >
            <div class="flex flex-row items-center space-x-2">
              <span class="text-xl">
                <BiRegularPlus class="fill-current" />
              </span>
              <span>Chat with all notes</span>
            </div>
          </button>
          <button
            onClick={() => {
              props.setIsCreatingTopic(false);
              props.setIsCreatingNormalTopic(true);
              props.setCurrentTopic(undefined);
              props.setSideBarOpen(false);
            }}
            class="dark:border-neutral-400 dark:hover:bg-neutral-700 flex w-full flex-row items-center rounded-md border border-black px-3  py-1 hover:bg-neutral-200"
          >
            <div class="flex flex-row items-center space-x-2">
              <span class="text-xl">
                <BiRegularPlus class="fill-current" />
              </span>
              <span>Chat with selected notes</span>
            </div>
          </button>
        </div>
        <div class="dark:scrollbar-track-neutral-800 dark:scrollbar-thumb-neutral-600 flex w-full flex-col space-y-2 overflow-y-auto overflow-x-hidden px-2 scrollbar-thin scrollbar-track-neutral-200 scrollbar-thumb-neutral-400 scrollbar-track-rounded-md scrollbar-thumb-rounded-md">
          <For each={props.topics()}>
            {(topic, index) => (
              <button
                classList={{
                  "flex items-center space-x-4 py-2 w-full rounded-md": true,
                  "bg-neutral-200 dark:bg-neutral-700":
                    props.currentTopic()?.id === topic.id,
                }}
                onClick={() => {
                  const topics = props.topics();
                  const topic = topics[index()];

                  props.setCurrentTopic(topic);
                  props.setIsCreatingTopic(false);
                  props.setIsCreatingNormalTopic(false);
                  props.setSideBarOpen(false);
                }}
              >
                {editingIndex() === index() && (
                  <div class="flex flex-1 items-center justify-between px-2">
                    <input
                      value={editingTopic()}
                      onInput={(e) => {
                        setEditingTopic(e.currentTarget.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void submitEditText();
                        }
                      }}
                      class="dark:bg-neutral-800 w-full rounded-md bg-neutral-50 px-2 py-1"
                    />

                    <div class="flex flex-row space-x-1 pl-2 text-2xl ">
                      <button
                        onClick={() => {
                          void submitEditText();
                        }}
                        class="hover:text-green-500"
                      >
                        <BiRegularCheck />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setEditingIndex(-1);
                        }}
                        class="hover:text-red-500"
                      >
                        <BiRegularX />
                      </button>
                    </div>
                  </div>
                )}
                {editingIndex() !== index() && (
                  <div class="flex flex-1 items-center px-3">
                    <Show when={topic.normal_chat}>
                      <BiRegularChat class="mr-2 fill-current" />
                    </Show>
                    <Show when={!topic.normal_chat}>
                      <BiRegularBrain class="mr-2 fill-current" />
                    </Show>
                    <p class="line-clamp-1 break-all">{topic.resolution}</p>
                    <div class="flex-1" />
                    <div class="flex flex-row items-center space-x-2">
                      {props.currentTopic() == topic && (
                        <div class="text-lg hover:text-purple-500">
                          <BiRegularTrash
                            class="fill-current"
                            onClick={() => {
                              void deleteSelected();
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </button>
            )}
          </For>
        </div>
        <div class="flex-1 " />
        <div class="dark:border-neutral-400 flex w-full flex-col space-y-1 border-t px-2 py-2">
          <button
            class="dark:hover:bg-neutral-700 flex w-full items-center  space-x-4 rounded-md px-3 py-2   hover:bg-neutral-200"
            onClick={() => props.setOpeniFrame(true)}
          >
            <BiRegularUpload class="h-6 w-6 fill-current" />
            <div>Upload Notes</div>
          </button>
          <button
            class="dark:hover:bg-neutral-700 flex w-full items-center space-x-4 rounded-md px-3 py-2   hover:bg-neutral-200"
            onClick={logout}
          >
            <BiRegularLogOut class="h-6 w-6 fill-current" />
            <div>Logout</div>
          </button>
        </div>
      </div>
      <button
        class="w-1/3 flex-col bg-gray-500/5 backdrop-blur-[3px] lg:hidden"
        onClick={(e) => {
          e.preventDefault();
          props.setSideBarOpen(false);
        }}
      >
        <div class="ml-4 text-3xl">
          <BiRegularX />
        </div>
      </button>
    </div>
  );
};
