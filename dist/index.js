#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_extract_zip = __toESM(require("extract-zip"));
var import_promises = require("fs/promises");
var import_node_os = require("os");
var import_node_path = require("path");
var import_promises2 = require("readline/promises");
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
  const rl = (0, import_promises2.createInterface)({ input: import_node_process.stdin, output: import_node_process.stdout });
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
function getArchiveUrl(repo) {
  const owner = encodeURIComponent(repo.owner.login);
  const name = encodeURIComponent(repo.name);
  const branch = repo.default_branch.split("/").map(encodeURIComponent).join("/");
  return `https://codeload.github.com/${owner}/${name}/zip/refs/heads/${branch}`;
}
async function downloadRepo(repo) {
  const targetDirectory = (0, import_node_path.resolve)(process.cwd(), repo.name);
  const tempDirectory = await (0, import_promises.mkdtemp)((0, import_node_path.join)((0, import_node_os.tmpdir)(), "create-tubikore-app-"));
  const archivePath = (0, import_node_path.join)(tempDirectory, `${repo.name}.zip`);
  console.log(`
Downloading ${repo.name}...
`);
  try {
    const response = await fetch(getArchiveUrl(repo), {
      headers: {
        "User-Agent": "create-tubikore-app"
      }
    });
    if (!response.ok || !response.body) {
      throw new Error(`Could not download ${repo.name}. GitHub returned ${response.status}.`);
    }
    const archive = Buffer.from(await response.arrayBuffer());
    await (0, import_promises.writeFile)(archivePath, archive);
    console.log("Extracting project...\n");
    await (0, import_extract_zip.default)(archivePath, { dir: tempDirectory });
    const extractedDirectory = (0, import_node_path.join)(
      tempDirectory,
      `${repo.name}-${(0, import_node_path.basename)(repo.default_branch)}`
    );
    await (0, import_promises.rename)(extractedDirectory, targetDirectory);
    console.log(`Done. Project downloaded to ${targetDirectory}`);
  } finally {
    await (0, import_promises.rm)(tempDirectory, { force: true, recursive: true });
  }
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
    await downloadRepo(selectedRepo);
  }
}
main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`
Error: ${message}`);
  process.exitCode = 1;
});
