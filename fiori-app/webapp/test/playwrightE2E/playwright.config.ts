import { defineConfig, devices } from "@playwright/test"
import path from "path"

export default defineConfig({
  // Directory with test files
  testDir: "./",

  // Maximum time a single test can run (in milliseconds)
  timeout: 30000,

  // Maximum time for individual assertions (e.g. expect())
  expect: {
    timeout: 5000
  },

  // Reporter for the command line
  reporter: [
    ["list"],
    [
      "html",
      {
        embedAnnotationsAsProperties: true,
        outputFolder: path.resolve(__dirname, "..", "..", "..", "..", "logs", "html-report")
      }
    ],
    ["junit", { outputFile: path.resolve(__dirname, "..", "..", "..", "..", "logs", "test-results", "junit-report.xml") }]
  ],

  outputDir: path.resolve(__dirname, "..", "..", "..", "..", "logs", "test-results"),

  // Global configuration for all tests
  use: {
    // Base URL for actions like page.goto('/')
    baseURL: "http://localhost:5001/app/index.html",

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
