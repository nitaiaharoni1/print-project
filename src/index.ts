#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";
import { defaultIgnorePatterns } from "./constants";

let projectPrint: string = "";
let treeStructure: Record<string, any> = {};
let treeStructureString: string = "";

console.log("\n🔍 Starting program execution");
console.log("⏰ Time:", new Date().toISOString());

// Initialize command line interface
const program = new Command();
console.log("⚙️  Setting up command line interface...");
program.argument("<startPath>", "Starting directory path").option("--ignore <patterns>", "Comma-separated list of patterns to ignore").option("--include <patterns>", "Comma-separated list of patterns to include").option("--remove-default", "Remove default ignore patterns").parse(process.argv);

console.log("🚀 Initializing file printer...");
console.log("📊 Memory usage:", process.memoryUsage().heapUsed / 1024 / 1024, "MB");

const startPath: string | undefined = program.args[0] && path.resolve(program.args[0]);
const options = program.opts();

console.log("🔧 Parsing command line options...");
const userIgnorePatterns: string[] = options.ignore
  ? options.ignore.split(",").filter(Boolean).map((pattern: string) => {
    console.log(`  📎 Processing ignore pattern: ${pattern.trim()}`);
    return pattern.trim();
  })
  : [];

const includePatterns: string[] = options.include
  ? options.include.split(",").filter(Boolean).map((pattern: string) => {
    console.log(`  📎 Processing include pattern: ${pattern.trim()}`);
    return pattern.trim();
  })
  : [];

const shouldAddDefaultIgnorePatterns: boolean = !options.removeDefault;
console.log("🎯 Default patterns:", shouldAddDefaultIgnorePatterns ? "enabled" : "disabled");

// Build ignore patterns list
let ignorePatterns: string[] = ["project-print.txt"];
if (shouldAddDefaultIgnorePatterns) {
  console.log("📋 Adding default ignore patterns...");
  console.log(`  📑 Default patterns count: ${defaultIgnorePatterns.length}`);
  ignorePatterns = [...defaultIgnorePatterns, ...ignorePatterns];
}
ignorePatterns = [...ignorePatterns, ...userIgnorePatterns];
console.log(`📝 Total ignore patterns: ${ignorePatterns.length}`);

