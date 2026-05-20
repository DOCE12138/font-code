import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  OPENAI_MODEL,
  createAssistantResponse,
  createOpenAIClient,
  formatOpenAIError,
} from './request/openai.js';

const APP_NAME = 'Front Code';

function showWelcome() {
  console.clear();
  console.log('='.repeat(48));
  console.log(` ${APP_NAME}`);
  console.log(' AI terminal coding assistant');
  console.log('='.repeat(48));
  console.log('');
  console.log('Type your message and press Enter to chat.');
  console.log('Configure OpenAI in .front-code/settings.json.');
  console.log('Commands: /help, /clear, /exit');
  console.log('');
}

function showHelp() {
  console.log('');
  console.log('Available commands:');
  console.log('  /help   Show this help message');
  console.log('  /clear  Clear the terminal');
  console.log('  /exit   Exit the application');
  console.log('');
  console.log(`Current model: ${OPENAI_MODEL}`);
  console.log('');
}

/**
 * Prints a message from the assistant.
 * @param {string} message - The message to print.
 */
function printAssistantMessage(message) {
  console.log('');
  console.log(`Assistant: ${message}`);
  console.log('');
}

async function main() {
  const rl = readline.createInterface({ input, output });
  const client = createOpenAIClient();
  let previousResponseId = null;

  showWelcome();

  rl.on('SIGINT', () => {
    console.log('');
    console.log('Bye.');
    rl.close();
  });

  while (true) {
    const message = (await rl.question('> ')).trim();

    if (!message) {
      continue;
    }

    if (message === '/exit') {
      console.log('Bye.');
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

    try {
      console.log('');
      console.log('Assistant is thinking...');

      const response = await createAssistantResponse(
        client,
        message,
        previousResponseId,
      );

      previousResponseId = response.id;
      printAssistantMessage(response.text);
    } catch (error) {
      printAssistantMessage(formatOpenAIError(error));
    }
  }

  rl.close();
}

main().catch((error) => {
  console.error('Application failed to start:');
  console.error(error);
  process.exitCode = 1;
});
