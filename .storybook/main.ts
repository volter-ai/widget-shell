import type { StorybookConfig } from "@storybook/web-components-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.ts"],
  addons: ["@storybook/addon-a11y"],
  framework: {
    name: "@storybook/web-components-vite",
    options: {},
  },
  staticDirs: ["../public"],
  // the manager's frame in the brand's own stylesheet and Geist (company decision 0028), fetched at build
  managerHead: (head) =>
    `${head}<link rel="stylesheet" href="./brand/tokens.css"><style>body{font-family:var(--volter-font-ui)}</style>`,
  docs: {
    defaultName: "Documentation",
  },
};

export default config;
