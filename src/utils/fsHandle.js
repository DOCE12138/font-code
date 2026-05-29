import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getCurrentTerminalDir, getUserHomeDir } from './pathUtils.js';
import {
  FRONT_CODE_DIR_NAME,
  SESSION_DIR_NAME,
  SESSION_FILE_NAME,
} from '../constants/fileName.js';

/**
 * 将 JSON 数据写入当前项目对应的用户 session 文件。
 *
 * @param {unknown} jsonData - 需要序列化并写入 session 文件的 JSON 数据。
 * @returns {Promise<string>} 写入成功后的 session 文件绝对路径。
 */
export async function writeProjectSessionJson(jsonData) {
  const currentProjectDir = getCurrentTerminalDir();
  const currentProjectName = path.basename(currentProjectDir);
  const projectSessionDir = path.join(
    getUserHomeDir(),
    FRONT_CODE_DIR_NAME,
    SESSION_DIR_NAME,
    currentProjectName,
  );
  const sessionFilePath = path.join(projectSessionDir, SESSION_FILE_NAME);

  await mkdir(projectSessionDir, { recursive: true });
  await writeFile(sessionFilePath, JSON.stringify(jsonData, null, 2), 'utf8');

  return sessionFilePath;
}
