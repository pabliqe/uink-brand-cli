#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const packageJsonPath = path.join(repoRoot, "package.json");
const changelogPath = path.join(repoRoot, "CHANGELOG.md");

function runGit(command) {
  try {
    return execSync(command, { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to run git command: ${command}\n${message}`);
  }
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function extractVersionsFromChangelog(content) {
  const matches = [...content.matchAll(/^## \[([^\]]+)\]/gm)];
  return matches.map((match) => match[1]);
}

function getPackageVersionFromCommit(commitHash) {
  try {
    const pkgRaw = runGit(`git show ${commitHash}:package.json`);
    const pkg = JSON.parse(pkgRaw);
    return typeof pkg.version === "string" ? pkg.version : null;
  } catch {
    return null;
  }
}

function getVersionTransitions() {
  const commitListRaw = runGit("git rev-list --reverse HEAD -- package.json");
  if (!commitListRaw) {
    return [];
  }

  const commits = commitListRaw.split("\n").filter(Boolean);
  const transitions = [];
  let lastVersion = null;

  for (const commit of commits) {
    const version = getPackageVersionFromCommit(commit);
    if (!version || version === lastVersion) {
      continue;
    }

    transitions.push({ version, commit });
    lastVersion = version;
  }

  return transitions;
}

function getCommitsForVersionStart(startCommit) {
  const logRaw = runGit(`git log --reverse --format="%s|%h" ${startCommit}..HEAD`);
  const commits = [];

  // Include the version-bump commit itself first.
  const startSubject = runGit(`git show -s --format=%s ${startCommit}`);
  const startShortHash = runGit(`git rev-parse --short ${startCommit}`);
  commits.push({ subject: startSubject, shortHash: startShortHash });

  if (!logRaw) {
    return commits;
  }

  for (const line of logRaw.split("\n")) {
    if (!line) {
      continue;
    }

    const separatorIndex = line.lastIndexOf("|");
    if (separatorIndex === -1) {
      continue;
    }

    const subject = line.slice(0, separatorIndex).trim();
    const shortHash = line.slice(separatorIndex + 1).trim();

    if (!subject || !shortHash) {
      continue;
    }

    commits.push({ subject, shortHash });
  }

  return commits;
}

function buildVersionSection(version, commits) {
  const lines = [`## [${version}]`];

  for (const commit of commits) {
    lines.push(`- ${commit.subject} (\`${commit.shortHash}\`)`);
  }

  return `${lines.join("\n")}\n`;
}

function upsertChangelog(version, sectionText) {
  if (!fs.existsSync(changelogPath)) {
    const initial = `# Changelog\n\n${sectionText}`;
    fs.writeFileSync(changelogPath, initial, "utf8");
    return { created: true, updated: false };
  }

  const existing = fs.readFileSync(changelogPath, "utf8");
  const existingVersions = extractVersionsFromChangelog(existing);

  if (existingVersions.includes(version)) {
    return { created: false, updated: false, skipped: true };
  }

  if (existing.startsWith("# Changelog")) {
    const updated = existing.replace("# Changelog\n\n", `# Changelog\n\n${sectionText}\n`);
    fs.writeFileSync(changelogPath, updated, "utf8");
  } else {
    const updated = `# Changelog\n\n${sectionText}\n${existing}`;
    fs.writeFileSync(changelogPath, updated, "utf8");
  }

  return { created: false, updated: true, skipped: false };
}

function main() {
  const pkg = readJson(packageJsonPath);
  const currentVersion = pkg.version;

  if (typeof currentVersion !== "string" || !currentVersion) {
    throw new Error("package.json does not contain a valid version.");
  }

  const transitions = getVersionTransitions();
  const currentTransition = transitions.find((entry) => entry.version === currentVersion);

  if (!currentTransition) {
    throw new Error(
      `Could not find a package.json version transition commit for version ${currentVersion}.`
    );
  }

  const commits = getCommitsForVersionStart(currentTransition.commit);

  if (commits.length === 0) {
    throw new Error(`No commits found for version ${currentVersion}.`);
  }

  const section = buildVersionSection(currentVersion, commits);
  const result = upsertChangelog(currentVersion, section);

  if (result.skipped) {
    console.log(`CHANGELOG.md already contains version ${currentVersion}. Nothing changed.`);
    return;
  }

  if (result.created) {
    console.log(`Created CHANGELOG.md with version ${currentVersion}.`);
    return;
  }

  console.log(`Prepended version ${currentVersion} to CHANGELOG.md.`);
}

main();
