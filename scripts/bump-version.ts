#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const version = process.argv[2]

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
   console.error('Usage: bun run version <major.minor.patch>')
   process.exit(1)
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// package.json
const pkgPath = resolve(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
pkg.version = version
writeFileSync(pkgPath, JSON.stringify(pkg, null, 3) + '\n')
console.log(`package.json          → ${version}`)

// tauri.conf.json
const tauriPath = resolve(root, 'src-tauri/tauri.conf.json')
const tauri = JSON.parse(readFileSync(tauriPath, 'utf8'))
tauri.version = version
writeFileSync(tauriPath, JSON.stringify(tauri, null, 3) + '\n')
console.log(`tauri.conf.json       → ${version}`)

// Cargo.toml — replace the package version line only
const cargoPath = resolve(root, 'src-tauri/Cargo.toml')
const cargo = readFileSync(cargoPath, 'utf8')
const updated = cargo.replace(/^(version\s*=\s*)"[\d.]+"/m, `$1"${version}"`)
writeFileSync(cargoPath, updated)
console.log(`Cargo.toml            → ${version}`)
