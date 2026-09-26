// The Storybook manager in the Volter brand (company decision 0028); values resolved at build.
import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";
import { brandTheme } from "./brand-theme.generated";

addons.setConfig({ theme: create(brandTheme) });
