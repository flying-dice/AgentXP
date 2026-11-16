// H-80: the self-contained prompt for ONE fresh panelist agent that runs ONE task from start to stop.
// `session.mjs brief --task <id> --level <level>` prints it; the orchestrator pastes it as it is into a new agent.
import { asksQuestion } from './tasktext.mjs'

/** The record template (also in FACILITATOR.md). */
export const RECORD_TEMPLATE = `# <task> <title> - <level>
- Result: PASS|FAIL|MANUAL (<reason from check>)   Steps: <n> of <budget>   Time: <min>
- Context: fresh panelist, previous tasks: none
- SEQ: <1-7> - <one sentence>   (1 = very difficult, 7 = very easy; a high number means EASY)
- Check runs (all runs of check.json.runs and why they differ; "one run" if only one): ...
- Errors (wrong clicks, undo, dead ends, error messages seen): ...
- Help used (F1, Help topics): ...
- Steps (the numbered step list of the final report): ...
- Frustrations / what they would change: ...
- Evidence: <session folder copy>/shots/NNN.png, log.jsonl
- Researcher notes (answer checks, MANUAL decisions): ...`

/**
 * `taskInfo` is the entry of the task in docs/ux/tasks.md, `panelist` the text of PANELIST.md (LEVEL is replaced here).
 * Returns the prompt text.
 */
export function buildBrief({ task, level, taskInfo, panelist, round = 'r1', out, session = 'scripts/ux-panel/session.mjs' }) {
  const folder = out ?? `/tmp/ux-sessions/${round}/${task}-${level}`
  const record = `docs/ux/panel/${round}/${task}-${level}.md`
  const asks = asksQuestion(taskInfo)
  const checkCmd = asks
    ? `node ${session} check --out ${folder} --answer "<the text after 'Answer:' in your final report>"\n(if your final report has no Answer: line, use --no-answer instead; an answer of fewer than 5 words is refused)`
    : `node ${session} check --out ${folder}`
  return [
    `# One task, one fresh panelist: ${task} at level ${level}`,
    '',
    'You are the ONE panelist for this ONE task. You run it from start to stop with the five steps below. You have done no other task of this study (H-69, H-80) and know nothing about this program.',
    '',
    '## 1. Start (run from the repository root)',
    '',
    '```',
    `node ${session} start --task ${task} --level ${level} --out ${folder} 2>/dev/null`,
    '```',
    '',
    'It prints the block between `=== FOR THE PANELIST` and `=== END ===`: the session folder, your step budget, your scenario (with any address already filled in) and your `ux` command prefix. That block is your whole task. Discard anything else (the `2>/dev/null` hides facilitator notes on purpose). If `start` fails, stop and report `SETUP FAIL` with the error text; do not retry with other options.',
    '',
    '## 2. Act (you are the panelist)',
    '',
    `Until your final report is written you are only the panelist described next: you operate the program only with the \`ux\` command, you read nothing else, and you do not run \`check\`, \`stop\` or any other \`session.mjs\` command. Your level is **${level}**.`,
    '',
    '--- BEGIN PANELIST BRIEFING ---',
    panelist.replaceAll('LEVEL', level).trim(),
    '--- END PANELIST BRIEFING ---',
    '',
    '## 3. Check (only after your final report is complete)',
    '',
    'Write your final report first (outcome, steps, stuck points, help, `- SEQ: <n> - <why>`, frustrations). Then ask the app for the verdict, once:',
    '',
    '```',
    checkCmd,
    '```',
    '',
    'The verdict (PASS, FAIL or MANUAL, steps against the budget) is the result. Never go back and change your report or act in the app because of it. If the command refuses (for example the answer is too short), fix the command line, not the report.',
    '',
    '## 4. Record',
    '',
    `Write \`${record}\` with this template, copying your final report into it (the numbered step list; Errors, Help and Frustrations from your report; SEQ line exactly as in your report). The Result line copies the first lines that \`check\` printed. Leave "Researcher notes" as "(none yet)".`,
    '',
    '```',
    RECORD_TEMPLATE.replace('<task>', task).replace('<title>', taskInfo?.title ?? '<title>').replace('<level>', level),
    '```',
    '',
    '## 5. Stop',
    '',
    '```',
    `node ${session} stop --out ${folder} --record ${record}`,
    `mkdir -p docs/ux/panel/${round} && cp -r ${folder} docs/ux/panel/${round}/${task}-${level}-session`,
    '```',
    '',
    '`stop` reads your `- SEQ:` line into check.json, adds "Steps: N of M" to the Result line when it is missing, and shuts the app down. If it refuses because the record contradicts itself, correct the record (not the rating) and run it again.',
    '',
    `Your last message to the orchestrator: the path \`${record}\` and the Result line of the record. Nothing else.`
  ].join('\n')
}
