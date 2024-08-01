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
  .option("--ignore-default", "Use default ignore patterns")
  .parse(process.argv);

const startPath: string | undefined = program.args[0] && path.resolve(program.args[0]);
const options = program.opts();
const userIgnorePatterns: string[] = options.ignore ? options.ignore.split(",").filter(Boolean).map((pattern: string) => pattern.trim()) : [];
const includePatterns: string[] = options.include ? options.include.split(",").filter(Boolean).map((pattern: string) => pattern.trim()) : [];
const useDefaultIgnore: boolean = options.ignoreDefault;

let ignorePatterns: string[] = useDefaultIgnore ? [...defaultIgnorePatterns, ...userIgnorePatterns] : userIgnorePatterns;
ignorePatterns.push("project-print.txt");

console.log("Start Path:", startPath);
console.log("Ignore Patterns:", ignorePatterns);
console.log("Include Patterns:", includePatterns);

function matchesPattern(filePath: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const parsedPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*");
    const regex = new RegExp(parsedPattern);
    return regex.test(filePath);
  });
}

function shouldIncludeFile(filePath: string, ignorePatterns: string[], includePatterns: string[]): boolean {
  return !matchesPattern(filePath, ignorePatterns) || matchesPattern(filePath, includePatterns);
}

function readDirectory(dirPath: string, ignorePatterns: string[], includePatterns: string[], treeStructure: Record<string, any> = {}, currentPath: string = ""): void {
  try {
    const dirents = fs.readdirSync(dirPath, { withFileTypes: true });
    dirents.forEach((dirent) => {
      const fullPath = path.relative(process.cwd(), path.join(dirPath, dirent.name)).replace(/\\/g, "/");
      if (!shouldIncludeFile(fullPath, ignorePatterns, includePatterns)) {
        return;
      }
      const relativePath = path.join(currentPath, dirent.name).replace(/\\/g, "/");
      if (dirent.isDirectory()) {
        treeStructure[relativePath] = {};
        readDirectory(path.join(dirPath, dirent.name), ignorePatterns, includePatterns, treeStructure[relativePath], relativePath);
      } else if (dirent.isFile()) {
        treeStructure[relativePath] = {};
        const content = fs.readFileSync(path.join(dirPath, dirent.name), "utf8");
        if (content.length > 0) {
          projectPrint += `${fullPath}:\n${content}\n\n`;
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
  console.log(`Using default ignore: ${useDefaultIgnore}`);

  readDirectory(startPath, ignorePatterns, includePatterns, treeStructure);
  console.log("\nProcessed file structure:\n");
  buildTreeStructure(treeStructure);
  console.log(treeStructureString);

  const finalContents = `File structure:\n${treeStructureString}\n\nProject print:\n${projectPrint}`;
  fs.writeFileSync("project-print.txt", finalContents);
  console.log(`\nProject print size: ${(projectPrint.length / 1024).toFixed(2)}KB`);
}

main();