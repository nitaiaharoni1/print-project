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
    return regex.test(filePath);
  });
}

function shouldIncludeFile(filePath: string, ignorePatterns: string[], includePatterns: string[]): boolean {
  // First check if the file matches any include patterns
  const isIncluded = includePatterns.length > 0 ? matchesPattern(filePath, includePatterns) : true;

  // If the file doesn't match include patterns (when they exist), exclude it
  if (!isIncluded) {
    return false;
  }

  // If the file matches include patterns (or there are no include patterns)
  // AND doesn't match ignore patterns, include it
  const isIgnored = matchesPattern(filePath, ignorePatterns);

  // Special case: if the file matches both include and ignore patterns,
  // prioritize the include pattern
  if (includePatterns.length > 0 && isIncluded) {
    return true;
  }

  return !isIgnored;
}

function readDirectory(dirPath: string, ignorePatterns: string[], includePatterns: string[], treeStructure: Record<string, any> = {}, currentPath: string = ""): void {
  try {
    const dirents = fs.readdirSync(dirPath, { withFileTypes: true });

    dirents.forEach((dirent) => {
      const fullPath = path.relative(process.cwd(), path.join(dirPath, dirent.name)).replace(/\\/g, "/");

      if (dirent.isDirectory()) {
        // For directories, check if they should be included based on patterns
        const shouldIncludeDir = shouldIncludeFile(fullPath, ignorePatterns, includePatterns);

        if (shouldIncludeDir) {
          treeStructure[fullPath] = {};
          readDirectory(
            path.join(dirPath, dirent.name),
            ignorePatterns,
            includePatterns,
            treeStructure[fullPath],
            fullPath
          );
        }
      } else if (dirent.isFile()) {
        if (shouldIncludeFile(fullPath, ignorePatterns, includePatterns)) {
          treeStructure[fullPath] = {};
          const content = fs.readFileSync(path.join(dirPath, dirent.name), "utf8");
          if (content.length > 0) {
            projectPrint += `${fullPath}:\n${content}\n\n`;
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
  buildTreeStructure(treeStructure);

  const finalContents = `File structure:\n${treeStructureString}\n\nProject print:\n${projectPrint}`;
  fs.writeFileSync("project-print.txt", finalContents);
  console.log(`\nProject print size: ${(projectPrint.length / 1024).toFixed(2)}KB`);
}

main();
