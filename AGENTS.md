# 项目介绍

本项目是一个 AI 终端应用项目，该项目运行后，可在终端启动。辅助用户进行开发，类似于 claude code。

# 项目技术栈

使用 nodejs 配合 node 的一些库进行开发，请求大模型接口用的是 openai。项目开发使用 js，不是用 ts。

# 项目的目录结构

[./src]("项目的代码存放处")
[./src/app.ts]("项目的启动文件，通过运行该文件启动项目")
[./src/docs]("项目携带给大模型接口的文档模板放在这里面")
[./src/tool]("项目的本地 functiontool 到时候读取 tools 里的内容给到大模型接口")
[./src/utils]("项目代码里用到的一些工具函数存放处")

# 项目额外规范

1. 项目使用的是 esmodule 规范，而不是 commonjs 规范。
2. 项目使用的是 js，而不是 ts。
3. 注意扫描 package.json，如果有没有安装的包，请运行 pnpm install 安装。
4. 生成的代码需要遵守 prettier 的规范，项目里已经安装了 prettier 插件，生成的代码需要符合 prettier 的规范，否则会报错。
5. 每次生成新的方法或函数时，必须编写标准化的 JSDoc 注释。函数注释需要包含函数功能说明、参数的类型和描述、返回值的类型和描述；如果函数没有参数或没有返回值，也需要在注释中明确说明。
6. 如果需要 console.log 输出内容，使用 [./utils/logger.js]("项目里封装的 logger 工具") 里的 logger.info 方法进行输出，而不是直接使用 console.log。
