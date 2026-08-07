/* OnyxZygisk — app entry. Set theme first, then mount the single fixed page. */
import { createApp } from "vue";
import App from "./App.vue";
import "./styles/main.css";
import { applyTheme, getThemePref, watchSystem } from "./composables/useTheme";

applyTheme(getThemePref());
watchSystem();

createApp(App).mount("#app");
