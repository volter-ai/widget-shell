export const SHELL_STYLES = `
  :host {
    --ws-accent: #17171c;
    --ws-surface: #ffffff;
    --ws-surface-muted: #f4f4f7;
    --ws-text: #17171c;
    --ws-text-muted: #666673;
    --ws-border: rgba(20, 20, 28, 0.14);
    --ws-shadow: 0 18px 60px rgba(16, 18, 30, 0.2), 0 3px 12px rgba(16, 18, 30, 0.12);
    --ws-radius: 18px;
    all: initial;
    color-scheme: light dark;
  }

  * { box-sizing: border-box; }

  .ws-stage {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    pointer-events: none;
    font: 14px/1.4 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .ws-anchor {
    position: absolute;
    left: var(--ws-x);
    top: var(--ws-y);
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-end;
    pointer-events: none;
  }

  .ws-anchor[data-placement^="top"] {
    flex-direction: column-reverse;
    align-items: flex-start;
  }

  .ws-panel {
    position: relative;
    width: var(--ws-width);
    height: var(--ws-height);
    pointer-events: auto;
    transform-origin: bottom right;
    transition: opacity 150ms ease, transform 180ms cubic-bezier(.2,.8,.2,1);
  }

  .ws-panel[data-hidden="true"] {
    display: block;
    visibility: hidden;
    pointer-events: none;
  }

  .ws-panel[data-phase="opening"] { opacity: 0; transform: translateY(8px) scale(.985); }
  .ws-panel[data-phase="open"], .ws-panel[data-phase="error"] { opacity: 1; transform: none; }
  .ws-panel[data-interacting] { user-select: none; }
  .ws-panel[data-interacting] .ws-frame { pointer-events: none; }

  .ws-window {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border: 1px solid var(--ws-border);
    border-radius: var(--ws-radius);
    background: var(--ws-surface);
    box-shadow: var(--ws-shadow);
  }

  .ws-frame {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: var(--ws-surface);
  }

  .ws-loading,
  .ws-error {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    place-content: center;
    gap: 12px;
    padding: 24px;
    text-align: center;
    color: var(--ws-text-muted);
    background: var(--ws-surface);
  }

  .ws-loading[hidden], .ws-error[hidden] { display: none; }

  .ws-spinner {
    width: 24px;
    height: 24px;
    margin: auto;
    border: 2px solid var(--ws-border);
    border-top-color: var(--ws-accent);
    border-radius: 50%;
    animation: ws-spin 800ms linear infinite;
  }

  .ws-retry {
    justify-self: center;
    padding: 8px 12px;
    border: 1px solid var(--ws-border);
    border-radius: 9px;
    color: var(--ws-text);
    background: var(--ws-surface-muted);
    cursor: pointer;
  }

  .ws-drag-handle,
  .ws-resize-handle {
    position: absolute;
    z-index: 4;
    border: 0;
    color: var(--ws-text-muted);
    background: transparent;
    opacity: .58;
    cursor: grab;
    touch-action: none;
  }

  .ws-drag-handle {
    top: -9px;
    left: 50%;
    width: 48px;
    height: 22px;
    padding: 0;
    transform: translateX(-50%);
  }

  .ws-drag-handle::after {
    position: absolute;
    top: 7px;
    left: 10px;
    width: 28px;
    height: 5px;
    border: 1px solid var(--ws-border);
    border-radius: 3px;
    background: var(--ws-surface-muted);
    content: "";
  }

  .ws-resize-handle {
    right: 0;
    bottom: 0;
    width: 30px;
    height: 30px;
    cursor: nwse-resize;
  }

  .ws-resize-handle::after {
    position: absolute;
    right: 6px;
    bottom: 6px;
    width: 9px;
    height: 9px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    content: "";
  }

  .ws-panel[data-interacting="move"] .ws-drag-handle { cursor: grabbing; opacity: 1; }
  .ws-drag-handle:hover, .ws-resize-handle:hover { opacity: 1; }

  .ws-launcher-wrap {
    position: relative;
    padding: 4px;
    pointer-events: auto;
  }

  .ws-launcher {
    display: grid;
    width: 54px;
    height: 54px;
    place-items: center;
    border: 1px solid rgba(255,255,255,.22);
    border-radius: 16px;
    color: white;
    background: var(--ws-accent);
    box-shadow: 0 8px 30px rgba(25, 25, 50, .25);
    cursor: pointer;
  }

  .ws-launcher:hover { filter: brightness(1.06); }
  .ws-launcher:focus-visible,
  .ws-retry:focus-visible,
  .ws-drag-handle:focus-visible,
  .ws-resize-handle:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--ws-accent), white 35%);
    outline-offset: 3px;
  }
  .ws-launcher svg, .ws-launcher img {
    display: block;
    width: 26px;
    height: 26px;
    object-fit: contain;
  }

  .ws-badge {
    position: absolute;
    top: -1px;
    right: -1px;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border: 2px solid var(--ws-surface);
    border-radius: 10px;
    color: white;
    background: #d92d20;
    font: 700 11px/16px ui-sans-serif, sans-serif;
    text-align: center;
  }

  .ws-badge[hidden] { display: none; }

  .ws-announcer {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .ws-anchor[data-mode="sheet"] {
    inset: auto 8px 8px;
    align-items: flex-end;
    flex-direction: column;
  }

  .ws-anchor[data-mode="sheet"] .ws-panel {
    width: calc(100dvw - 16px);
    height: min(var(--ws-height), calc(100dvh - 82px));
  }

  .ws-anchor[data-mode="sheet"] .ws-drag-handle,
  .ws-anchor[data-mode="sheet"] .ws-resize-handle,
  .ws-anchor[data-mode="fullscreen"] .ws-drag-handle,
  .ws-anchor[data-mode="fullscreen"] .ws-resize-handle { display: none; }

  .ws-anchor[data-mode="fullscreen"] {
    inset: 0;
    display: block;
  }

  .ws-anchor[data-mode="fullscreen"] .ws-panel {
    width: 100dvw;
    height: 100dvh;
  }

  .ws-anchor[data-mode="fullscreen"] .ws-window {
    border: 0;
    border-radius: 0;
  }

  .ws-anchor[data-mode="fullscreen"] .ws-launcher-wrap {
    position: fixed;
    right: 12px;
    bottom: 12px;
  }

  .ws-anchor[data-mode="fullscreen"][data-open="true"] .ws-launcher-wrap {
    top: 12px;
    bottom: auto;
  }

  @keyframes ws-spin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .ws-panel { transition: none; }
    .ws-spinner { animation-duration: 1.6s; }
  }
`;
