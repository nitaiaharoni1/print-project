#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";
import { defaultIgnorePatterns } from "./constants";

let projectPrint: string = "";
let treeStructure: Record<string, any> = {};
let treeStructureString: string = "";

const program = new Command();
program.argument("<startPath>", "Starting directory path").option("--ignore <patterns>", "Comma-separated list of patterns to ignore").option("--include <patterns>", "Comma-separated list of patterns to include").option("--remove-default", "Remove default ignore patterns").parse(process.argv);

const startPath: string | undefined = program.args[0] && path.resolve(program.args[0]);
const options = program.opts();
const userIgnorePatterns: string[] = options.ignore ? options.ignore.split(",").filter(Boolean).map((pattern: string) => pattern.trim()) : [];
const includePatterns: string[] = options.include ? options.include.split(",").filter(Boolean).map((pattern: string) => pattern.trim()) : [];
const shouldAddDefaultIgnorePatterns: boolean = !options.removeDefault;

// Build the final ignore patterns list
let ignorePatterns: string[] = ["project-print.txt"]; // Always ignore the output file

// If NOT using --ignore-default, add default patterns FIRST
if (shouldAddDefaultIgnorePatterns) {
  ignorePatterns = [...defaultIgnorePatterns, ...ignorePatterns];
}

// Add user's ignore patterns LAST to give them precedence
ignorePatterns = [...ignorePatterns, ...userIgnorePatterns];

function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  if (patterns.length === 0) {
    return false;
  }

  return patterns.some(pattern => {
    if (!pattern) {
      return false;
    }

    const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();
    const normalizedPattern = pattern.toLowerCase();

    if (normalizedPattern.includes("/")) {
      // For patterns with path separators, use them as-is
      const regexPattern = pattern.split("*").map(s => s.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")).join(".*");
      return new RegExp(regexPattern, "i").test(normalizedPath);
    } else {
      // For simple patterns, match against the basename and the full path
      const basename = path.basename(normalizedPath);
      const simpleRegex = new RegExp(pattern.split("*").map(s => s.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")).join(".*"), "i");

      return simpleRegex.test(basename) || normalizedPath.includes(normalizedPattern);
    }
  });
}

function shouldProcess(filePath: string): boolean {
  // If we have include patterns, file must match one of them
  if (includePatterns.length > 0) {
    return matchesAnyPattern(filePath, includePatterns);
  }

  // If no include patterns, exclude if matches ignore patterns
  return !matchesAnyPattern(filePath, ignorePatterns);
}

function readDirectory(dirPath: string, treeStructure: Record<string, any> = {}): void {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(startPath || ".", fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        if (shouldProcess(relativePath)) {
          const subTree = {};
          treeStructure[relativePath] = subTree;
          readDirectory(fullPath, subTree);

          // Remove empty directories
          if (Object.keys(subTree).length === 0) {
            delete treeStructure[relativePath];
          }
        }
      } else if (entry.isFile() && shouldProcess(relativePath)) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          if (content.length > 0) {
            treeStructure[relativePath] = {};
            projectPrint += `${relativePath}:\n${content}\n\n`;
          }
        } catch (error: any) {
          console.error(`Error reading file ${relativePath}:`, error.message);
        }
      }
    }
  } catch (error: any) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
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

  console.log("\nStarting directory read from:", startPath);
  console.log("Include patterns:", includePatterns.length ? includePatterns.join(", ") : "none");
  console.log("Ignore patterns:", ignorePatterns.join(", "));
  console.log("Remove default:", !shouldAddDefaultIgnorePatterns);
  console.log();

  readDirectory(startPath, treeStructure);
  buildTreeStructure(treeStructure);

  const finalContents = `File structure:\n${treeStructureString}\n\nProject print:\n${projectPrint}`;
  fs.writeFileSync("project-print.txt", finalContents);
  console.log(`Project print size: ${(projectPrint.length / 1024).toFixed(2)}KB`);
}

main();