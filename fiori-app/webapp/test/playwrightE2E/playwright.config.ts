import { defineConfig, devices } from "@playwright/test"

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
  reporter: "list",

  // Global configuration for all tests
  use: {
    // Base URL for actions like page.goto('/')
    baseURL: "http://localhost:5001/app/index.html",

    // Creates a trace report on failed tests
    trace: "on-first-retry",

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
