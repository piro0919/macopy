/// <reference types="vite/client" />
// eslint-disable-next-line filenames/match-regex
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}
