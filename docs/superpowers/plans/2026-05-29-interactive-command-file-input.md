# Interactive Command File Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build interactive `/` command completion and `@` file mention completion with highlighted input and model-time file expansion.

**Architecture:** Add focused utility modules for slash commands, file mentions, and terminal input so `src/app.js` remains the application coordinator. Core parsing, filtering, expansion, and highlighting are pure or near-pure functions covered by Node built-in tests. The terminal input module owns raw keypress handling and gracefully falls back to `readline/promises` when TTY raw mode is unavailable.

**Tech Stack:** Node.js ESM, built-in `node:test`, built-in `node:assert/strict`, built-in `node:readline`, existing `chalk` and project logger utilities, Prettier.

---

## File Structure

- Create `src/utils/slashCommands.js`: command metadata, command matching, and command lookup helpers.
- Create `src/utils/fileMentions.js`: parse `@path` tokens, discover candidate files, and expand mentions into model context.
- Create `src/utils/terminalInput.js`: interactive input state, highlighting, candidate rendering, key handling, and fallback line reading.
- Modify `src/app.js`: use command metadata, call `readInteractiveMessage`, execute commands through metadata, and send expanded file context to OpenAI while saving raw user text.
- Modify `package.json`: replace the placeholder test script with `node --test`.
- Create `test/slashCommands.test.js`: command helper tests.
- Create `test/fileMentions.test.js`: parser, candidate discovery, and expansion tests.
- Create `test/terminalInput.test.js`: highlight and key-state helper tests.

---

### Task 1: Enable The Test Runner

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Write the failing test command expectation**

Run:

```bash
pnpm test
```

Expected: FAIL with the current placeholder output `Error: no test specified`.

- [ ] **Step 2: Replace the test script**

Change the `scripts.test` value in `package.json`:

```json
"test": "node --test"
```

- [ ] **Step 3: Run the test command**

Run:

```bash
pnpm test
```

Expected: PASS with zero discovered tests or Node's test summary.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "test: enable node test runner"
```

---

### Task 2: Add Slash Command Helpers

**Files:**
- Create: `src/utils/slashCommands.js`
- Create: `test/slashCommands.test.js`

- [ ] **Step 1: Write failing slash command tests**

Create `test/slashCommands.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSlashCommand,
  listMatchingSlashCommands,
  SLASH_COMMANDS,
} from '../src/utils/slashCommands.js';

test('listMatchingSlashCommands returns every command for a bare slash', () => {
  assert.deepEqual(
    listMatchingSlashCommands('/', SLASH_COMMANDS).map((command) => command.name),
    ['/help', '/clear', '/exit'],
  );
});

test('listMatchingSlashCommands filters commands by prefix', () => {
  assert.deepEqual(
    listMatchingSlashCommands('/cl', SLASH_COMMANDS).map(
      (command) => command.name,
    ),
    ['/clear'],
  );
});

