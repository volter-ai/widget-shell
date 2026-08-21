import { defineConfig } from "wxt";

export default defineConfig({
  imports: false,
  manifest: {
    name: "Widget Shell · WXT example",
    permissions: ["storage"],
    browser_specific_settings: {
      gecko: {
        id: "widget-shell-wxt-example@volter.ai",
        data_collection_permissions: { required: ["none"] },
      },
    },
    web_accessible_resources: [
      {
        resources: ["app.html"],
        matches: ["https://example.com/*"],
      },
    ],
  },
});
