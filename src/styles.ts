export const SHELL_STYLES = `
  :host {
    --ws-accent: #5757d9;
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
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-end;
    pointer-events: none;
  }

  .ws-anchor[data-placement^="bottom"] { bottom: var(--ws-gutter); }
  .ws-anchor[data-placement^="top"] { top: var(--ws-gutter); flex-direction: column-reverse; align-items: flex-start; }
  .ws-anchor[data-placement$="end"] { right: var(--ws-gutter); }
  .ws-anchor[data-placement$="start"] { left: var(--ws-gutter); }

  .ws-window {
    position: relative;
    width: min(var(--ws-width), calc(100dvw - var(--ws-gutter) * 2));
    height: min(var(--ws-height), calc(100dvh - var(--ws-gutter) * 2 - 66px));
    overflow: hidden;
    border: 1px solid var(--ws-border);
    border-radius: var(--ws-radius);
    background: var(--ws-surface);
    box-shadow: var(--ws-shadow);
    pointer-events: auto;
    transform-origin: bottom right;
    transition: opacity 150ms ease, transform 180ms cubic-bezier(.2,.8,.2,1);
  }

  .ws-window[hidden] { display: none; }
  .ws-window[data-phase="opening"] { opacity: 0; transform: translateY(8px) scale(.985); }
  .ws-window[data-phase="open"], .ws-window[data-phase="error"] { opacity: 1; transform: none; }

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
  .ws-launcher:focus-visible, .ws-retry:focus-visible { outline: 3px solid color-mix(in srgb, var(--ws-accent), white 35%); outline-offset: 3px; }
  .ws-launcher svg, .ws-launcher img { display: block; width: 26px; height: 26px; object-fit: contain; }

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

  @keyframes ws-spin { to { transform: rotate(360deg); } }

  @media (max-width: 430px), (max-height: 560px) {
    .ws-anchor { inset: 0; }
    .ws-window {
      width: 100dvw;
      height: 100dvh;
      max-width: none;
      max-height: none;
      border: 0;
      border-radius: 0;
    }
    .ws-launcher-wrap { position: fixed; right: 12px; bottom: 12px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .ws-window { transition: none; }
    .ws-spinner { animation-duration: 1.6s; }
  }
`;
