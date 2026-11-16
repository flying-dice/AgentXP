#!/usr/bin/env node
// The panelist's tool: operate the app like a person, with the mouse and the keyboard, and look at screenshots.
// Usage: UX_SESSION=<session folder> node scripts/ux-panel/ux.mjs <command> ...   (see PANELIST.md)
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseCommand } from './lib/args.mjs'
import { request } from './lib/rpc.mjs'

const USAGE = `ux commands:
  windows                         list the program windows
  switch <index>                  look at another window
  shot [--out file.png]           take a screenshot (also prints the text you can read on screen)
  click <x> <y> [--double|--right]
  move <x> <y>                    move the mouse (hover)
  drag <x1> <y1> <x2> <y2>
  scroll <x> <y> <dy>             dy is in pixels, positive = down: 100 is one wheel notch, 200 to 300 is about a page
                                  (under 20 barely moves anything); the output says how far the content moved
  type "<text>"                   type text where the keyboard focus is
  key <combo>                     Enter, Escape, Tab, Shift+Tab, Control+N, Alt+F4, F1 ...
  wait <ms>                       wait up to 10000 ms
  find "<visible text>"           where does this text appear on screen?
Coordinates are pixels in the current window (screenshots are 1280x800). Every action prints a new screenshot path and "Step N", the number of actions you have done (click, move, drag, scroll, type and key each count one).`

let argv = process.argv.slice(2)
let sessionDir = process.env.UX_SESSION
const i = argv.indexOf('--session')
if (i >= 0) {
  sessionDir = argv[i + 1]
  argv.splice(i, 2)
}
if (!argv.length || argv[0] === 'help' || argv[0] === '--help') {
  console.log(USAGE)
  process.exit(0)
}
try {
  const request_ = parseCommand(argv)
  if (!sessionDir) throw new Error('set UX_SESSION to the session folder you were given')
  const file = join(resolve(sessionDir), 'session.json')
  if (!existsSync(file)) throw new Error('no session found there')
  const { socket } = JSON.parse(readFileSync(file, 'utf8'))
  const reply = await request(socket, request_)
  console.log(reply.text)
  process.exitCode = reply.ok ? 0 : 1
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`)
  if (/command|takes|number|option/.test(String(error))) console.error('Run "ux help" for the commands.')
  process.exitCode = 2
}
