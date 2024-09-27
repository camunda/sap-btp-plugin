/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
const config = {
  endOfLine: "lf",
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  trailingComma: "none",
  singleQuote: false,
  semi: false,
  editorconfig: false,
  overrides: [
    {
      files: ["*.yaml", "*.yml", "*.json", "*.md"],
      options: {
        tabWidth: 2
      }
    }
  ]
}

export default config
