# Print-Project

The `print-project` command-line tool scans a specified directory and generates a report including the tree structure and content of files that do not match given ignore patterns. It is useful for documenting or analyzing the file layout of projects, especially in development environments.

## Installation

You can install `print-project` using npm:

```bash
npm install -g print-project
```

Ensure you have Node.js installed on your machine to use this package.

## Usage

After installation, the `print-project` tool can be run from the command line.

### Basic Command

```bash
print-project <startPath> [ignorePatterns]
```

- `<startPath>`: Required. The path to the directory you want to scan.
- `[ignorePatterns]`: Optional. A comma-separated list of glob patterns to ignore files and directories.

### Examples

- **Print all files and directories**:

  ```bash
  print-project /path/to/project
  ```

- **Ignore specific patterns**:

  ```bash
  print-project /path/to/project node_modules,*.log
  ```

This will ignore all directories and files matching the `node_modules` folder and any files ending with `.log`.

## Features

- **Directory Scanning**: Recursively scans the provided directory path.
- **Ignore Patterns**: Supports glob patterns to exclude specific files or directories from the output.
- **Output Generation**: Creates a text file `project-print.txt` in the current working directory containing:
  - The structured list of non-ignored files and directories.
  - The content of non-empty files.

## How It Works

1. Parses the command line arguments for the starting directory path and ignore patterns.
2. Scans the specified directory, applying the ignore patterns to filter out unwanted files or directories.
3. Builds a tree structure of the directory and captures file content.
4. Outputs the directory structure and file content into `project-print.txt`.

## Output File Format

The output `project-print.txt` includes:

- **File Structure**: A tree showing the organization of files and directories.
- **Project Print**: Actual content of non-empty files within the project directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change, or directly submit a pull request.