import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createOverlay, type OverlayController, type OverlayOptions } from "../src";

interface DemoArgs {
  open: boolean;
  badge: string;
  viewport: "mobile-sm" | "mobile-md" | "messenger";
  placement: "bottom-end" | "bottom-start" | "top-end" | "top-start";
  appState: "ready" | "loading" | "error";
  draggable: boolean;
  resizable: boolean;
  branded: boolean;
  responsive: "auto" | "sheet" | "fullscreen";
}

let demoSequence = 0;

class OverlayStoryFixture extends HTMLElement {
  controller?: OverlayController;

  configure(args: DemoArgs): void {
    this.controller?.destroy();
    const paths = {
      ready: "/demo-app.html",
      loading: "/silent-app.html",
      error: "/silent-app.html",
    } as const;
    const options: OverlayOptions = {
      id: `storybook-${++demoSequence}`,
      target: this,
      content: {
        kind: "iframe",
        src: paths[args.appState],
        title: "Example application",
      },
      launcher: {
        label: "Open example application",
        badge: args.badge,
        ...(args.branded
          ? {
              render: ({ open }: { open: boolean }) => {
                const mark = document.createElement("strong");
                mark.textContent = open ? "×" : "A";
                mark.style.cssText = "font:700 20px/1 ui-rounded,system-ui";
                return mark;
              },
            }
          : {}),
      },
      viewport: args.viewport,
      placement: args.placement,
      initiallyOpen: args.open,
      loadTimeoutMs: args.appState === "error" ? 250 : 60_000,
      behavior: {
        draggable: args.draggable,
        resizable: args.resizable,
        ...(args.responsive === "sheet"
          ? {
              breakpoints: {
                sheetWidth: 100_000,
                fullscreenWidth: 0,
                fullscreenHeight: 0,
              },
            }
          : args.responsive === "fullscreen"
            ? {
                breakpoints: {
                  sheetWidth: 100_000,
                  fullscreenWidth: 100_000,
                  fullscreenHeight: 100_000,
                },
              }
            : {}),
      },
      ...(args.branded
        ? {
            theme: {
              accent: "#006f62",
              radius: "11px",
              shadow: "0 18px 55px rgba(0, 62, 53, .22)",
            },
          }
        : {}),
    };
    this.controller = createOverlay(options);
    this.controller.mount();
  }

  disconnectedCallback(): void {
    this.controller?.destroy();
  }
}

class OverlayPairFixture extends HTMLElement {
  controllers: OverlayController[] = [];

  connectedCallback(): void {
    if (this.controllers.length > 0) return;
    const common = {
      target: this,
      content: { kind: "iframe" as const, src: "/demo-app.html", title: "Example application" },
      viewport: "messenger" as const,
      behavior: { coordination: "exclusive" as const },
    };
    this.controllers = [
      createOverlay({
        ...common,
        id: `storybook-pair-left-${++demoSequence}`,
        placement: "bottom-start",
        launcher: { label: "Open left application", badge: 3 },
        initiallyOpen: true,
      }),
      createOverlay({
        ...common,
        id: `storybook-pair-right-${++demoSequence}`,
        placement: "bottom-end",
        launcher: { label: "Open right application" },
      }),
    ];
    for (const controller of this.controllers) controller.mount();
  }

  disconnectedCallback(): void {
    for (const controller of this.controllers) controller.destroy();
    this.controllers = [];
  }
}

if (!customElements.get("overlay-story-fixture")) {
  customElements.define("overlay-story-fixture", OverlayStoryFixture);
}
if (!customElements.get("overlay-pair-fixture")) {
  customElements.define("overlay-pair-fixture", OverlayPairFixture);
}

function render(args: DemoArgs): HTMLElement {
  const page = document.createElement("main");
  page.style.cssText =
    "min-height:100vh;padding:48px;font:16px/1.5 system-ui;color:#31323a;background:linear-gradient(135deg,#f8f9fb,#e7ebf1)";
  page.innerHTML = `
    <h1 style="margin:0 0 12px;font-size:28px">Example host application</h1>
    <p style="max-width:620px">Widget Shell is mounted without changing this page's layout or inheriting its typography.</p>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;max-width:760px;margin-top:32px">
      <div style="height:130px;background:white;border-radius:7px"></div>
      <div style="height:130px;background:white;border-radius:31px"></div>
      <div style="height:130px;background:#25262d;border:6px dashed #da3155"></div>
    </div>
  `;
  const fixture = document.createElement("overlay-story-fixture") as OverlayStoryFixture;
  page.append(fixture);
  fixture.configure(args);
  return page;
}

function renderPair(): HTMLElement {
  const page = document.createElement("main");
  page.style.cssText =
    "min-height:100vh;padding:48px;font:16px/1.5 system-ui;color:#31323a;background:#eef0f4";
  page.innerHTML = `
    <h1 style="margin:0 0 12px;font-size:28px">Coordinated overlays</h1>
    <p>Open the right application: the exclusive coordinator closes the left without stealing focus.</p>
  `;
  page.append(document.createElement("overlay-pair-fixture"));
  return page;
}

const meta = {
  title: "Shell/Overlay",
  render,
  args: {
    open: true,
    badge: "",
    viewport: "mobile-sm",
    placement: "bottom-end",
    appState: "ready",
    draggable: true,
    resizable: true,
    branded: false,
    responsive: "auto",
  },
  argTypes: {
    viewport: { control: "select", options: ["mobile-sm", "mobile-md", "messenger"] },
    placement: {
      control: "select",
      options: ["bottom-end", "bottom-start", "top-end", "top-start"],
    },
    appState: { control: "select", options: ["ready", "loading", "error"] },
    responsive: { control: "select", options: ["auto", "sheet", "fullscreen"] },
  },
} satisfies Meta<DemoArgs>;

export default meta;
type Story = StoryObj<DemoArgs>;

export const MobileApplication: Story = {};
export const Collapsed: Story = { args: { open: false } };
export const WithBadge: Story = { args: { open: false, badge: "12" } };
export const Loading: Story = { args: { appState: "loading" } };
export const RecoverableError: Story = { args: { appState: "error" } };
export const CompactMessenger: Story = { args: { viewport: "messenger" } };
export const TopStart: Story = { args: { placement: "top-start" } };
export const Branded: Story = { args: { branded: true, badge: "7" } };
export const ResponsiveSheet: Story = { args: { responsive: "sheet" } };
export const Fullscreen: Story = { args: { responsive: "fullscreen" } };
export const CoordinatedOverlays: Story = { render: renderPair };
