/** Dev-only shim (see vite.config.ts `jsxRuntimeAlias`, `apply: "serve"`).
 *  Production builds use React's real `react/jsx-runtime` and must not hit this file. */
export { Fragment, jsxDEV as jsx, jsxDEV as jsxs } from "react/jsx-dev-runtime";
