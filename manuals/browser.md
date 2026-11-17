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
  - The Chat Pane
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

The tab strip is under the toolbar. Each tab shows the title of its page and has a small x to close it. **New tab** is the plus at the end of the strip. Point to it to read its name. Use the Left and Right arrow keys to move between tabs.

### The Page

The page area shows the web page of the active tab. A new tab shows **Type an address above to open a page.** When a page cannot be opened, Browser shows **This page can't be displayed**, the address, the cause, and what to try. The page names the real cause and one next step, for example a blocked port, an address that nothing answers, or a name that was not found. Type another address in **Try another address:** and click **Go**, click **Refresh** to try again, or click **Help** to read the troubleshooting section of this manual.

### The Status Bar

The status bar shows what the page does: **Connecting...** while a page loads, **Done** when it is open, and **Could not load the page** when it failed. It also shows the zone (Internet or Computer), whether the assistant can read the page, and the zoom of the page. The part **Agent:** says **can read this page**, **asks first**, **cannot read pages**, or **reading** while the assistant reads the page. After the assistant read the page it says **The agent read this page**. Point to it to read where to change it. The button **Ask about this page** in the toolbar, at the right of the address, opens the chat pane with the whole text that will be sent in the message box: one line that names the page and its address, and the question **What does this page say?** The box grows so that you see all of it. You can change the text before you send it. Press Ctrl+Plus and Ctrl+Minus to zoom, and Ctrl+0 to go back to 100%.

### The Chat Pane

Each Browser window has a chat pane at its right edge. Its header says **Chat about this page**. The pane starts closed, as a thin strip. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees what the window shows. See **[The Chat Pane](embedded-chat.md)**.

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
| Tab | One open page. The number is the tab number. A long title is cut at the end; point to the title in the tab to read all of it. | `browser-tab-*` |
| Close tab | Closes that tab. It sits at the right end of the tab. | `browser-tab-close-*` |
| New tab | Opens a blank tab. Point to it to read **New tab** in a tooltip. | `browser-tab-new` |
| Page of a tab | The web page of one tab. | `browser-page-*` |
| Agent bar | A yellow bar above the page. It shows "Agent is using this page" with what the agent does, until the answer of the chat is done (at the latest 20 seconds after the last step). When the agent finished reading the page, it says "The agent read this page." and goes after 5 seconds, unless the agent goes on. When the agent stops, it says "The agent stopped using this page." for 5 seconds. After you take over, it says "You have the page. The agent waits. Click Give back to let it continue." and stays until you give the page back. The bar sits above the page and covers none of it. | `browser-agent-bar` |
| Agent bar text | What the agent does ("Reading the page", "Clicking the button 'Send'", "Waiting for the page to change"), or that you have control. The sentence wraps to a second line, so it is never cut. Point to it to see what the agent waits for. | `browser-agent-bar-text` |
| Take over | Pauses the agent on this page so that you can use it. Its tooltip says **Stop the agent here and use the page yourself.** It is at the right of the bar while the agent works. Every tool asks before it is used again. | `browser-agent-takeover` |
| Give back | Shows in the bar instead of **Take over** after you took over. It lets the agent use the page again. **Resume** on the top bar does the same. | `browser-agent-giveback` |
| Agent status | Says whether the assistant can read the page: can read this page, asks first, cannot read pages, reading, or that the agent read this page. | `browser-assistant-status` |
| Ask about this page | A button in the toolbar, at the right of the address. It opens the chat pane with the whole text, the page and the question "What does this page say?", ready in the box. It does not send it. It is dimmed on a blank tab. | `browser-ask-page` |
| Start page | The text of a new tab: type an address above. | `browser-start-page` |
| Error page | Shows when a page could not be opened. | `browser-error-page` |
| Error title | "This page can't be displayed". | `browser-error-title` |
| Error cause | The address that failed and why. | `browser-error-cause` |
| Error refresh | Tries to open the address again. | `browser-error-refresh` |
| Error hint | The next step for this error. | `browser-error-hint` |
| Error address | The address to try instead. | `browser-error-address` |
| Error go | Opens the address in the error address box. | `browser-error-go` |
| Error details | Shows or hides the technical name of the error. It is hidden at first. | `browser-error-details` |
| Error technical name | The technical name of the error, after you click Details. | `browser-error-technical` |
| Error help | Opens this manual at the section Troubleshooting. | `browser-error-help` |
| Highlight ring | An orange frame around the item the agent used. | `browser-agent-ring` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `browser-menu-help` |
| Menu: about | Opens the About Browser box. | `browser-menu-about` |
| Dialog: about | The About Browser box. | `browser-about` |
| Dialog: about ok | Closes the About box. | `browser-about-ok` |
| Menu: chat pane | Shows or hides the chat pane. Ctrl+Shift+C. | `browser-menu-chat-pane` |
| Chat pane edge | The tab at the right edge with a chat icon and the word Chat. Click it to open the chat pane. | `chat-pane-toggle` |
| Menu: new tab | File menu: opens a new tab. | `browser-menu-new-tab` |
| Menu: close tab | File menu: closes the tab. | `browser-menu-close-tab` |
| Menu: close | Closes the window. Alt+F4. | `browser-menu-close` |
| Menu: copy address | Edit menu: copies the address of the page. | `browser-menu-copy-address` |
| Menu: refresh | View menu: loads the page again. F5. | `browser-menu-refresh` |
| Menu: stop | View menu: stops loading. | `browser-menu-stop` |
| Menu: zoom in | View menu: makes the page larger. Ctrl+Plus. | `browser-menu-zoom-in` |
| Menu: zoom out | View menu: makes the page smaller. Ctrl+Minus. | `browser-menu-zoom-out` |
| Menu: actual size | View menu: sets the page to 100%. Ctrl+0. | `browser-menu-zoom-reset` |
| Menu: back | View menu: goes back. | `browser-menu-back` |
| Menu: forward | View menu: goes forward. | `browser-menu-forward` |
| Context menu: back | Goes back. | `browser-ctx-back` |
| Context menu: forward | Goes forward. | `browser-ctx-forward` |
| Context menu: reload | Loads the page again. | `browser-ctx-reload` |
| Context menu: copy link | Copies the address of the page. | `browser-ctx-copy-link` |
| Context menu: ask | Opens the chat pane with a draft about the page: its address and title. | `browser-ctx-ask` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| Enter | Opens the address. | `browser-address` |
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To open a page, follow the steps below:

