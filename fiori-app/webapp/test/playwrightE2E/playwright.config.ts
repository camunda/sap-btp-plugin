import { defineConfig, devices } from "@playwright/test"
import path from "path"

export default defineConfig({
  // Directory with test files
  testDir: "./",

  // Maximum time a single test can run (in milliseconds)
  timeout: 30000,

  // Maximum time for individual assertions (e.g. expect())
  expect: {
    timeout: 10000
  },

  workers: "100%", // Run tests sequentially to avoid conflicts with shared state (e.g., process instances)

  // Reporter for the command line
  reporter: [
    ["list"],
    [
      "html",
      {
        embedAnnotationsAsProperties: true,
        outputFolder: path.resolve(__dirname, "..", "html-report")
      }
    ],
    ["junit", { outputFile: path.resolve(__dirname, "..", "test-results", "junit-report.xml") }]
  ],

  outputDir: path.resolve(__dirname, "..", "test-results"),

  // Global configuration for all tests
  use: {
    // Base URL for actions like page.goto('/')
    baseURL: "http://localhost:5001/app/index.html",

    // Set timezone to avoid "Invalid time zone specified: Etc/Unknown" error
    timezoneId: "Europe/Berlin",
    locale: "de-DE",

    // Creates artifacts on failures for easier debugging
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    // Disables browser security policies, useful for local testing
    launchOptions: {
      args: ["--disable-web-security"]
    }
  },

  // Configuration for the browser project under test
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
})
