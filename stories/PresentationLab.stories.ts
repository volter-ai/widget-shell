import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createOverlay,
  type OverlayController,
  type OverlayPresentation,
  type PresentationSnapshot,
} from "../src";

interface PresentationLabArgs {
  presentation: "responsive" | "content-fit" | "virtual";
  surface: "auto" | "floating" | "sheet" | "fullscreen";
  physicalWidth: number;
  physicalHeight: number;
  logicalWidth: number;
  logicalHeight: number;
  contentWidth: number;
  contentHeight: number;
  minimumScale: number;
  allowUpscale: boolean;
}

let labSequence = 0;

function presentationFor(args: PresentationLabArgs): OverlayPresentation {
  if (args.presentation === "content-fit") {
    return {
      footprint: {
        mode: "content-fit",
        preferred: { width: args.physicalWidth, height: args.physicalHeight },
        min: { width: 280, height: 180 },
        max: { width: 720, height: 800 },
      },
      viewport: { mode: "responsive" },
      surface: args.surface,
    };
  }
  return {
    footprint: {
      mode: "resizable",
      preferred: { width: args.physicalWidth, height: args.physicalHeight },
    },
    viewport:
      args.presentation === "virtual"
        ? {
            mode: "virtual",
            width: args.logicalWidth,
            height: args.logicalHeight,
            fit: "contain",
            minimumScale: args.minimumScale,
            allowUpscale: args.allowUpscale,
          }
        : { mode: "responsive" },
    surface: args.surface,
  };
}

function guestDocument(args: PresentationLabArgs, named = false): string {
  const contentRequest =
    args.presentation === "content-fit"
      ? `request("presentation.content-size", { width: ${args.contentWidth}, height: ${args.contentHeight} });`
      : "";
  const controls = named
    ? `<nav aria-label="Presentation states">
        <button data-presentation="peek">Peek</button>
        <button data-presentation="panel">Panel</button>
        <button data-presentation="phone">Phone</button>
      </nav>`
    : "";
  return `<!doctype html>
    <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      *{box-sizing:border-box} body{margin:0;min-height:100%;color:#202127;background:#fafafa;font:14px/1.45 system-ui}
      header{position:sticky;top:0;padding:16px 18px;border-bottom:1px solid #ddd;background:#fff}
      main{display:grid;gap:14px;padding:18px} section{padding:16px;border:1px solid #ddd;border-radius:12px;background:#fff}
      nav{display:flex;gap:8px;padding:0 18px 18px} button{padding:8px 11px;border:1px solid #bbb;border-radius:8px;background:#fff}
      code{font:12px ui-monospace,monospace;color:#555}
    </style></head><body>
      <header><strong>Owned guest application</strong><br><code id="dimensions">Waiting for shell…</code></header>
      <main><section>Its layout viewport is real. The shell may display that viewport at a different physical scale.</section>
      <section>Resize the outer surface or change the Storybook controls without changing this application.</section></main>
      ${controls}
      <script>
        let parentOrigin; let instanceId; let sequence = 0; const pending = new Map();
        function request(capability, payload) {
          if (!parentOrigin || !instanceId) return;
          const requestId = instanceId + ":lab:" + (++sequence);
          pending.set(requestId, capability);
          parent.postMessage({ protocol:"widget-shell/v1", instanceId, type:"REQUEST", requestId, capability, payload }, parentOrigin);
        }
        addEventListener("message", (event) => {
          const message = event.data;
          if (message?.protocol !== "widget-shell/v1") return;
          if (message.type === "INIT") {
            parentOrigin = event.origin; instanceId = message.instanceId;
            parent.postMessage({ protocol:message.protocol, instanceId, type:"READY" }, parentOrigin);
            ${contentRequest}
            return;
          }
          if (message.instanceId !== instanceId) return;
          const snapshot = message.capability === "shell.presentation" ? message.payload : message.type === "RESPONSE" && message.ok ? message.payload : null;
          if (snapshot?.logical) document.querySelector("#dimensions").textContent = snapshot.logical.width + "×" + snapshot.logical.height + " logical · " + snapshot.physical.width + "×" + snapshot.physical.height + " physical · " + snapshot.scale.toFixed(3) + "×";
        });
        for (const button of document.querySelectorAll("[data-presentation]")) button.addEventListener("click", () => request("presentation.request", { name: button.dataset.presentation }));
      </script>
    </body></html>`;
}

function snapshotText(snapshot: PresentationSnapshot): string {
  return JSON.stringify(
    {
      state: snapshot.name ?? "direct",
      authority: snapshot.authority,
      surface: snapshot.surface,
      footprint: snapshot.footprint,
      viewport: snapshot.viewport,
      requested: snapshot.requested,
      physical: snapshot.physical,
      logical: snapshot.logical,
      scale: Number(snapshot.scale.toFixed(3)),
      overflow: snapshot.overflow,
      constraints: snapshot.constraints,
    },
    null,
    2,
  );
}

