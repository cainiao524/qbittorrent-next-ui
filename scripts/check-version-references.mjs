import { readFileSync } from "node:fs"

const packageJson = JSON.parse(readFileSync("package.json", "utf8"))
const version = packageJson.version
const suffix = "funky9"
const displaySuffix = "funky⑨"
const placeholder = "{{DOCKER_VERSION_TAG}}"

const fail = (message) => {
  console.error(`版本引用检查失败：${message}`)
  process.exitCode = 1
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  fail(`package.json 中的版本格式无效：${version}`)
}

const config = readFileSync("src/lib/config.ts", "utf8")
const expectedDisplayVersion = `version: "v${version}-${displaySuffix}"`
if (!config.includes(expectedDisplayVersion)) {
  fail(`APP_CONFIG.version 应为 v${version}-${displaySuffix}`)
}

const concreteTagPattern = new RegExp(`v\\d+\\.\\d+\\.\\d+-${suffix}`, "g")
const dockerHub = readFileSync("DOCKERHUB.md", "utf8")
const placeholderCount = dockerHub.split(placeholder).length - 1
if (placeholderCount !== 1) {
  fail(`DOCKERHUB.md 必须且只能包含一个 ${placeholder}`)
}
if (concreteTagPattern.test(dockerHub)) {
  fail("DOCKERHUB.md 不得包含写死的正式版本标签")
}

const readme = readFileSync("README.md", "utf8")
concreteTagPattern.lastIndex = 0
if (concreteTagPattern.test(readme)) {
  fail("README.md 不得包含写死的正式版本标签")
}
if (!readme.includes(`vX.Y.Z-${suffix}`)) {
  fail(`README.md 必须使用 vX.Y.Z-${suffix} 表示固定版本标签格式`)
}

const agents = readFileSync("AGENTS.md", "utf8")
const baselineSection = agents.match(/# 二、当前稳定生产基线([\s\S]*?)\n---/)?.[1]
if (!baselineSection) {
  fail("无法定位 AGENTS.md 的当前稳定生产基线章节")
} else {
  concreteTagPattern.lastIndex = 0
  if (concreteTagPattern.test(baselineSection)) {
    fail("AGENTS.md 的生产基线不得写死正式版本标签")
  }
}

if (!process.exitCode) {
  console.log(`版本引用检查通过：应用版本 ${version}，文档未写死当前发布标签`)
}
