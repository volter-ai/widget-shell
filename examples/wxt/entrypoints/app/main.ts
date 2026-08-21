import { connectOverlayApp } from "@volter-ai-dev/widget-shell/frame";

const bridge = connectOverlayApp();

document.querySelector("button")?.addEventListener("click", async () => {
  const output = document.querySelector("output");
  if (!output) return;
  try {
    output.textContent = await bridge.request<string>("page.url.read");
  } catch (error) {
    output.textContent = error instanceof Error ? error.message : "Request failed";
  }
});
