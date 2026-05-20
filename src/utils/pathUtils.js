import os from 'node:os';

/**
 * 获取当前用户电脑的 user/home 目录。
 * No parameters.
 * @returns {string} 当前用户的 home 目录绝对路径。
 */
export function getUserHomeDir() {
  return os.homedir();
}

/**
 * 获取当前终端所在的工作目录。
 * No parameters.
 * @returns {string} 当前 Node.js 进程的工作目录绝对路径。
 */
export function getCurrentTerminalDir() {
  return process.cwd();
}
