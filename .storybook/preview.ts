import type { Preview } from "@storybook/react";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
  },
  // Toolbar switcher so the token theme can be previewed without changing the
  // OS setting. The teikn components read `[data-theme="dark"]`, so the
  // decorator just sets that attribute on <html>; "auto" defers to the OS.
  globalTypes: {
    theme: {
      description: "Token theme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
          { value: "auto", title: "Auto (OS)" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, ctx) => {
      const { theme } = ctx.globals;
      if (theme === "auto") {
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.setAttribute("data-theme", theme);
      }
      return Story();
    },
  ],
};

export default preview;
