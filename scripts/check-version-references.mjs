import { existsSync, readdirSync, readFileSync } from "node:fs"

const packageJson = JSON.parse(readFileSync("package.json", "utf8"))
const version = packageJson.version
const placeholder = "{{DOCKER_VERSION_TAG}}"
// In this source repo every backend is checked against its overlay docs in backends/<name>/repo;
// in a published backend repo (package.json "backend") the docs live at the root.
const backends = packageJson.backend ? [packageJson.backend] : readdirSync("backends").filter((name) => existsSync(`backends/${name}/release.json`))

const fail = (message) => {
  console.error(`版本引用检查失败：${message}`)
  process.exitCode = 1
}

if (!/^\d+\.\d+\.\d+(?:-\d+)?$/.test(version)) {
  fail(`package.json 中的版本格式无效：${version}`)
}

const docPath = (backend, name) => packageJson.backend ? name : `backends/${backend}/repo/${name}`

for (const backend of backends) {
  const { tagSuffix: suffix, displaySuffix } = JSON.parse(readFileSync(`backends/${backend}/release.json`, "utf8"))
  const concreteTagPattern = new RegExp(`v\\d+\\.\\d+\\.\\d+(?:-\\d+)?-${suffix}`, "g")

  // A backend may carry a hotfix number on top of the shared base version (v1.2.3-1-…).
  const config = readFileSync(`backends/${backend}/config.ts`, "utf8")
  const baseVersion = version.replace(/-\d+$/, "").replaceAll(".", "\\.")
  const configVersion = config.match(/version: "([^"]+)"/)?.[1] ?? ""
  if (!new RegExp(`^v${baseVersion}(?:-\\d+)?-${displaySuffix}$`).test(configVersion)) {
    fail(`${backend}: APP_CONFIG.version 应为 v${version}-${displaySuffix}（热修可为 v${version}-N-${displaySuffix}）`)
  }

  const dockerHub = readFileSync(docPath(backend, "DOCKERHUB.md"), "utf8")
  if (dockerHub.split(placeholder).length - 1 !== 1) {
    fail(`${backend}: DOCKERHUB.md 必须且只能包含一个 ${placeholder}`)
  }
  if (concreteTagPattern.test(dockerHub)) {
    fail(`${backend}: DOCKERHUB.md 不得包含写死的正式版本标签`)
  }

  const readme = readFileSync(docPath(backend, "README.md"), "utf8")
  concreteTagPattern.lastIndex = 0
  if (concreteTagPattern.test(readme)) {
    fail(`${backend}: README.md 不得包含写死的正式版本标签`)
  }
  if (!readme.includes(`vX.Y.Z-${suffix}`)) {
    fail(`${backend}: README.md 必须使用 vX.Y.Z-${suffix} 表示固定版本标签格式`)
  }

  const agents = readFileSync("AGENTS.md", "utf8")
  const baselineSection = agents.match(/# 二、当前稳定生产基线([\s\S]*?)\n---/)?.[1]
  if (!baselineSection) {
    fail("无法定位 AGENTS.md 的当前稳定生产基线章节")
  } else {
    concreteTagPattern.lastIndex = 0
    if (concreteTagPattern.test(baselineSection)) {
      fail(`${backend}: AGENTS.md 的生产基线不得写死正式版本标签`)
    }
  }
}

if (!process.exitCode) {
  console.log(`版本引用检查通过：应用版本 ${version}（${backends.join("、")}），文档未写死当前发布标签`)
}
