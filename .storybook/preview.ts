import type { Preview } from "@storybook/web-components-vite";

const preview: Preview = {
  parameters: {
    a11y: { test: "error" },
    backgrounds: {
      default: "host-page",
      values: [
        { name: "host-page", value: "#eceff3" },
        { name: "dark-host", value: "#17181d" },
      ],
    },
    controls: { expanded: true },
    layout: "fullscreen",
  },
};

export default preview;
