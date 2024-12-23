import { Show, createEffect, createSignal } from "solid-js";
import { useSearchParams } from "solid-start";
import { FullScreenModal } from "~/components/Atoms/FullScreenModal";
import MainLayout from "~/components/Layouts/MainLayout";
import { Navbar } from "~/components/Navbar/Navbar";
import { Sidebar } from "~/components/Navbar/Sidebar";
import { detectReferralToken, isTopic } from "~/types/actix-api";
import { Topic } from "~/types/topics";

export const chat = () => {
  const apiHost: string = import.meta.env.VITE_API_HOST as unknown as string;
  const parserHost = "https://studysphere-parser.arguflow.ai";

  const [searchParams] = useSearchParams();
  const [selectedTopic, setSelectedTopic] = createSignal<Topic | undefined>(
    undefined,
  );
  const [openiFrame, setOpeniFrame] = createSignal(false);

  const [sidebarOpen, setSideBarOpen] = createSignal<boolean>(true);
  const [isCreatingTopic, setIsCreatingTopic] = createSignal<boolean>(true);
  const [isCreatingNormalTopic, setIsCreatingNormalTopic] =
    createSignal<boolean>(false);
  const [topics, setTopics] = createSignal<Topic[]>([]);
  const [isLogin, setIsLogin] = createSignal<boolean>(false);
  const [docText, setDocText] = createSignal<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = createSignal<boolean>(false);
  const [getSpecficFiles, setGetSpecficFiles] = createSignal<boolean>(false);
  detectReferralToken(searchParams.t);

  createEffect(() => {
    void fetch(`${apiHost}/auth`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }).then((response) => {
      setIsLogin(response.ok);
      if (
        !response.ok &&
        !(
          window.location.pathname.includes("/auth/") ||
          window.location.pathname === "/"
        )
      ) {
        window.location.href = "/auth/login";
        return;
      }
    });

    function getCookie(cname: string): string {
      const name = cname + "=";
      const decodedCookie = decodeURIComponent(document.cookie);
      const ca = decodedCookie.split(";");
      for (const c of ca) {
        let cookie = c;
        while (cookie.startsWith(" ")) {
          cookie = cookie.substring(1);
        }
        if (cookie.startsWith(name)) {
          return cookie.substring(name.length, cookie.length);
        }
      }
      return "";
    }

    let selected_ids: any;
    window.document.addEventListener("ids_selected", (e) => {
      if (e.detail) {
        console.log(e.detail);
        selected_ids = e.detail.split(",").slice(0, -1);
        if (!getSpecficFiles()) {
          fetch(`${apiHost}/user/set_api_key`, {
            credentials: "include",
            method: "GET",
          })
            .then((response) => {
              if (response.ok) {
                response
                  .json()
                  .then((data) => {
                    fetch(`${parserHost}/upload_gdrive`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      credentials: "include",
                      body: JSON.stringify({
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        filesIds: selected_ids,
                        google_credentials: localStorage.getItem("accessToken"),
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                        vault_api_key: data.api_key,
                      }),
                    })
                      .then((response) => {
                        if (response.ok) {
                          console.log("success");
                          setUploadingFiles(false);
                        }
                      })
                      .catch((e) => {
                        console.log(e);
                      });
                  })
                  .catch((e) => {
                    console.log(e);
                  });
              }
            })
            .catch((e) => {
              console.log(e);
            });
        } else if (getSpecficFiles()) {
          fetch(`${parserHost}/get_text`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              filesIds: selected_ids,
              google_credentials: localStorage.getItem("accessToken"),
            }),
          })
            .then((response) => {
              if (response.ok) {
                response
                  .text()
                  .then((data) => {
                    setDocText(JSON.parse(data));
                    setGetSpecficFiles(false);
                    console.log(data);
                  })
                  .catch((e) => {
                    console.log(e);
                  });
              }
            })
            .catch((e) => {
              console.log(e);
            });
        }
      }
    });
  });

  const refetchTopics = async (): Promise<Topic[]> => {
    const response = await fetch(`${apiHost}/topic`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    if (!response.ok) return [];

    const data: unknown = await response.json();
    if (data !== null && typeof data === "object" && Array.isArray(data)) {
      const topics = data.filter((topic: unknown) => {
        return isTopic(topic);
      }) as Topic[];
      setTopics(topics);
      return topics;
    }

    return [];
  };

  createEffect(() => {
    void refetchTopics();
  });

  return (
    <Show when={isLogin()}>
      <FullScreenModal isOpen={openiFrame} setIsOpen={setOpeniFrame}>
        <iframe
          src="/filePicker.html"
          class="min-h-[1000px] min-w-[1000px]"
          name="file_picker"
        />
      </FullScreenModal>
      <div class="dark:bg-zinc-900 relative flex h-screen flex-row bg-background">
        <div class="hidden w-1/4 overflow-x-hidden lg:block">
          <Sidebar
            currentTopic={selectedTopic}
            setCurrentTopic={setSelectedTopic}
            refetchTopics={refetchTopics}
            topics={topics}
            setIsCreatingTopic={setIsCreatingTopic}
            setSideBarOpen={setSideBarOpen}
            setIsCreatingNormalTopic={setIsCreatingNormalTopic}
            setOpeniFrame={setOpeniFrame}
            setUploadingFiles={setUploadingFiles}
          />
        </div>
        <div class="lg:hidden">
          <Show when={sidebarOpen()}>
            <Sidebar
              currentTopic={selectedTopic}
              setCurrentTopic={(topic: Topic | undefined) => {
                setIsCreatingTopic(false);
                setSelectedTopic(topic);
              }}
              refetchTopics={refetchTopics}
              topics={topics}
              setIsCreatingTopic={setIsCreatingTopic}
              setSideBarOpen={setSideBarOpen}
              setIsCreatingNormalTopic={setIsCreatingNormalTopic}
              setOpeniFrame={setOpeniFrame}
              setUploadingFiles={setUploadingFiles}
            />
          </Show>
        </div>
        <div
          id="topic-layout"
          class="dark:scrollbar-track-neutral-800 dark:scrollbar-thumb-neutral-600 w-full overflow-y-auto scrollbar-thin scrollbar-track-neutral-200 scrollbar-thumb-neutral-400 scrollbar-track-rounded-md scrollbar-thumb-rounded-md"
        >
          <Navbar
            selectedTopic={selectedTopic}
            setSideBarOpen={setSideBarOpen}
            isCreatingTopic={isCreatingTopic}
            setIsCreatingTopic={setIsCreatingTopic}
            isCreatingNormalTopic={isCreatingNormalTopic}
            setIsCreatingNormalTopic={setIsCreatingNormalTopic}
          />
          <MainLayout
            setTopics={setTopics}
            setSelectedTopic={setSelectedTopic}
            isCreatingNormalTopic={isCreatingNormalTopic}
            selectedTopic={selectedTopic}
            setOpeniFrame={setOpeniFrame}
            setGetSpecficFiles={setGetSpecficFiles}
            docText={docText}
          />
        </div>
      </div>
    </Show>
  );
};

export default chat;
