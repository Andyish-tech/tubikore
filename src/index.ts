#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

type GitHubRepo = {
  name: string;
  description: string | null;
  clone_url: string;
  html_url: string;
  private: boolean;
};

type CliOptions = {
  org: string;
  clone: boolean;
  help: boolean;
};

const DEFAULT_ORG = "Andyish-tech";

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    org: DEFAULT_ORG,
    clone: false,
    help: false,
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

function showHelp(): void {
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

async function fetchOrganizationRepos(org: string): Promise<GitHubRepo[]> {
  const endpoints = [
    `https://api.github.com/orgs/${org}/repos?per_page=100&sort=updated`,
    `https://api.github.com/users/${org}/repos?per_page=100&sort=updated`,
  ];

  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "tubikore-cli",
      },
    });

    if (response.ok) {
      const repos = (await response.json()) as GitHubRepo[];
      return repos.filter((repo) => !repo.private);
    }
  }

  throw new Error(`Could not find public repositories for "${org}".`);
}

function printRepos(repos: GitHubRepo[]): void {
  console.log("\nAvailable projects:\n");

  repos.forEach((repo, index) => {
    const description = repo.description ? ` - ${repo.description}` : "";
    console.log(`${index + 1}. ${repo.name}${description}`);
  });
}

async function chooseRepo(repos: GitHubRepo[]): Promise<GitHubRepo> {
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

async function cloneRepo(repo: GitHubRepo): Promise<void> {
  console.log(`\nCloning ${repo.name}...\n`);

  await new Promise<void>((resolve, reject) => {
    const child = spawn("git", ["clone", repo.clone_url], {
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.on("close", (code: number | null) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`git clone exited with code ${code ?? "unknown"}.`));
    });

    child.on("error", reject);
  });
}

async function main(): Promise<void> {
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

  console.log(`\nSelected: ${selectedRepo.name}`);
  console.log(selectedRepo.html_url);

  if (options.clone) {
    await cloneRepo(selectedRepo);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nError: ${message}`);
  process.exitCode = 1;
});
