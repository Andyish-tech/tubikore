#!/usr/bin/env node
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/tsup/assets/esm_shims.js
import path from "path";
import { fileURLToPath } from "url";
var init_esm_shims = __esm({
  "node_modules/tsup/assets/esm_shims.js"() {
    "use strict";
  }
});

// src/index.ts
import { spawn } from "child_process";
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
var require_index = __commonJS({
  "src/index.ts"() {
    init_esm_shims();
    var DEFAULT_ORG = "Andyish-tech";
    function parseArgs(args) {
      const options = {
        org: DEFAULT_ORG,
        clone: false,
        help: false
      };
      for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === "--help" || arg === "-h") {
          options.help = true;
          continue;
        }
        if (arg === "--clone" || arg === "-c" || arg === "-app" || arg === "--app") {
          options.clone = true;
          continue;
        }
        if (arg === "--org" && args[index + 1]) {
          options.org = args[index + 1];
          index += 1;
          continue;
        }
        if (arg.startsWith("--org=")) {
          options.org = arg.slice("--org=".length);
        }
      }
      return options;
    }
    function showHelp() {
      console.log(`
tubikore

Show projects from a GitHub organization and optionally clone one.

Usage:
  npx tubikore
  npx tubikore --clone
  npx tubikore --org Andyish-tech --clone

Options:
  --org <name>   GitHub organization/user name. Default: ${DEFAULT_ORG}
  --clone, -c    Clone the selected project
  --app, -app    Alias for --clone
  --help, -h     Show this help
`);
    }
    async function fetchOrganizationRepos(org) {
      const endpoints = [
        `https://api.github.com/orgs/${org}/repos?per_page=100&sort=updated`,
        `https://api.github.com/users/${org}/repos?per_page=100&sort=updated`
      ];
      for (const endpoint of endpoints) {
        const response = await fetch(endpoint, {
          headers: {
            "User-Agent": "tubikore-cli"
          }
        });
        if (response.ok) {
          const repos = await response.json();
          return repos.filter((repo) => !repo.private);
        }
      }
      throw new Error(`Could not find public repositories for "${org}".`);
    }
    function printRepos(repos) {
      console.log("\nAvailable projects:\n");
      repos.forEach((repo, index) => {
        const description = repo.description ? ` - ${repo.description}` : "";
        console.log(`${index + 1}. ${repo.name}${description}`);
      });
    }
    async function chooseRepo(repos) {
      const rl = createInterface({ input, output });
      try {
        while (true) {
          const answer = await rl.question("\nChoose a project number: ");
          const selectedIndex = Number.parseInt(answer, 10) - 1;
          const selectedRepo = repos[selectedIndex];
          if (selectedRepo) {
            return selectedRepo;
          }
          console.log(`Please choose a number from 1 to ${repos.length}.`);
        }
      } finally {
        rl.close();
      }
    }
    async function cloneRepo(repo) {
      console.log(`
Cloning ${repo.name}...
`);
      await new Promise((resolve, reject) => {
        const child = spawn("git", ["clone", repo.clone_url], {
          shell: process.platform === "win32",
          stdio: "inherit"
        });
        child.on("close", (code) => {
          if (code === 0) {
            resolve();
            return;
          }
          reject(new Error(`git clone exited with code ${code ?? "unknown"}.`));
        });
        child.on("error", reject);
      });
    }
    async function main() {
      const options = parseArgs(process.argv.slice(2));
      if (options.help) {
        showHelp();
        return;
      }
      console.log(`Fetching projects from ${options.org}...`);
      const repos = await fetchOrganizationRepos(options.org);
      if (repos.length === 0) {
        console.log(`No public projects found for ${options.org}.`);
        return;
      }
      printRepos(repos);
      const selectedRepo = await chooseRepo(repos);
      console.log(`
Selected: ${selectedRepo.name}`);
      console.log(selectedRepo.html_url);
      if (options.clone) {
        await cloneRepo(selectedRepo);
      }
    }
    main().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`
Error: ${message}`);
      process.exitCode = 1;
    });
  }
});
export default require_index();