class PresentationLabFixture extends HTMLElement {
  controller?: OverlayController;
  stopPresentation?: () => void;

  configure(args: PresentationLabArgs, named = false): void {
    this.stopPresentation?.();
    this.controller?.destroy();
    this.replaceChildren();
    const inspector = document.createElement("pre");
    inspector.style.cssText =
      "position:fixed;top:20px;left:20px;z-index:2;max-width:340px;margin:0;padding:16px;border:1px solid #d7d9df;border-radius:12px;background:rgba(255,255,255,.94);box-shadow:0 8px 30px rgba(20,25,40,.1);font:12px/1.5 ui-monospace,monospace;white-space:pre-wrap";
    inspector.setAttribute("aria-label", "Resolved presentation geometry");
    this.append(inspector);

    const common = {
      id: `storybook-presentation-${++labSequence}`,
      target: this,
      content: {
        kind: "iframe" as const,
        srcdoc: guestDocument(args, named),
        title: "Presentation example application",
      },
      launcher: { label: "Open presentation example" },
      initiallyOpen: true,
    };
    this.controller = named
      ? createOverlay({
          ...common,
          presentations: {
            peek: {
              footprint: { mode: "content-fit", preferred: { width: 340, height: 180 } },
              viewport: { mode: "responsive" },
            },
            panel: presentationFor({ ...args, presentation: "responsive" }),
            phone: presentationFor({ ...args, presentation: "virtual" }),
          },
          initialPresentation: "panel",
        })
      : createOverlay({ ...common, presentation: presentationFor(args) });
    this.stopPresentation = this.controller.subscribePresentation((snapshot) => {
      inspector.textContent = snapshotText(snapshot);
    });
    this.controller.mount();
  }

  disconnectedCallback(): void {
    this.stopPresentation?.();
    this.controller?.destroy();
  }
}

if (!customElements.get("presentation-lab-fixture")) {
  customElements.define("presentation-lab-fixture", PresentationLabFixture);
}

function renderLab(args: PresentationLabArgs, named = false): HTMLElement {
  const page = document.createElement("main");
  page.style.cssText =
    "min-height:100vh;padding:48px;color:#30323a;background:linear-gradient(135deg,#f7f8fa,#e8ebf0);font:16px/1.5 system-ui";
  page.innerHTML = `<div style="max-width:620px;margin:180px auto 0"><h1>Geometry Lab</h1><p>Use Controls to change physical and logical dimensions independently. The inspector reports the shell’s resolved truth.</p></div>`;
  const fixture = document.createElement("presentation-lab-fixture") as PresentationLabFixture;
  page.append(fixture);
  fixture.configure(args, named);
  return page;
}

const meta = {
  title: "Shell/Presentation Geometry Lab",
  render: (args) => renderLab(args),
  args: {
    presentation: "responsive",
    surface: "auto",
    physicalWidth: 390,
    physicalHeight: 667,
    logicalWidth: 390,
    logicalHeight: 844,
    contentWidth: 360,
    contentHeight: 260,
    minimumScale: 0.75,
    allowUpscale: false,
  },
  argTypes: {
    presentation: { control: "select", options: ["responsive", "content-fit", "virtual"] },
    surface: { control: "select", options: ["auto", "floating", "sheet", "fullscreen"] },
    physicalWidth: { control: { type: "range", min: 280, max: 900, step: 10 } },
    physicalHeight: { control: { type: "range", min: 180, max: 900, step: 10 } },
    logicalWidth: { control: { type: "range", min: 280, max: 1440, step: 10 } },
    logicalHeight: { control: { type: "range", min: 180, max: 1200, step: 10 } },
    contentWidth: { control: { type: "range", min: 200, max: 900, step: 10 } },
    contentHeight: { control: { type: "range", min: 120, max: 1000, step: 10 } },
    minimumScale: { control: { type: "range", min: 0.5, max: 1, step: 0.05 } },
  },
} satisfies Meta<PresentationLabArgs>;

export default meta;
type Story = StoryObj<PresentationLabArgs>;

export const Responsive: Story = {};
export const ContentFit: Story = { args: { presentation: "content-fit" } };
export const VirtualPhone: Story = {
  args: {
    presentation: "virtual",
    physicalWidth: 320,
    physicalHeight: 600,
    minimumScale: 0.5,
  },
};
export const MinimumReadableScale: Story = {
  args: {
    presentation: "virtual",
    physicalWidth: 280,
    physicalHeight: 360,
    logicalWidth: 390,
    logicalHeight: 844,
    minimumScale: 0.75,
  },
};
export const GuestSelectedStates: Story = {
  render: (args) => renderLab(args, true),
};