test('getSlashCommand returns an exact command match', () => {
  assert.equal(getSlashCommand('/help', SLASH_COMMANDS).name, '/help');
  assert.equal(getSlashCommand('/unknown', SLASH_COMMANDS), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test test/slashCommands.test.js
```

Expected: FAIL with module not found for `src/utils/slashCommands.js`.

- [ ] **Step 3: Implement slash command helpers**

Create `src/utils/slashCommands.js`:

```js
export const SLASH_COMMANDS = [
  {
    name: '/help',
    description: 'Show this help message',
  },
  {
    name: '/clear',
    description: 'Clear the terminal',
  },
  {
    name: '/exit',
    description: 'Exit the application',
  },
];

/**
 * Return slash commands whose names start with the provided token.
 *
 * @param {string} token - Slash command token typed by the user.
 * @param {Array<{name: string, description: string}>} commands - Available slash commands.
 * @returns {Array<{name: string, description: string}>} Matching slash commands.
 */
export function listMatchingSlashCommands(token, commands = SLASH_COMMANDS) {
  const normalizedToken = String(token || '');

  if (!normalizedToken.startsWith('/')) {
    return [];
  }

  return commands.filter((command) =>
    command.name.startsWith(normalizedToken),
  );
}

/**
 * Find a slash command by exact command name.
 *
 * @param {string} name - Slash command name to find.
 * @param {Array<{name: string, description: string}>} commands - Available slash commands.
 * @returns {{name: string, description: string} | null} Matching command, or null.
 */
export function getSlashCommand(name, commands = SLASH_COMMANDS) {
  return commands.find((command) => command.name === name) || null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm test test/slashCommands.test.js
```

Expected: PASS for all slash command tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/slashCommands.js test/slashCommands.test.js
git commit -m "feat: add slash command helpers"
```

---

### Task 3: Add File Mention Parsing And Expansion

**Files:**
- Create: `src/utils/fileMentions.js`
- Create: `test/fileMentions.test.js`

- [ ] **Step 1: Write failing file mention tests**

Create `test/fileMentions.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  expandFileMentions,
  listProjectFiles,
  parseFileMentions,
} from '../src/utils/fileMentions.js';

async function createTempProject() {
  return mkdtemp(path.join(os.tmpdir(), 'front-code-test-'));
}

test('parseFileMentions returns unique relative file paths', () => {
  assert.deepEqual(parseFileMentions('check @src/app.js and @src/app.js'), [
    'src/app.js',
  ]);
  assert.deepEqual(parseFileMentions('look at @docs/readme.md, please'), [
    'docs/readme.md',
  ]);
});

test('listProjectFiles excludes ignored directories', async () => {
  const cwd = await createTempProject();
  await mkdir(path.join(cwd, 'src'), { recursive: true });
  await mkdir(path.join(cwd, 'node_modules/pkg'), { recursive: true });
  await writeFile(path.join(cwd, 'src/app.js'), 'export const ok = true;');
  await writeFile(path.join(cwd, 'node_modules/pkg/index.js'), 'ignored');

  assert.deepEqual(await listProjectFiles(cwd), ['src/app.js']);
});

test('expandFileMentions appends readable file content', async () => {
  const cwd = await createTempProject();
  await mkdir(path.join(cwd, 'src'), { recursive: true });
  await writeFile(path.join(cwd, 'src/app.js'), 'export const value = 1;');

  const expanded = await expandFileMentions('explain @src/app.js', cwd);

  assert.match(expanded, /User message:/);
  assert.match(expanded, /explain @src\/app\.js/);
  assert.match(expanded, /File: src\/app\.js/);
  assert.match(expanded, /export const value = 1;/);
});

test('expandFileMentions adds a diagnostic for missing files', async () => {
  const cwd = await createTempProject();
  const expanded = await expandFileMentions('check @missing.js', cwd);

  assert.match(expanded, /File: missing\.js/);
  assert.match(expanded, /Unable to read file/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test test/fileMentions.test.js
```

Expected: FAIL with module not found for `src/utils/fileMentions.js`.

- [ ] **Step 3: Implement file mention helpers**

Create `src/utils/fileMentions.js`:

```js
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const IGNORE_DIRS = new Set([
  '.git',
  '.front-code',
  'node_modules',
  'dist',
  'coverage',
]);
const MAX_FILE_BYTES = 1024 * 128;

/**
 * Parse unique `@path` file mentions from a user message.
 *
 * @param {string} message - Raw user message.
 * @returns {string[]} Unique relative file paths without the leading `@`.
 */
export function parseFileMentions(message) {
  const mentions = [];
  const seen = new Set();
  const mentionPattern = /(^|\s)@([^\s,，。；;]+)/g;
  let match;

  while ((match = mentionPattern.exec(String(message))) !== null) {
    const filePath = match[2].replace(/[.。!?！？]+$/, '');

    if (filePath && !seen.has(filePath)) {
      seen.add(filePath);
      mentions.push(filePath);
    }
  }

  return mentions;
}

/**
 * Check whether a file buffer appears to contain binary data.
 *
 * @param {Buffer} buffer - File buffer to inspect.
 * @returns {boolean} True when the buffer appears binary.
 */
function isBinaryBuffer(buffer) {
  return buffer.subarray(0, 1024).includes(0);
}

/**
 * Recursively list project files while excluding heavy generated directories.
 *
 * @param {string} cwd - Project root directory to scan.
 * @param {string} [relativeDir=''] - Relative directory currently being scanned.
 * @returns {Promise<string[]>} Sorted relative file paths.
 */
export async function listProjectFiles(cwd, relativeDir = '') {
  const absoluteDir = path.join(cwd, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.env') {
      continue;
    }

    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) {
      continue;
    }

    const relativePath = path.posix.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listProjectFiles(cwd, relativePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files.sort((first, second) => first.localeCompare(second));
}

/**
 * Return project file candidates matching the current mention query.
 *
 * @param {string} cwd - Project root directory to scan.
 * @param {string} query - File query without the leading `@`.
 * @returns {Promise<string[]>} Matching relative file paths.
 */
export async function listMatchingProjectFiles(cwd, query) {
  const files = await listProjectFiles(cwd);
  const normalizedQuery = String(query || '').toLowerCase();

  if (!normalizedQuery) {
    return files;
  }

  return files.filter((filePath) =>
    filePath.toLowerCase().includes(normalizedQuery),
  );
}

/**
 * Build a file context block for one mentioned file.
 *
 * @param {string} cwd - Project root directory.
 * @param {string} relativeFilePath - Relative file path from the user message.
 * @returns {Promise<string>} File context block or diagnostic block.
 */
async function buildFileContextBlock(cwd, relativeFilePath) {
  const absoluteFilePath = path.resolve(cwd, relativeFilePath);
  const normalizedCwd = path.resolve(cwd);

  if (!absoluteFilePath.startsWith(normalizedCwd + path.sep)) {
    return `File: ${relativeFilePath}\nUnable to read file: path is outside the project.`;
  }

  try {
    const fileStat = await stat(absoluteFilePath);

    if (!fileStat.isFile()) {
      return `File: ${relativeFilePath}\nUnable to read file: path is not a file.`;
    }

    if (fileStat.size > MAX_FILE_BYTES) {
      return `File: ${relativeFilePath}\nUnable to read file: file is larger than ${MAX_FILE_BYTES} bytes.`;
    }

    const buffer = await readFile(absoluteFilePath);

    if (isBinaryBuffer(buffer)) {
      return `File: ${relativeFilePath}\nUnable to read file: file appears to be binary.`;
    }

    return `File: ${relativeFilePath}\n\`\`\`\n${buffer.toString('utf8')}\n\`\`\``;
  } catch (error) {
    return `File: ${relativeFilePath}\nUnable to read file: ${
      error?.message || String(error)
    }`;
  }
}

/**
 * Expand file mentions into model-readable context while preserving the message.
 *
 * @param {string} message - Raw user message.
 * @param {string} cwd - Project root directory.
 * @returns {Promise<string>} Message enriched with file context blocks.
 */
export async function expandFileMentions(message, cwd) {
  const mentions = parseFileMentions(message);

  if (mentions.length === 0) {
    return message;
  }

  const fileBlocks = await Promise.all(
    mentions.map((filePath) => buildFileContextBlock(cwd, filePath)),
  );

  return [
    'User message:',
    message,
    '',
    'Referenced files:',
    ...fileBlocks.map((block) => `---\n${block}`),
  ].join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm test test/fileMentions.test.js
```

Expected: PASS for all file mention tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/fileMentions.js test/fileMentions.test.js
git commit -m "feat: add file mention expansion"
```

---

### Task 4: Add Terminal Input Helpers And Highlighting

**Files:**
- Create: `src/utils/terminalInput.js`
- Create: `test/terminalInput.test.js`

- [ ] **Step 1: Write failing terminal input helper tests**

Create `test/terminalInput.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCandidateToToken,
  findActiveToken,
  moveSelection,
  renderHighlightedInput,
} from '../src/utils/terminalInput.js';

test('findActiveToken detects the slash token at the cursor', () => {
  assert.deepEqual(findActiveToken('please /he', 10), {
    start: 7,
    end: 10,
    value: '/he',
    type: 'command',
  });
});

test('findActiveToken detects the file token at the cursor', () => {
  assert.deepEqual(findActiveToken('check @src/ap', 13), {
    start: 6,
    end: 13,
    value: '@src/ap',
    type: 'file',
  });
});

test('applyCandidateToToken replaces a command token', () => {
  assert.deepEqual(applyCandidateToToken('please /he', 10, '/help'), {
    value: 'please /help',
    cursor: 12,
  });
});

test('applyCandidateToToken prefixes file candidates with @', () => {
  assert.deepEqual(applyCandidateToToken('check @src/ap', 13, 'src/app.js'), {
    value: 'check @src/app.js',
    cursor: 17,
  });
});

test('moveSelection wraps around candidate indexes', () => {
  assert.equal(moveSelection(0, -1, 3), 2);
  assert.equal(moveSelection(2, 1, 3), 0);
});

test('renderHighlightedInput highlights commands and file mentions', () => {
  const rendered = renderHighlightedInput('/help @src/app.js', ['/help']);

  assert.notEqual(rendered, '/help @src/app.js');
  assert.match(rendered, /\u001b\[/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test test/terminalInput.test.js
```

Expected: FAIL with module not found for `src/utils/terminalInput.js`.

- [ ] **Step 3: Implement pure terminal input helpers**

Create `src/utils/terminalInput.js` with these helpers first:

```js
import readline from 'node:readline';
import readlinePromises from 'node:readline/promises';
import { stdin as defaultInput, stdout as defaultOutput } from 'node:process';
import chalk from 'chalk';
import { listMatchingProjectFiles } from './fileMentions.js';
import { listMatchingSlashCommands } from './slashCommands.js';

const PROMPT = '> ';
const MAX_CANDIDATES = 8;

/**
 * Find the token around the cursor that can trigger a picker.
 *
 * @param {string} value - Current input value.
 * @param {number} cursor - Current cursor index.
 * @returns {{start: number, end: number, value: string, type: 'command' | 'file'} | null} Active token data, or null.
 */
export function findActiveToken(value, cursor) {
  const inputValue = String(value);
  let start = cursor;
  let end = cursor;

  while (start > 0 && !/\s/.test(inputValue[start - 1])) {
    start -= 1;
  }

  while (end < inputValue.length && !/\s/.test(inputValue[end])) {
    end += 1;
  }

  const tokenValue = inputValue.slice(start, end);

  if (tokenValue.startsWith('/')) {
    return { start, end, value: tokenValue, type: 'command' };
  }

  if (tokenValue.startsWith('@')) {
    return { start, end, value: tokenValue, type: 'file' };
  }

  return null;
}

/**
 * Replace the active token with a selected candidate.
 *
 * @param {string} value - Current input value.
 * @param {number} cursor - Current cursor index.
 * @param {string} candidate - Candidate selected by the user.
 * @returns {{value: string, cursor: number}} Updated input value and cursor.
 */
export function applyCandidateToToken(value, cursor, candidate) {
  const activeToken = findActiveToken(value, cursor);

  if (!activeToken) {
    return { value, cursor };
  }

  const replacement =
    activeToken.type === 'file' && !candidate.startsWith('@')
      ? `@${candidate}`
      : candidate;
  const nextValue =
    value.slice(0, activeToken.start) + replacement + value.slice(activeToken.end);
  const nextCursor = activeToken.start + replacement.length;

  return {
    value: nextValue,
    cursor: nextCursor,
  };
}

/**
 * Move candidate selection by a delta with wrap-around behavior.
 *
 * @param {number} currentIndex - Current selected candidate index.
 * @param {number} delta - Movement delta, usually -1 or 1.
 * @param {number} total - Total candidate count.
 * @returns {number} Next selected candidate index.
 */
export function moveSelection(currentIndex, delta, total) {
  if (total <= 0) {
    return 0;
  }

  return (currentIndex + delta + total) % total;
}

/**
 * Render an input value with highlighted slash commands and file mentions.
 *
 * @param {string} value - Input value to render.
 * @param {string[]} validCommands - Valid slash command names.
 * @returns {string} Highlighted terminal string.
 */
export function renderHighlightedInput(value, validCommands = []) {
  return String(value).replace(/(^|\s)(\/[^\s]+|@[^\s]+)/g, (match, prefix, token) => {
    if (token.startsWith('/') && validCommands.includes(token)) {
      return `${prefix}${chalk.green.bold(token)}`;
    }

    if (token.startsWith('@')) {
      return `${prefix}${chalk.cyan(token)}`;
    }

    return match;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm test test/terminalInput.test.js
```

Expected: PASS for all terminal input helper tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/terminalInput.js test/terminalInput.test.js
git commit -m "feat: add terminal input helpers"
```

---

### Task 5: Implement Interactive Terminal Input

**Files:**
- Modify: `src/utils/terminalInput.js`

- [ ] **Step 1: Add a failing fallback behavior test**

Append to `test/terminalInput.test.js`:

```js
import { EventEmitter } from 'node:events';
import { readInteractiveMessage } from '../src/utils/terminalInput.js';

test('readInteractiveMessage falls back when input is not a TTY', async () => {
  const fakeInput = new EventEmitter();
  fakeInput.isTTY = false;
  const fakeOutput = {
    write() {},
  };

  const resultPromise = readInteractiveMessage({
    input: fakeInput,
    output: fakeOutput,
    question: async () => '  hello  ',
  });

  assert.equal(await resultPromise, 'hello');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test test/terminalInput.test.js
```

Expected: FAIL because `readInteractiveMessage` is not exported.

- [ ] **Step 3: Add fallback and interactive implementation**

Extend `src/utils/terminalInput.js`:

```js
/**
 * Read a line through the old readline question fallback.
 *
 * @param {object} options - Fallback read options.
 * @param {NodeJS.ReadableStream} options.input - Input stream.
 * @param {NodeJS.WritableStream} options.output - Output stream.
 * @param {Function} [options.question] - Optional question function for tests.
 * @returns {Promise<string | null>} Trimmed user message, or null when closed.
 */
async function readFallbackMessage({ input, output, question }) {
  try {
    if (question) {
      return (await question(PROMPT)).trim();
    }

    const rl = readlinePromises.createInterface({ input, output });
    const answer = await rl.question(PROMPT);
    rl.close();

    return answer.trim();
  } catch (error) {
    if (error?.code === 'ERR_USE_AFTER_CLOSE') {
      return null;
    }

    throw error;
  }
}

/**
 * Build picker candidates for the active token.
 *
 * @param {{value: string, cursor: number, commands: Array<{name: string, description: string}>, cwd: string}} state - Current input state.
 * @returns {Promise<{type: 'command' | 'file', candidates: string[], selectedIndex: number} | null>} Picker state, or null.
 */
async function buildPickerState(state) {
  const activeToken = findActiveToken(state.value, state.cursor);

  if (!activeToken) {
    return null;
  }

  if (activeToken.type === 'command') {
    const candidates = listMatchingSlashCommands(activeToken.value, state.commands)
      .map((command) => command.name)
      .slice(0, MAX_CANDIDATES);

    return candidates.length
      ? { type: 'command', candidates, selectedIndex: 0 }
      : null;
  }

  const candidates = (await listMatchingProjectFiles(
    state.cwd,
    activeToken.value.slice(1),
  )).slice(0, MAX_CANDIDATES);

  return candidates.length ? { type: 'file', candidates, selectedIndex: 0 } : null;
}

/**
 * Render the prompt, input, and active picker to the terminal.
 *
 * @param {NodeJS.WritableStream} output - Output stream to write.
 * @param {{value: string, cursor: number, picker: object | null, commands: Array<{name: string}>}} state - Current input state.
 * @returns {void} No return value.
 */
function renderInput(output, state) {
  const validCommands = state.commands.map((command) => command.name);
  output.write('\x1b[2K\r');
  output.write(`${PROMPT}${renderHighlightedInput(state.value, validCommands)}`);

  if (!state.picker) {
    return;
  }

  output.write('\n');

  for (const [index, candidate] of state.picker.candidates.entries()) {
    const prefix = index === state.picker.selectedIndex ? '>' : ' ';
    const line =
      index === state.picker.selectedIndex
        ? chalk.inverse(` ${prefix} ${candidate} `)
        : ` ${prefix} ${candidate}`;
    output.write(`\x1b[2K${line}\n`);
  }

  output.write(`\x1b[${state.picker.candidates.length}A`);
}

/**
 * Clear picker rows from the terminal.
 *
 * @param {NodeJS.WritableStream} output - Output stream to write.
 * @param {number} count - Number of picker rows to clear.
 * @returns {void} No return value.
 */
function clearPicker(output, count) {
  if (count <= 0) {
    return;
  }

  output.write(`\x1b[${count}B`);

  for (let index = 0; index < count; index += 1) {
    output.write('\x1b[2K\r');

    if (index < count - 1) {
      output.write('\x1b[1A');
    }
  }

  output.write(`\x1b[${count}A`);
}

/**
 * Read one interactive terminal message with slash and file completion.
 *
 * @param {object} options - Input options.
 * @param {Array<{name: string, description: string}>} options.commands - Available slash commands.
 * @param {string} options.cwd - Current project directory.
 * @param {NodeJS.ReadableStream} [options.input] - Input stream.
 * @param {NodeJS.WritableStream} [options.output] - Output stream.
 * @param {Function} [options.question] - Optional fallback question function for tests.
 * @returns {Promise<string | null>} Trimmed submitted message, or null when closed.
 */
export async function readInteractiveMessage({
  commands,
  cwd,
  input = defaultInput,
  output = defaultOutput,
  question,
}) {
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    return readFallbackMessage({ input, output, question });
  }

  readline.emitKeypressEvents(input);
  input.setRawMode(true);
  input.resume();

  return new Promise((resolve) => {
    const state = {
      value: '',
      cursor: 0,
      commands,
      cwd,
      picker: null,
    };
    let lastPickerCount = 0;

    const rerender = async () => {
      clearPicker(output, lastPickerCount);
      state.picker = await buildPickerState(state);
      lastPickerCount = state.picker?.candidates.length || 0;
      renderInput(output, state);
    };

    const finish = (message) => {
      input.off('keypress', onKeypress);
      input.setRawMode(false);
      output.write('\n');
      resolve(message);
    };

    const onKeypress = async (character, key) => {
      if (key?.ctrl && key?.name === 'c') {
        finish(null);
        return;
      }

      if (key?.name === 'return') {
        if (state.picker) {
          const selected = state.picker.candidates[state.picker.selectedIndex];
          const next = applyCandidateToToken(state.value, state.cursor, selected);
          state.value = next.value;
          state.cursor = next.cursor;
          await rerender();
          return;
        }

        finish(state.value.trim());
        return;
      }

      if (key?.name === 'tab' && state.picker) {
        const selected = state.picker.candidates[state.picker.selectedIndex];
        const next = applyCandidateToToken(state.value, state.cursor, selected);
        state.value = next.value;
        state.cursor = next.cursor;
        await rerender();
        return;
      }

      if (key?.name === 'up' && state.picker) {
        state.picker.selectedIndex = moveSelection(
          state.picker.selectedIndex,
          -1,
          state.picker.candidates.length,
        );
        renderInput(output, state);
        return;
      }

      if (key?.name === 'down' && state.picker) {
        state.picker.selectedIndex = moveSelection(
          state.picker.selectedIndex,
          1,
          state.picker.candidates.length,
        );
        renderInput(output, state);
        return;
      }

      if (key?.name === 'backspace') {
        if (state.cursor > 0) {
          state.value =
            state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor);
          state.cursor -= 1;
        }

        await rerender();
        return;
      }

      if (key?.name === 'left') {
        state.cursor = Math.max(0, state.cursor - 1);
        await rerender();
        return;
      }

      if (key?.name === 'right') {
        state.cursor = Math.min(state.value.length, state.cursor + 1);
        await rerender();
        return;
      }

      if (character && !key?.ctrl && !key?.meta) {
        state.value =
          state.value.slice(0, state.cursor) + character + state.value.slice(state.cursor);
        state.cursor += character.length;
        await rerender();
      }
    };

    output.write(PROMPT);
    input.on('keypress', onKeypress);
  });
}
```

- [ ] **Step 4: Run terminal input tests**

Run:

```bash
pnpm test test/terminalInput.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/terminalInput.js test/terminalInput.test.js
git commit -m "feat: add interactive terminal input"
```

---

### Task 6: Integrate Interactive Input Into The App

**Files:**
- Modify: `src/app.js`

- [ ] **Step 1: Update imports**

In `src/app.js`, remove the `node:readline/promises` import and add:

```js
import { getCurrentTerminalDir } from './utils/pathUtils.js';
import { expandFileMentions } from './utils/fileMentions.js';
import { getSlashCommand, SLASH_COMMANDS } from './utils/slashCommands.js';
import { readInteractiveMessage } from './utils/terminalInput.js';
```

- [ ] **Step 2: Replace hardcoded command help**

Change `showWelcome()` command line to use the command list:

```js
info(`Commands: ${SLASH_COMMANDS.map((command) => command.name).join(', ')}`);
```

Change `showHelp()` command lines to:

```js
for (const command of SLASH_COMMANDS) {
  info(`  ${command.name.padEnd(7)} ${command.description}`);
}
```

- [ ] **Step 3: Remove the old readline message reader**

Delete the `readUserMessage(rl)` function from `src/app.js`.

- [ ] **Step 4: Replace readline setup in main**

Remove:

```js
const rl = readline.createInterface({ input, output });
```

Add:

```js
const cwd = getCurrentTerminalDir();
```

- [ ] **Step 5: Replace SIGINT handler**

Delete the `rl.on('SIGINT', ...)` block. Raw mode Ctrl+C is handled in
`readInteractiveMessage`.

- [ ] **Step 6: Replace message reading in the loop**

Change:

```js
const message = await readUserMessage(rl);
```

to:

```js
const message = await readInteractiveMessage({
  commands: SLASH_COMMANDS,
  cwd,
  input,
  output,
});
```

- [ ] **Step 7: Replace command branching**

Replace the three exact command checks with:

```js
const command = getSlashCommand(message, SLASH_COMMANDS);

if (command?.name === '/exit') {
  warn('Bye.');
  break;
}

if (command?.name === '/clear') {
  showWelcome();
  continue;
}

if (command?.name === '/help') {
  showHelp();
  continue;
}
```

- [ ] **Step 8: Expand file mentions before model requests**

Before `createAssistantResponse`, add:

```js
const expandedMessage = await expandFileMentions(message, cwd);
```

Then call:

```js
const response = await createAssistantResponse(
  client,
  expandedMessage,
  previousResponseId,
);
```

Keep:

```js
appendSessionTurn(session, message, response);
```

so the session stores the raw user-facing message.

- [ ] **Step 9: Remove final readline close**

Delete:

```js
rl.close();
```

- [ ] **Step 10: Run all tests**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/app.js
git commit -m "feat: integrate interactive input"
```

---

### Task 7: Format And Manual Verification

**Files:**
- Modify only files changed by Prettier if needed.

- [ ] **Step 1: Run Prettier**

Run:

```bash
pnpm format
```

Expected: PASS and no syntax errors.

- [ ] **Step 2: Run all tests**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 3: Run the app for interactive smoke testing**

Run:

```bash
pnpm start
```

Manual checks:

- Type `/` and confirm the command picker appears.
- Use up and down arrows to move the highlighted command candidate.
- Press Tab to insert a command.
- Type `/help` manually and press Enter; help appears.
- Type `@` and confirm the file picker appears.
- Use arrows and Tab to insert a file mention.
- Confirm inserted `/command` and `@path` are highlighted in the input line.
- Send a normal message containing `@src/app.js`; if OpenAI is configured, the
  assistant receives the expanded file content.

- [ ] **Step 4: Stop the app**

Press Ctrl+C or type `/exit`.

Expected: the app exits cleanly.

- [ ] **Step 5: Commit any formatting changes**

```bash
git status --short
git add package.json src test docs/superpowers/plans/2026-05-29-interactive-command-file-input.md
git commit -m "chore: format interactive input changes"
```

Only run the commit if `git status --short` shows remaining tracked changes.

---

## Self-Review

- Spec coverage: command picker, file picker, candidate navigation, Tab/Enter confirmation, manual command entry, highlighted input tokens, highlighted candidate rows, file expansion, raw session persistence, fallback input, diagnostics, binary and large-file guards, and tests are covered.
- Placeholder scan: no `TBD`, `TODO`, "implement later", or unspecified test steps remain.
- Type consistency: helper names and signatures are consistent across tasks: `SLASH_COMMANDS`, `listMatchingSlashCommands`, `getSlashCommand`, `parseFileMentions`, `listProjectFiles`, `listMatchingProjectFiles`, `expandFileMentions`, `findActiveToken`, `applyCandidateToToken`, `moveSelection`, `renderHighlightedInput`, and `readInteractiveMessage`.