function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  if (patterns.length === 0) {
    return false;
  }

  console.log(`  🔍 Checking patterns for: ${filePath}`);
  return patterns.some(pattern => {
    if (!pattern) {
      return false;
    }

    const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();
    const normalizedPattern = pattern.toLowerCase();
    if (normalizedPattern.includes("/")) {
      const regexPattern = pattern.split("*").map(s => s.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")).join(".*");
      const result = new RegExp(regexPattern, "i").test(normalizedPath);
      return result;
    } else {
      const basename = path.basename(normalizedPath);
      const simpleRegex = new RegExp(
        pattern.split("*").map(s => s.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")).join(".*"),
        "i",
      );
      const result = simpleRegex.test(basename) || normalizedPath.includes(normalizedPattern);
      return result;
    }
  });
}

function shouldProcess(filePath: string): boolean {
  if (includePatterns.length > 0) {
    const shouldInclude = matchesAnyPattern(filePath, includePatterns);
    return shouldInclude;
  }
  const shouldIgnore = matchesAnyPattern(filePath, ignorePatterns);
  return !shouldIgnore;
}

function readDirectory(dirPath: string, tree: Record<string, any> = {}): void {
  console.log(`\n📂 Reading directory: ${dirPath}`);
  console.log(`  💾 Current tree size: ${Object.keys(tree).length} entries`);
  console.log(`  📊 Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);

  let hasIncludedFiles = false;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    console.log(`  📊 Found ${entries.length} entries in directory`);
    console.log(`  📁 Directory items: ${entries.map(e => e.name).join(", ")}`);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(startPath || ".", fullPath).replace(/\\/g, "/");
      console.log(`\n  🔄 Processing entry: ${entry.name}`);
      console.log(`    📍 Full path: ${fullPath}`);
      console.log(`    🔗 Relative path: ${relativePath}`);

      const isIgnored = matchesAnyPattern(relativePath, ignorePatterns);
      console.log(`    🚫 Is ignored: ${isIgnored}`);

      if (entry.isDirectory()) {
        console.log(`    📁 Entry is a directory`);
        if (!isIgnored) {
          console.log(`    🗂️  Processing directory: ${relativePath}`);
          const subTree: Record<string, any> = {};
          readDirectory(fullPath, subTree);
          if (Object.keys(subTree).length > 0) {
            console.log(`    ✅ Directory has included files, adding to tree`);
            tree[relativePath] = subTree;
            hasIncludedFiles = true;
          } else {
            console.log(`    ⚠️  Directory has no included files, skipping`);
          }
        }
      } else if (entry.isFile()) {
        console.log(`    📄 Entry is a file`);
        if (!isIgnored && shouldProcess(relativePath)) {
          try {
            console.log(`    📖 Reading file content...`);
            const content = fs.readFileSync(fullPath, "utf8");
            console.log(`    📊 File size: ${content.length} bytes`);
            tree[relativePath] = {};
            projectPrint += `${relativePath}:\n${content}\n\n`;
            hasIncludedFiles = true;
            console.log(`    ✨ Successfully processed file`);
          } catch (error: any) {
            console.error(`    ❌ Error reading file ${relativePath}:`, error.message);
            console.error(`    📑 Error stack:`, error.stack);
          }
        }
      }
    }
  } catch (error: any) {
    console.error(`❌ Error reading directory ${dirPath}:`, error.message);
    console.error(`📑 Error stack:`, error.stack);
  }
}

function buildTreeStructure(tree: Record<string, any>, indent: string = ""): void {
  for (const key in tree) {
    treeStructureString += indent + key + "\n";
    if (typeof tree[key] === "object" && Object.keys(tree[key]).length > 0) {
      console.log(`    🔍 Node has children, recursing...`);
      buildTreeStructure(tree[key], indent + "  ");
    }
  }
}

function main(): void {
  console.log("\n🎬 Starting main execution...");
  console.log(`📊 Initial memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);

  if (!startPath) {
    console.error("❌ Starting directory path is required.");
    process.exit(1);
  }

  console.log("\n📌 Configuration:");
  console.log(`📂 Start path: ${startPath}`);
  console.log(`📥 Include patterns: ${includePatterns.length ? includePatterns.join(", ") : "none"}`);
  console.log(`🚫 Ignore patterns: ${ignorePatterns.join(", ")}`);
  console.log(`🔄 Remove default: ${!shouldAddDefaultIgnorePatterns}`);

  console.log("\n🏁 Starting directory traversal...");
  const startTime = process.hrtime();

  readDirectory(startPath, treeStructure);

  console.log("\n🏗️  Building final output...");
  buildTreeStructure(treeStructure);

  const finalContents = `File structure:\n${treeStructureString}\n\nProject print:\n${projectPrint}`;

  console.log("\n💾 Writing output file...");
  fs.writeFileSync("project-print.txt", finalContents);

  const endTime = process.hrtime(startTime);
  const executionTime = (endTime[0] + endTime[1] / 1e9).toFixed(2);
  const fileSizeKB = (projectPrint.length / 1024).toFixed(2);

  console.log("\n✨ Process completed!");
  console.log(`⏱️  Execution time: ${executionTime} seconds`);
  console.log(`📊 Final memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📝 Project print size: ${fileSizeKB}KB`);
  console.log(`📄 Tree structure size: ${treeStructureString.length} characters`);
  console.log(`💾 Output written to: project-print.txt`);
  console.log(`\n🏁 Program finished at: ${new Date().toISOString()}\n`);
}

main();