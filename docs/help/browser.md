# Using Browser

This manual describes Browser. Browser shows web pages. You and the agent can use it.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Toolbar
  - The Page
  - The Status Bar
- 4 - Controls Reference
- 5 - Common Tasks
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

### The Page

The page area shows the web page. A line above it shows the title of the page.

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
| Refresh | Loads the page again. | none |
| Stop | Stops loading. | none |

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

## 6 - Troubleshooting

- **Back is dimmed.** The window has no earlier page.
- **The page stays blank.** Click **Refresh**. Make sure that your computer is online.
- **The agent cannot browse.** Open Browser. The permission for Browser must be **Allow** or **Ask** in **[Control Centre](control-centre.md)**.

## 7 - Need Help?

Read **[Control Centre](control-centre.md)** to change what the agent can do in Browser.
