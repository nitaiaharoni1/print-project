# Print-Project

The `print-project` command-line tool scans a specified directory and generates a report including the tree structure
and content of files that do not match given ignore patterns. It is useful for documenting or analyzing the file layout
of projects, especially in development environments.

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
  e.g., `/path/to/project`
- `[ignorePatterns]`: Optional. A comma-separated list of glob patterns to ignore files and directories.
  e.g., `"node_modules,*.log,dist,coverage"`

### Command Aliases

You can use either `print-project` or `pprint` to run the tool:

```bash
print-project <startPath> [ignorePatterns]
```

or

```bash
pprint <startPath> [ignorePatterns]
```

### Using Default Ignore Patterns

To use the default ignore patterns, add the `--ignore-default` flag:

```bash
print-project <startPath> --ignore-default
```

You can also combine default patterns with your own:

```bash
print-project <startPath> "your,custom,patterns" --ignore-default
```

### Default Ignore Patterns

The following patterns are ignored by default when using the `--ignore-default` flag:

```
node_modules,*.log,dist,coverage,documentation,.prettierrc,.gitignore,dist,scripts,.serverless,.idea,.git,.DS_Store,.husky,package-lock.json
```

### Examples

- **Print all files and directories**:

  ```bash
  print-project ./src
  ```
  or
  ```bash
  pprint ./src
  ```

- **Ignore specific patterns**:

  ```bash
  print-project ./src "node_modules,*.log,dist,coverage"
  ```
  or
  ```bash
  pprint ./src "node_modules,*.log,dist,coverage"
  ```

- **Use default ignore patterns**:

  ```bash
  print-project ./src --ignore-default
  ```
  or
  ```bash
  pprint ./src --ignore-default
  ```

- **Use default ignore patterns and add custom ones**:

  ```bash
  print-project ./src "*.tmp,*.bak" --ignore-default
  ```
  or
  ```bash
  pprint ./src "*.tmp,*.bak" --ignore-default
  ```

## Features

- **Directory Scanning**: Recursively scans the provided directory path.
- **Ignore Patterns**: Supports glob patterns to exclude specific files or directories from the output.
- **Default Ignore Patterns**: Provides a set of commonly ignored patterns for convenience.
- **Output Generation**: Creates a text file `project-print.txt` in the current working directory containing:
    - The structured list of non-ignored files and directories.
    - The content of non-empty files.
- **Command Alias**: Can be run using either `print-project` or `pprint` for convenience.

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

Contributions are welcome. Please open an issue first to discuss what you would like to change, or directly submit a
pull request.