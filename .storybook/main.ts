import type { StorybookConfig } from "@storybook/web-components-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.ts"],
  addons: ["@storybook/addon-a11y"],
  framework: {
    name: "@storybook/web-components-vite",
    options: {},
  },
  staticDirs: ["../public"],
  docs: {
    defaultName: "Documentation",
  },
};

export default config;
