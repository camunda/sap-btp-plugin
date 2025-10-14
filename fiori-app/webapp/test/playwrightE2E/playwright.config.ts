import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Verzeichnis, in dem sich Ihre Tests befinden
  testDir: './',

  // Maximale Zeit, die ein einzelner Test laufen darf (in Millisekunden)
  timeout: 30000,

  // Maximale Zeit für einzelne Assertions (z.B. expect())
  expect: {
    timeout: 5000
  },

  // Reporter für die Kommandozeile
  reporter: 'list',

  // Globale Konfiguration für alle Tests
  use: {
    // Basis-URL für Aktionen wie page.goto('/')
    baseURL: 'http://localhost:5001',

    // Erstellt einen Trace-Bericht bei fehlgeschlagenen Tests
    trace: 'on-first-retry',

    // Deaktiviert die Browsersicherheitsrichtlinien, nützlich für lokale Tests
    launchOptions: {
      args: ['--disable-web-security']
    }
  },

  // Konfiguration für das zu testende Browser-Projekt
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});