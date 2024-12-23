/* eslint-disable prettier/prettier */
import { AiFillGithub } from "solid-icons/ai";
import {
  BiLogosGithub,
  BiLogosTwitch,
  BiLogosTwitter,
  BiLogosYoutube,
} from "solid-icons/bi";
import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import { A, useSearchParams } from "solid-start";
import ThemeModeController from "~/components/Navbar/ThemeModeController";
import { detectReferralToken } from "~/types/actix-api";

export default function Home() {
  const apiHost: string = import.meta.env.VITE_API_HOST as unknown as string;
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = createSignal<boolean>(false);

  detectReferralToken(searchParams.t);

  createEffect(() => {
    const abort_controller = new AbortController();

    void fetch(`${apiHost}/auth`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      signal: abort_controller.signal,
    }).then((response) => {
      if (!response.ok) {
        setIsLogin(false);
        return;
      }
      setIsLogin(true);
    });

    onCleanup(() => {
      abort_controller.abort();
    });
  });

  return (
    <div class="dark:bg-neutral-900 dark:text-neutral-50 flex min-h-screen flex-col text-neutral-900">
      <div class="bg-gradient-radial-t from-magenta-400 p-4">
        <div class="dark:bg-neutral-800 flex items-center justify-end rounded-lg bg-beige px-4 py-3 shadow-md sm:justify-between lg:m-auto lg:max-w-5xl">
          <div class="hidden items-center sm:flex">
            <img
              class="w-10"
              src="/logo.png"
              alt="Logo"
              elementtiming={""}
              fetchpriority={"high"}
            />
          </div>
          <div class="flex items-center gap-4">
            <A
              class="dark:text-neutral-900 rounded-lg bg-secondary px-4 py-2 font-semibold"
              href={isLogin() ? "/chat" : "/register"}
            >
              Chat Now
            </A>
          </div>
        </div>
        <div class="py-4" />
        <div class="flex flex-col items-center space-y-8">
          <div>
            <div class="text-5xl md:text-6xl">
              <span class="text-primaryDark">Study Sphere</span>
            </div>
          </div>
          <p class="text-center text-lg">
            Hey, I'm Sia! I supercharge your notes with helpful questions and
            insights.
          </p>
          <A
            class="rounded-lg bg-secondary px-4 py-2 font-semibold text-black shadow-md"
            href={"/chat"}
          >
            Chat with me!
          </A>
        </div>
      </div>
      <div class="flex-1" />
      <footer class="bg-gradient-radial-b mt-14 flex flex-col items-center from-magenta pb-4 pt-20">
        <div class="flex items-center">
          <img
            class="w-14"
            src="/logo.png"
            alt=""
            elementtiming={""}
            fetchpriority={"high"}
          />
        </div>
        <div class="py-2" />
      </footer>
    </div>
  );
}
