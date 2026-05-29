import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import ora from 'ora';
import { OPENAI_MODEL, SESSION_VERSION } from './constants/fileName.js';
import {
  createAssistantResponse,
  createOpenAIClient,
  formatOpenAIError,
} from './request/openai.js';
import { writeProjectSessionJson } from './utils/fsHandle.js';
import {
  assistantMarkdown,
  info,
  logWithColor,
  success,
  warn,
  writeBlankLine,
  writeErrorLine,
} from './utils/logger.js';

const APP_NAME = 'Front Code';

/**
 * Display the terminal welcome screen.
 *
 * No parameters.
 *
 * @returns {void} No return value.
 */
function showWelcome() {
  console.clear();
  logWithColor('='.repeat(48), 'gray');
  success(` ${APP_NAME}`);
  info(' AI terminal coding assistant');
  logWithColor('='.repeat(48), 'gray');
  writeBlankLine();
  info('Type your message and press Enter to chat.');
  warn('Configure OpenAI in .front-code/settings.json.');
  info('Commands: /help, /clear, /exit');
  writeBlankLine();
}

/**
 * Display terminal command help.
 *
 * No parameters.
 *
 * @returns {void} No return value.
 */
function showHelp() {
  writeBlankLine();
  success('Available commands:');
  info('  /help   Show this help message');
  info('  /clear  Clear the terminal');
  info('  /exit   Exit the application');
  writeBlankLine();
  logWithColor(`Current model: ${OPENAI_MODEL}`, 'gray');
  writeBlankLine();
}

/**
 * Prints a message from the assistant.
 *
 * @param {string} message - The message to print.
 * @returns {void} No return value.
 */
function printAssistantMessage(message) {
  assistantMarkdown(message);
}

/**
 * Create the initial chat session state.
 *
 * No parameters.
 *
 * @returns {object} Initial chat session state.
 */
function createInitialSession() {
  const now = new Date().toISOString();

  return {
    version: SESSION_VERSION,
    model: OPENAI_MODEL,
    startedAt: now,
    updatedAt: now,
    previousResponseId: null,
    messages: [],
  };
}

/**
 * Add one successful chat turn to the session state.
 *
 * @param {object} session - Current chat session state.
 * @param {string} userMessage - User message content.
 * @param {{id: string, text: string}} assistantResponse - Assistant response data.
 * @returns {object} Updated chat session state.
 */
function appendSessionTurn(session, userMessage, assistantResponse) {
  const now = new Date().toISOString();

  session.updatedAt = now;
  session.previousResponseId = assistantResponse.id;
  session.messages.push(
    {
      role: 'user',
      content: userMessage,
      createdAt: now,
    },
    {
      role: 'assistant',
      content: assistantResponse.text,
      responseId: assistantResponse.id,
      createdAt: now,
    },
  );

  return session;
}

/**
 * Persist chat session state to the current project's session file.
 *
 * @param {object} session - Chat session state to persist.
 * @returns {Promise<void>} Resolves when the session write attempt is complete.
 */
async function persistSession(session) {
  try {
    await writeProjectSessionJson(session);
  } catch (error) {
    warn('Session save failed: ' + (error?.message || String(error)));
  }
}

/**
 * Read one user message from the terminal.
 *
 * @param {readline.Interface} rl - Readline interface used to ask terminal input.
 * @returns {Promise<string | null>} Trimmed user message, or null when input is closed.
 */
async function readUserMessage(rl) {
  try {
    return (await rl.question('> ')).trim();
  } catch (error) {
    if (error?.code === 'ERR_USE_AFTER_CLOSE') {
      return null;
    }

    throw error;
  }
}

/**
 * Start the terminal chat application.
 *
 * No parameters.
 *
 * @returns {Promise<void>} Resolves when the application exits.
 */
async function main() {
  const rl = readline.createInterface({ input, output });
  const client = createOpenAIClient();
  const session = createInitialSession();
  let previousResponseId = null;

  showWelcome();

  rl.on('SIGINT', () => {
    writeBlankLine();
    warn('Bye.');
    rl.close();
  });

  while (true) {
    const message = await readUserMessage(rl);

    if (message === null) {
      break;
    }

    if (!message) {
      continue;
    }

    if (message === '/exit') {
      warn('Bye.');
      break;
    }

    if (message === '/clear') {
      showWelcome();
      continue;
    }

    if (message === '/help') {
      showHelp();
      continue;
    }

    if (!client) {
      printAssistantMessage(
        'OpenAI apiKey is not configured. Please add it to .front-code/settings.json.',
      );
      continue;
    }

    const spinner = ora({
      text: 'Assistant is thinking...',
      color: 'gray',
      isSilent: !process.stdout.isTTY,
    }).start();

    try {
      const response = await createAssistantResponse(
        client,
        message,
        previousResponseId,
      );

      spinner.stop();
      previousResponseId = response.id;
      appendSessionTurn(session, message, response);
      await persistSession(session);
      printAssistantMessage(response.text);
    } catch (error) {
      spinner.stop();
      printAssistantMessage(formatOpenAIError(error));
    }
  }

  rl.close();
}

main().catch((error) => {
  writeErrorLine('Application failed to start:');
  writeErrorLine(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
