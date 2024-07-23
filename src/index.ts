#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";
import { defaultIgnorePatterns } from "./constants";

let projectPrint: string = "";
let treeStructure: Record<string, any> = {};
let treeStructureString: string = "";

const program = new Command();
program.argument("<startPath>", "Starting directory path").argument("[ignorePatterns]", "Comma-separated list of patterns to ignore").option("--ignore-default", "Use default ignore patterns").parse(process.argv);

const startPath: string | undefined = program.args[0] && path.resolve(program.args[0]);
const userPatterns: string[] = program.args[1] ? program.args[1].split(",").filter(Boolean).map(pattern => pattern.trim()) : [];
const useDefaultIgnore: boolean = program.opts().ignoreDefault;


let patterns: string[] = useDefaultIgnore ? [...defaultIgnorePatterns, ...userPatterns] : userPatterns;
patterns.push("project-print.txt");

console.log("Start Path:", startPath);
console.log("Patterns:", patterns);

function isIgnored(filePath: string, patterns: string[]): boolean {
  try {
    return patterns.some(pattern => {
      const parsedPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*");
      const regex = new RegExp(parsedPattern);
      return regex.test(filePath);
    });
  } catch (e) {
    console.error(`Failed to check if ignored: ${filePath}`, e);
    return false;
  }
}

function readDirectory(dirPath: string, patterns: string[] = [], treeStructure: Record<string, any> = {}, currentPath: string = ""): void {
  try {
    const dirents = fs.readdirSync(dirPath, { withFileTypes: true });
    dirents.forEach((dirent) => {
      const fullPath = path.relative(process.cwd(), path.join(dirPath, dirent.name)).replace(/\\/g, "/");
      if (isIgnored(fullPath, patterns)) {
        return;
      }
      const relativePath = path.join(currentPath, dirent.name).replace(/\\/g, "/");
      if (dirent.isDirectory()) {
        treeStructure[relativePath] = {};
        readDirectory(path.join(dirPath, dirent.name), patterns, treeStructure[relativePath], relativePath);
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
  console.log(`Ignoring: ${patterns.join(", ")}`);
  console.log(`Using default ignore: ${useDefaultIgnore}`);

  readDirectory(startPath, patterns, treeStructure);
  console.log("\nNon-ignored file structure:\n");
  buildTreeStructure(treeStructure);
  console.log(treeStructureString);

  const finalContents = `File structure:\n${treeStructureString}\n\nProject print:\n${projectPrint}`;
  fs.writeFileSync("project-print.txt", finalContents);
  console.log(`\nProject print size: ${(projectPrint.length / 1024).toFixed(2)}KB`);
}

main();