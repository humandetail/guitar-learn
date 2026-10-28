const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const root = path.resolve(__dirname, '../miniprogram')
const app = require('../miniprogram/app.json')
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? files(path.join(dir, item.name)) : [path.join(dir, item.name)]) }
function definition(file) {
  let result
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { require: createRequire(file), Page: value => { result = value }, Component: value => { result = value } }, { filename: file })
  return result
}
test('every page/component resolves, templates use real bindings and registered handlers', () => {
  for (const page of app.pages) assert.ok(fs.existsSync(path.join(root, page + '.wxml')))
  for (const file of files(root).filter(file => file.endsWith('.wxml'))) {
    const base = file.slice(0, -5), config = JSON.parse(fs.readFileSync(base + '.json', 'utf8'))
    const source = fs.readFileSync(file, 'utf8'), spec = definition(base + '.js')
    const handlers = spec.methods || spec
    for (const match of source.matchAll(/(?:bind(?:tap|change)|catchtap)="([^"]+)"/g)) assert.equal(typeof handlers[match[1]], 'function', `${file}: ${match[1]}`)
    assert.equal(/wx:(?:if|elif|for)="(?!\{\{)/.test(source), false, file + ': literal directive')
    assert.equal(/<br\b/.test(source), false, file + ': unsupported HTML tag')
    for (const target of Object.values(config.usingComponents || {})) assert.ok(fs.existsSync(path.join(root, target + '.js')))
    const builtins = ['view','text','button','block','picker','checkbox','checkbox-group','label','canvas','slider']
    for (const match of source.matchAll(/<([a-z][\w-]*)\b/g)) assert.ok(builtins.includes(match[1]) || (config.usingComponents || {})[match[1]], `${file}: unknown tag ${match[1]}`)
  }
  const total = files(root).reduce((sum, file) => sum + fs.statSync(file).size, 0)
  assert.ok(total < 2 * 1024 * 1024, 'Keep the offline main package below 2 MiB')
})
