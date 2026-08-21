import { connectOverlayApp } from "@volter-ai-dev/widget-shell/frame";
import { useEffect, useState } from "react";

const bridge = connectOverlayApp();

export default function OverlayApplication() {
  const [url, setUrl] = useState("");

  useEffect(() => () => bridge.destroy(), []);

  async function readPageUrl() {
    try {
      setUrl(await bridge.request<string>("page.url.read"));
    } catch (error) {
      setUrl(error instanceof Error ? error.message : "Request failed");
    }
  }

  return (
    <main style={{ padding: 24, font: "15px/1.5 system-ui, sans-serif" }}>
      <h1>Your existing app</h1>
      <p>This extension page receives only capabilities explicitly granted by its host.</p>
      <button type="button" onClick={readPageUrl}>
        Read host page URL
      </button>
      <output style={{ display: "block", marginTop: 18, overflowWrap: "anywhere" }}>{url}</output>
    </main>
  );
}
