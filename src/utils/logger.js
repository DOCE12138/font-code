import chalk from 'chalk';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

marked.setOptions({
  renderer: new TerminalRenderer({
    code: chalk.cyan,
    blockquote: chalk.gray.italic,
    heading: chalk.green.bold,
    firstHeading: chalk.green.bold,
    table: chalk.white,
    strong: chalk.bold,
    em: chalk.italic,
    codespan: chalk.cyan,
  }),
});

export const terminalColors = {
  black: chalk.black,
  red: chalk.red,
  green: chalk.green,
  yellow: chalk.yellow,
  blue: chalk.blue,
  magenta: chalk.magenta,
  cyan: chalk.cyan,
  white: chalk.white,
  gray: chalk.gray,
};

/**
 * Add a terminal color to text, using white by default.
 *
 * @param {string} message - Text content to colorize.
 * @param {keyof terminalColors} [color='white'] - Color name to use.
 * @returns {string} Colorized terminal text.
 */
export function colorText(message, color = 'white') {
  const text = String(message);
  const colorFormatter = terminalColors[color] || terminalColors.white;

  return colorFormatter(text);
}

/**
 * Write text to stdout with the selected color, using white by default.
 *
 * @param {string} message - Text content to print to the terminal.
 * @param {keyof terminalColors} [color='white'] - Color name to use.
 * @returns {void} No return value.
 */
export function logWithColor(message, color = 'white') {
  process.stdout.write(`${colorText(message, color)}\n`);
}

/**
 * Write an empty line to stdout.
 *
 * @returns {void} No return value.
 */
export function writeBlankLine() {
  process.stdout.write('\n');
}

/**
 * Write an error message to stderr in red.
 *
 * @param {string} message - Error message to print to the terminal.
 * @returns {void} No return value.
 */
export function writeErrorLine(message) {
  process.stderr.write(`${colorText(message, 'red')}\n`);
}

/**
 * Render Markdown content and write it to stdout.
 *
 * @param {string} message - Markdown content to render in the terminal.
 * @returns {void} No return value.
 */
export function markdown(message) {
  const renderedMarkdown = marked(String(message));

  process.stdout.write(renderedMarkdown.trimEnd());
  writeBlankLine();
}

/**
 * Render an assistant Markdown response in the terminal.
 *
 * @param {string} message - Assistant Markdown content to render.
 * @returns {void} No return value.
 */
export function assistantMarkdown(message) {
  writeBlankLine();
  logWithColor('Assistant:', 'green');
  markdown(message);
  writeBlankLine();
}

/**
 * Print a normal information message to the terminal.
 *
 * @param {string} message - Information message to print to the terminal.
 * @returns {void} No return value.
 */
export function info(message) {
  logWithColor(message, 'white');
}

/**
 * Print a success message to the terminal.
 *
 * @param {string} message - Success message to print to the terminal.
 * @returns {void} No return value.
 */
export function success(message) {
  logWithColor(message, 'green');
}

/**
 * Print a warning message to the terminal.
 *
 * @param {string} message - Warning message to print to the terminal.
 * @returns {void} No return value.
 */
export function warn(message) {
  logWithColor(message, 'yellow');
}

/**
 * Print an error message to the terminal.
 *
 * @param {string} message - Error message to print to the terminal.
 * @returns {void} No return value.
 */
export function error(message) {
  writeErrorLine(message);
}
