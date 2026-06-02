#!/usr/bin/env node
"use strict";

// src/index.ts
var import_node_child_process = require("child_process");
var import_promises = require("readline/promises");
var import_node_process = require("process");
var DEFAULT_ORG = "L5SOD-PREP";
function parseArgs(args) {
  const options = {
    org: DEFAULT_ORG,
    shouldClone: true,
    help: false
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--clone" || arg === "-c" || arg === "-app" || arg === "--app") {
      options.shouldClone = true;
      continue;
    }
    if (arg === "--no-clone" || arg === "--link-only") {
      options.shouldClone = false;
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
create-tubikore-app

Show projects from a GitHub organization and download the selected one.

Usage:
  npx create-tubikore-app
  npx create-tubikore-app --org L5SOD-PREP
  npx create-tubikore-app --no-clone

Options:
  --org <name>         GitHub organization/user name. Default: ${DEFAULT_ORG}
  --clone, -c          Download the selected project. Enabled by default
  --app, -app          Alias for --clone
  --no-clone           Show the selected project link without downloading
  --link-only          Alias for --no-clone
  --help, -h           Show this help
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
  const rl = (0, import_promises.createInterface)({ input: import_node_process.stdin, output: import_node_process.stdout });
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
    const child = (0, import_node_child_process.spawn)("git", ["clone", repo.clone_url], {
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
  if (options.shouldClone) {
    await cloneRepo(selectedRepo);
  }
}
main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`
Error: ${message}`);
  process.exitCode = 1;
});
