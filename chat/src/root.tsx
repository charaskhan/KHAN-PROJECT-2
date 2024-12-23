/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  ErrorBoundary,
  FileRoutes,
  Head,
  Html,
  Link,
  Meta,
  Routes,
  Scripts,
  Title,
} from "solid-start";
import UserStoreContext from "./components/contexts/UserStoreContext";
import "./root.css";
import ShowToast from "./components/ShowToast";

export default function Root() {
  const theme = (() => {
    if (typeof localStorage !== "undefined" && localStorage.getItem("theme")) {
      return localStorage.getItem("theme");
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  })();

  if (theme === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").then(
      function (registration) {
        console.log(
          "Service Worker registered with scope:",
          registration.scope,
        );
      },
      function (error) {
        console.log("Service Worker registration failed:", error);
      },
    );
  });

  return (
    <Html lang="en">
      <Head>
        <Title>Study Sphere Chat</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
        <Link rel="manifest" href="/manifest.json" />
        <script async={false} src="/sw.js" />
        <Meta name="theme-color" content="#5E5E5E" />

        <Meta
          name="description"
          content="Supercharge your notes with test generation and deep insights!"
        />

        {/* <Meta property="og:url" content="https://" /> */}
        <Meta property="og:type" content="website/" />
        <Meta property="og:title" content="Study Sphere Chat" />
        <Meta
          property="og:description"
          content="Supercharge your notes with test generation and deep insights"
        />
      </Head>
      <Body>
        <ErrorBoundary>
          <UserStoreContext>
            <ShowToast />
            <Routes>
              <FileRoutes />
            </Routes>
          </UserStoreContext>
        </ErrorBoundary>
        <Scripts />
      </Body>
    </Html>
  );
}
