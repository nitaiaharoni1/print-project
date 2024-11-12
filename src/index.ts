#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";
import { defaultIgnorePatterns } from "./constants";

let projectPrint: string = "";
let treeStructure: Record<string, any> = {};
let treeStructureString: string = "";

const program = new Command();
program
  .argument("<startPath>", "Starting directory path")
  .option("--ignore <patterns>", "Comma-separated list of patterns to ignore")
  .option("--include <patterns>", "Comma-separated list of patterns to include")
  .option("--ignore-default", "Disable default ignore patterns")
  .parse(process.argv);

const startPath: string | undefined = program.args[0] && path.resolve(program.args[0]);
const options = program.opts();
const userIgnorePatterns: string[] = options.ignore ? options.ignore.split(",").filter(Boolean).map((pattern: string) => pattern.trim()) : [];
const includePatterns: string[] = options.include ? options.include.split(",").filter(Boolean).map((pattern: string) => pattern.trim()) : [];

// Build the final ignore patterns list
let ignorePatterns: string[] = ["project-print.txt"]; // Always ignore the output file

// If NOT using --ignore-default, add default patterns
if (!options.ignoreDefault) {
  ignorePatterns = [...defaultIgnorePatterns, ...ignorePatterns];
}

// Add user's ignore patterns
ignorePatterns = [...ignorePatterns, ...userIgnorePatterns];

function matchesPattern(filePath: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const regexPattern = pattern
      .split("*")
      .map(s => s.replace(/[|\\{}()[\]^$+?.]/g, "\\$&"))
      .join(".*");

    const regex = new RegExp(regexPattern, "i");
    console.log(`Checking ${filePath} against pattern: ${pattern} (regex: ${regex})`);
    const matches = regex.test(filePath);
    console.log(`Match result: ${matches}`);
    return matches;
  });
}

function shouldIncludeFile(filePath: string, ignorePatterns: string[], includePatterns: string[]): boolean {
  console.log(`\nChecking file: ${filePath}`);

  // If there are include patterns and file matches one, include it regardless of ignore patterns
  if (includePatterns.length > 0) {
    const isIncluded = matchesPattern(filePath, includePatterns);
    console.log(`Include pattern match: ${isIncluded}`);
    return isIncluded;
  }

  // Otherwise, exclude if it matches ignore patterns
  const isIgnored = matchesPattern(filePath, ignorePatterns);
  console.log(`Ignore pattern match: ${isIgnored}`);
  return !isIgnored;
}

function readDirectory(dirPath: string, ignorePatterns: string[], includePatterns: string[], treeStructure: Record<string, any> = {}, currentPath: string = ""): void {
  try {
    console.log(`\nReading directory: ${dirPath}`);
    const dirents = fs.readdirSync(dirPath, { withFileTypes: true });

    dirents.forEach((dirent) => {
      const fullPath = path.relative(process.cwd(), path.join(dirPath, dirent.name)).replace(/\\/g, "/");
      console.log(`\nProcessing: ${fullPath}`);

      if (dirent.isDirectory()) {
        console.log(`${fullPath} is a directory`);
        // If directory matches ignore pattern AND doesn't match include pattern, skip it
        const shouldIgnoreDir = matchesPattern(fullPath, ignorePatterns) &&
                              (!includePatterns.length || !matchesPattern(fullPath, includePatterns));

        if (shouldIgnoreDir) {
          console.log(`Skipping ignored directory: ${fullPath}`);
          return;
        }

        treeStructure[fullPath] = {};
        readDirectory(
          path.join(dirPath, dirent.name),
          ignorePatterns,
          includePatterns,
          treeStructure[fullPath],
          fullPath
        );
      } else if (dirent.isFile()) {
        console.log(`${fullPath} is a file`);
        if (shouldIncludeFile(fullPath, ignorePatterns, includePatterns)) {
          treeStructure[fullPath] = {};
          const content = fs.readFileSync(path.join(dirPath, dirent.name), "utf8");
          if (content.length > 0) {
            projectPrint += `${fullPath}:\n${content}\n\n`;
            console.log(`Added ${fullPath} to project print`);
          }
        }
      }
    });
  } catch (e) {
    console.error(`Failed to read directory: ${dirPath}`, e);
  }
}

function buildTreeStructure(tree: Record<string, any>, indent: string = ""): void {
  for (const key in tree) {
    treeStructureString += indent + key + "\n";
    if (typeof tree[key] === "object" && Object.keys(tree[key]).length > 0) {
      buildTreeStructure(tree[key], indent + "  ");
    }
  }
}

function main(): void {
  if (!startPath) {
    console.error("Starting directory path is required.");
    process.exit(1);
  }

  console.log(`Starting directory read from ${startPath}`);
  console.log(`Ignoring: ${ignorePatterns.join(", ")}`);
  console.log(`Including: ${includePatterns.length > 0 ? includePatterns.join(", ") : "All files (except ignored)"}`);
  console.log(`Using default ignore: ${!options.ignoreDefault}`);

  readDirectory(startPath, ignorePatterns, includePatterns, treeStructure);
  console.log("\nProcessed file structure:\n");
  buildTreeStructure(treeStructure);
  console.log(treeStructureString);

  const finalContents = `File structure:\n${treeStructureString}\n\nProject print:\n${projectPrint}`;
  fs.writeFileSync("project-print.txt", finalContents);
  console.log(`\nProject print size: ${(projectPrint.length / 1024).toFixed(2)}KB`);
}

main();