# Using Browser

This manual describes Browser. Browser shows web pages. You and the agent can use it.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Toolbar
  - The Tabs
  - The Page
  - The Status Bar
- 4 - Controls Reference
- 5 - Common Tasks
  - Use a Web App With the Agent
  - What the Agent Can Do
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Browser to read a web page together with the agent. The agent can open an address, read the page, and click in it when the Browser app is open.

## 2 - Open It

Click **Start -> Browser**, or double-click **Browser** on the desktop.

## 3 - The Window

### The Toolbar

The toolbar is at the top. It has the round buttons **Back** and **Forward**, and the address box. A lock icon shows a secure address. The buttons **Go to**, and **Refresh** or **Stop** are inside the address box.

### The Tabs

The tab strip is under the toolbar. Each tab shows the title of its page. **New tab** is at the end of the strip.

### The Page

The page area shows the web page of the active tab.

### The Status Bar

The status bar shows **Done** or **Opening page** with the address. It also shows the zone (Internet or Computer) and the zoom.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Browser window | The root of the window. | `browser-app` |
| Back | Goes to the last page. | `browser-back` |
| Forward | Goes to the next page. | `browser-forward` |
| Address | Holds the web address or a search. | `browser-address` |
| Go to | Opens the address. | `browser-go` |
| Refresh | Loads the page again. It shows when no page loads. | `browser-refresh` |
| Stop | Stops loading. It shows while a page loads. | `browser-stop` |
| Tab strip | Holds the tabs. | `browser-tabs` |
| Tab | One open page. The number is the tab number. | `browser-tab-*` |
| Close tab | Closes that tab. | `browser-tab-close-*` |
| New tab | Opens a blank tab. | `browser-tab-new` |
| Page of a tab | The web page of one tab. | `browser-page-*` |
| Agent bar | Shows "Agent is using this page" while the agent works. | `browser-agent-bar` |
| Take control | Puts you in control of the desktop. | `browser-agent-takeover` |
| Highlight ring | An orange frame around the item the agent used. | `browser-agent-ring` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `browser-menu-help` |
| Menu: about | Opens the About Browser box. | `browser-menu-about` |
| Dialog: about | The About Browser box. | `browser-about` |
| Dialog: about ok | Closes the About box. | `browser-about-ok` |
| Menu: new tab | File menu: opens a new tab. | `browser-menu-new-tab` |
| Menu: close tab | File menu: closes the tab. | `browser-menu-close-tab` |
| Menu: close | Closes the window. Alt+F4. | `browser-menu-close` |
| Menu: copy address | Edit menu: copies the address of the page. | `browser-menu-copy-address` |
| Menu: refresh | View menu: loads the page again. F5. | `browser-menu-refresh` |
| Menu: stop | View menu: stops loading. | `browser-menu-stop` |
| Menu: back | View menu: goes back. | `browser-menu-back` |
| Menu: forward | View menu: goes forward. | `browser-menu-forward` |
| Context menu: back | Goes back. | `browser-ctx-back` |
| Context menu: forward | Goes forward. | `browser-ctx-forward` |
| Context menu: reload | Loads the page again. | `browser-ctx-reload` |
| Context menu: copy link | Copies the address of the page. | `browser-ctx-copy-link` |
| Context menu: ask | Starts a chat about the page: its address and title. | `browser-ctx-ask` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| Enter | Opens the address. | `browser-address` |
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To open a page, follow the steps below:

1. Click the address box.
2. Type a web address, for example `example.com`. Agent7 adds `https://`.
3. Press Enter.

To search, type words instead of an address. Agent7 searches with DuckDuckGo.

To stop a page that loads, click **Stop**.

To open a second page, click **New tab**. Click a tab to show it. Click the x on a tab to close it. The last tab never closes. It becomes a blank tab.

### Use a Web App With the Agent

The agent can use a web app such as a team chat, mail, or documents. Follow the steps below:

1. Open the web app in Browser.
2. Sign in yourself. Agent7 keeps the session. The agent never types a password.
3. Ask the agent to read or send messages.

While the agent works, a yellow bar shows "Agent is using this page". An orange frame shows the item the agent used. To stop the agent, click **Take control**, or pause Agent7 on the top bar. When you are in control, the agent must ask you before each action.

### What the Agent Can Do

The agent reads the whole page, also below the fold, in frames, and in shadow roots. It clicks, types (also in rich text boxes), presses keys such as Enter and Control+K, scrolls to load older items, waits for text, picks drop-down options, and manages tabs. Agent7 never gives the value of a password box to the agent.

| Tool | What it does |
|---|---|
| `browser_navigate` | Opens an http or https address. |
| `browser_read` | Reads the page in pages, as an outline (`tree`) or as text. |
| `browser_find` | Finds items by text or by role and name. |
| `browser_click` | Clicks an item by its `ref`. |
| `browser_type` | Types into an item, with an option to press Enter. |
| `browser_press` | Presses keys, for example `Shift+Enter`. |
| `browser_scroll` | Scrolls the page or a list. |
| `browser_wait` | Waits for text or for an item. |
| `browser_select` | Chooses an option of a drop-down list. |
| `browser_tabs` | Lists, opens, switches, and closes tabs. |
| `browser_back`, `browser_forward`, `browser_reload` | Move in the history, or load the page again. |
| `browser_screenshot` | Takes a picture of the page. |

## 6 - Troubleshooting

- **Back is dimmed.** The window has no earlier page.
- **The page stays blank.** Click **Refresh**. Make sure that your computer is online.
- **The agent cannot browse.** Open Browser. The permission for Browser must be **Allow** or **Ask** in **[Control Centre](control-centre.md)**.

## 7 - Need Help?

Read **[Control Centre](control-centre.md)** to change what the agent can do in Browser.
