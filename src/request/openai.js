import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import { getCurrentTerminalDir, getUserHomeDir } from '../utils/pathUtils.js';

export const OPENAI_MODEL = 'gpt-5.5';
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
const SETTINGS_DIR_NAME = '.front-code';
const SETTINGS_FILE_NAME = 'settings.json';

const SYSTEM_PROMPT =
  'You are Front Code, an AI terminal coding assistant. Reply in Chinese unless the user asks for another language.';

/**
 * Get the absolute path of the front-code settings file under a base directory.
 *
 * @param {string} baseDir - Base directory used to resolve `.front-code/settings.json`.
 * @returns {string} Absolute settings file path.
 */
function getSettingsFilePath(baseDir) {
  return path.join(baseDir, SETTINGS_DIR_NAME, SETTINGS_FILE_NAME);
}

/**
 * Read and parse a settings JSON file when it exists.
 *
 * @param {string} settingsPath - Absolute path of the settings JSON file.
 * @returns {object} Parsed settings object, or an empty object when the file does not exist.
 */
function readSettingsFile(settingsPath) {
  if (!existsSync(settingsPath)) {
    return {};
  }

  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new Error('settings must be a JSON object');
    }

    return settings;
  } catch (error) {
    throw new Error(
      `Failed to read settings file: ${settingsPath}. ${error.message}`,
    );
  }
}

/**
 * Load OpenAI settings from user and terminal config files.
 *
 * No parameters.
 *
 * @returns {object} Merged OpenAI settings. Terminal settings override user settings.
 */
export function getOpenAISettings() {
  const userSettingsPath = getSettingsFilePath(getUserHomeDir());
  const terminalSettingsPath = getSettingsFilePath(getCurrentTerminalDir());
  const userSettings = readSettingsFile(userSettingsPath);
  const terminalSettings = readSettingsFile(terminalSettingsPath);

  return {
    ...userSettings,
    ...terminalSettings,
  };
}

/**
 * Create an OpenAI client from `.front-code/settings.json`.
 *
 * No parameters.
 *
 * @returns {OpenAI | null} OpenAI client instance, or null when apiKey is missing.
 */
export function createOpenAIClient() {
  const settings = getOpenAISettings();

  if (!settings.apiKey) {
    return null;
  }

  return new OpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.baseURL || DEFAULT_OPENAI_BASE_URL,
  });
}

/**
 * Create an assistant response through the OpenAI Responses API.
 *
 * @param {OpenAI} client - OpenAI client instance.
 * @param {string} message - User input message.
 * @param {string | null} previousResponseId - Previous response ID used to keep conversation context.
 * @returns {Promise<{id: string, text: string}>} Assistant response ID and text content.
 */
export async function createAssistantResponse(
  client,
  message,
  previousResponseId,
) {
  const request = {
    model: OPENAI_MODEL,
    input: message,
    instructions: SYSTEM_PROMPT,
  };

  if (previousResponseId) {
    request.previous_response_id = previousResponseId;
  }

  const response = await client.responses.create(request);

  return {
    id: response.id,
    text: response.output_text || 'The model returned no text output.',
  };
}

/**
 * Format an OpenAI request error for terminal output.
 *
 * @param {unknown} error - Error thrown by the OpenAI request.
 * @returns {string} Human-readable error message.
 */
export function formatOpenAIError(error) {
  const status = error?.status ? `HTTP ${error.status}` : 'Request failed';
  const message = error?.message || String(error);

  return `${status}: ${message}`;
}
