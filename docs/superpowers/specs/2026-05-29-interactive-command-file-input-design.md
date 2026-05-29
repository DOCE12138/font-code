# Interactive Command And File Input Design

## Context

Front Code currently reads input with `readline/promises` and `rl.question('> ')`.
That model only receives a completed line, so it cannot show command or file
pickers while the user is typing. The app needs an interactive input layer that
can react to `/`, `@`, arrow keys, Tab, and Enter before the message is
submitted.

## Goals

- Typing `/` at the current command token opens a command picker.
- Users can move through command candidates with the up and down arrows.
- Tab or Enter confirms the highlighted command candidate.
- Users can still type a full command manually, such as `/help`.
- Typing `@` at the current file token opens a file picker rooted at the
  current terminal directory.
- Users can move through file candidates with the up and down arrows.
- Tab or Enter confirms the highlighted file candidate and inserts an
  `@relative/path` mention into the input line.
- Confirmed commands and file mentions are highlighted in the visible input
  line.
- The highlighted candidate in an open picker is visually distinct.
- Before sending a message to the model, confirmed `@relative/path` mentions
  are expanded into file context blocks while preserving the user's original
  text.

## Non-Goals

- Multi-select file picker UI.
- Recursive fuzzy ranking beyond simple substring matching.
- Editing files through the picker.
- Persisting picked files outside the submitted chat message.

## Architecture

Add `src/utils/terminalInput.js` for interactive terminal input. It will use
`readline.emitKeypressEvents` and raw mode when `stdin` is a TTY. The module
will own the current input buffer, cursor position, active picker state, input
line rendering, and key handling. It will expose:

- `readInteractiveMessage(options)`: resolves to the submitted raw user message,
  or `null` when input closes.
- Pure helper functions for command matching, file mention parsing, token
  detection, candidate selection, and visible line highlighting.

Keep command execution in `src/app.js`. The app will pass command metadata to
the input layer, then continue handling `/help`, `/clear`, and `/exit` after a
line is submitted.

Add file expansion helpers, either in `src/utils/fileMentions.js` or alongside
the file system helpers:

- `parseFileMentions(message)`: returns unique relative file paths referenced by
  `@path` tokens.
- `expandFileMentions(message, cwd)`: reads mentioned files and returns a model
  message containing the original user text plus file context blocks.

`src/app.js` will save the original user message in the session but send the
expanded message to OpenAI.

## Interaction Details

The input prompt remains `> `. While the user types, the renderer redraws the
single input line and, when active, a small candidate list below it.

For command completion:

- A picker opens when the active token starts with `/`.
- Candidates are filtered by prefix against known commands.
- The current candidate is highlighted.
- Up and down arrows change the highlighted candidate.
- Tab confirms the candidate and replaces the active command token with the
  full command.
- Enter confirms the candidate if the picker is open. If no picker is open,
  Enter submits the message.

For file mention completion:

- A picker opens when the active token starts with `@`.
- Candidates are relative file paths under the current terminal directory.
- Ignored directories include `.git`, `node_modules`, `.front-code`, and common
  build output folders such as `dist` and `coverage`.
- Candidates are filtered by substring after the `@` prefix.
- Tab or Enter replaces the active token with `@relative/path`.

For highlighting:

- Confirmed or manually typed valid commands are rendered with the existing
  terminal color helpers.
- Recognized `@relative/path` mentions are rendered in a distinct color.
- The active candidate row uses inverse or bold styling so keyboard focus is
  visible.

## Data Flow

1. `main()` creates the OpenAI client and session.
2. `readInteractiveMessage({ commands, cwd })` returns the raw submitted text.
3. `app.js` handles known slash commands directly.
4. For normal chat messages, `expandFileMentions(rawMessage, cwd)` builds the
   OpenAI request text.
5. `createAssistantResponse(client, expandedMessage, previousResponseId)` sends
   expanded content to the model.
6. `appendSessionTurn(session, rawMessage, response)` stores the user-facing
   original text.

## Error Handling

- If terminal raw mode is unavailable, fall back to the current
  `readline/promises` behavior without interactive pickers.
- If a mentioned file does not exist or cannot be read, include a short
  diagnostic block in the expanded model message instead of throwing.
- File scanning failures return an empty picker list and do not crash input.
- Binary-looking files are not expanded as raw content; they produce a short
  diagnostic block.

## Testing

Use Node's built-in test runner for focused unit tests. Add a test script in
`package.json` if needed.

Test cases:

- Command candidates filter by typed prefix.
- Command picker selection wraps or clamps consistently.
- File mention parser finds unique `@relative/path` tokens.
- File mention expansion preserves the original message and appends readable
  file content.
- Missing files are represented as diagnostic context.
- Ignored directories are excluded from file candidates.
- Highlight rendering returns colored strings without changing the underlying
  submitted message.

Manual verification:

- Run the app and type `/`, use arrows, then Tab and Enter.
- Type a full command manually and confirm it still works.
- Type `@`, choose a file with arrows, confirm it, and send a message.
- Confirm the visible command/file mention is highlighted.
