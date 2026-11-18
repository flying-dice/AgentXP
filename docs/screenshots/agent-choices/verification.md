# ACP agent choices and default selection verification

Checked on Windows, 18 November 2026.

## Intended result

- Agent settings offer model and mode choices from the configured ACP command.
- Generic agent settings do not offer Claude aliases to every provider.
- Saved ACP ids remain editable when discovery fails or the agent no longer advertises them.
- Setting a default in Control Center also changes the current desktop's agent for new conversations.
- Existing conversations keep their agent and history; New conversation uses the new desktop default.
- Enter and Escape operate the open combo box before the dialog handles them.

## Manual verification

Used Windows Computer Use (`@oai/sky`) to click and type in the real dev Electron app. Sent a minimal request for a fixed reply with no tools, first in Control Center's sidebar, then moved the conversation into the main Chat app and sent another request. No authentication dialogs were automated.

| Harness | App sidebar | Main Chat | Notes |
| --- | --- | --- | --- |
| OpenCode | Passed: HARNESS_OK | Passed: HARNESS_OK | Initially failed because its configured local `qwen3.8-27b-coder-64k` model was absent. Selected an ACP-advertised free model in Chat successfully, then used Load choices in Edit Agent (14 models) and saved `opencode/deepseek-v4.1-flash-free`; the next sidebar conversation used it successfully. |
| Codex | Passed: HARNESS_OK | Passed: CHAT_OK | Reproduced the old adapter's Luna metadata warning before the package migration. The maintained adapter replied successfully. Changed the main Chat model from 6 Luna to the advertised 6.1 Sol and received MODEL_OK. |
| pi | Passed: HARNESS_OK | Passed: CHAT_OK | Used its advertised local Qwen3.8 27B model. |
| Scripted Agent | Passed: greeting | Passed: greeting | Used `hi` / `hello`, which exercise its deterministic greeting without file or terminal tools. |
| Claude Code | Blocked: expired login | Blocked: expired login | Both requests reached Claude, which reported that its login had expired and cannot be renewed. It requires the user to run `claude auth login`. Model selector showed Sonnet 5.5. |

Restored OpenCode as the global and current desktop default. Its saved Start model is the successfully tested free DeepSeek model above. Existing test conversations remain in Recent chats.

## Automated UI verification and screenshots

Built and launched real Electron with Playwright fixtures. Checked the settings dialog in normal and maximized Control Center, at 900 x 600, using keyboard Enter/Escape, and on discovery failure. All captured PNGs were opened and inspected. The small desktop's pinned top bar overlaps the top of windows; the small-window capture unpins it so the controls can be inspected.

- [Before discovery](agent-choices-before-load.png)
- [Discovered models, normal window](agent-choices-normal.png)
- [Discovered models, maximized window](agent-choices-maximized.png)
- [Small desktop / near edge](agent-choices-small.png)
- [Discovery failure with editable saved id](agent-choices-error.png)

`e2e/agent-choices.e2e.ts`, `e2e/control-centre.e2e.ts`, and `e2e/popup-placement.e2e.ts`: 22 passed. The changed small-window capture was rerun separately: 3 passed. Focused desktop/default-selection, migration, ACP parser and form tests: 77 passed. Type checking, help coverage, app pillars and e2e selector checks passed.

The full unit suite did not pass on this Windows checkout. A review run of both the changed tree and unchanged HEAD (`07014f0`) reported 138 failures, including Windows path, symlink, process and git fixtures. A differing FileSearch timeout was rerun separately on both trees; both runs then had the same single symlink failure. These baseline failures remain unresolved. Type checking, help coverage, app pillars, selector checks and the test-id gate pass; the two missing AppStory button ids were added during review.

Review also fixed external preset registration overwriting a same-named user agent, preserved saved start mode/model during bundled agent path refreshes, and prevented a rejected desktop default change from changing the global default. Regression tests cover these cases. `.idea/` is ignored.

Final review validation: 82 focused unit tests and 22 Electron UI checks passed, together with all static gates. The baseline comparison and targeted FileSearch rerun found no additional reproducible failures introduced by this change.

Agent choice discovery is operator-requested background work: it opens no app windows, sends no model prompt, supplies no MCP servers or client file/terminal capabilities, cancels permission requests, and disposes its temporary process/session directory. Agent-driven model selection and successful Claude replies were not manually verified; Claude needs renewed credentials.