1. Click the address box.
2. Type a web address, for example `example.com`. AgentXP adds `https://`.
3. Press Enter.

To search, type words instead of an address. AgentXP searches with DuckDuckGo.

To stop a page that loads, click **Stop**.

To open a second page, click **New tab**. Click a tab to show it. Click the x on a tab to close it. The last tab never closes. It becomes a blank tab.

### Use a Web App With the Agent

The agent can use a web app such as a team chat, mail, or documents. Follow the steps below:

1. Open the web app in Browser.
2. Sign in yourself. AgentXP keeps you signed in. The agent never types a password.
3. Ask the agent to read or send messages.

While the agent works, the Browser window comes to the front and a yellow bar shows "Agent is using this page". When the agent finished reading, the bar says "The agent read this page." and goes after 5 seconds. An orange frame shows the item the agent used. The bar sits above the page, so it covers no text of the page. It stays while the agent works, also when it only reads. When the chat has given its answer, it says "The agent stopped using this page." for 5 seconds and goes. It says what the agent does, for example "Typing into the message box". To use the page yourself, click **Take over**. The bar then says "You have the page. The agent waits. Click Give back to let it continue." and stays. The agent stops and asks before it uses the page again. Click **Give back** in the bar, or **Resume** on the top bar, to let the agent go on. You can also click **Pause all agents** on the top bar.

The chip **Browser** on the top bar and the part **Agent:** in the status bar of Browser show that the agent can see the page. If the chip is missing, the agent has no Browser to use. Open Browser to give it one. To change what the agent may do, open **Control Center**, click **Permissions**, and set **Browser**.

### What the Agent Can Do

The agent reads the whole page, also below the fold, in frames, and in shadow roots. It clicks, types (also in rich text boxes), presses keys such as Enter and Control+K, scrolls to load older items, waits for text, picks drop-down options, and manages tabs. AgentXP never gives the value of a password box to the agent.

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
- **The page says "This page can't be displayed".** Read the line under **Try this**. It depends on the cause. A blocked port needs another address. An address that nothing answers needs the program that serves it to be started. A name that was not found needs a check of the spelling. Without a network, check that your computer is online. Then click **Refresh**, or type another address and click **Go**.
- **The page stays blank.** Click **Refresh**. Make sure that your computer is online.
- **The agent cannot browse.** Open Browser. The permission for Browser must be **Allow** or **Ask** in **[Control Center](control-centre.md)**.

## 7 - Need Help?

Read **[Control Center](control-centre.md)** to change what the agent can do in Browser.
