# Using Agent Diagrams

This manual describes Agent Diagrams. Agent Diagrams is a drawing program for diagrams: flowcharts, UML diagrams, entity relationship diagrams, organization charts, network maps, and more. You can draw by hand, and the agent can draw in the same drawing.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Menu Bar
  - The Standard Toolbar
  - The Formatting Toolbar
  - The Shapes Window
  - The Drawing Page
  - The Page Tabs
  - The Format Pane
  - The Status Bar
  - The Chat Pane
- 4 - Shapes and Connectors
  - Stencils
  - Connection Points and Glue
  - Connector Styles and Line Ends
  - Shape Data
- 5 - What the Agent Can Do
- 6 - Controls Reference
- 7 - Common Tasks
- 8 - Troubleshooting
- 9 - Need Help?

---

## 1 - What It Is For

Use Agent Diagrams to make a picture of a process, a design, or a structure. Ask the agent to draw a diagram for you, and then change it by hand. Or draw it yourself, and ask the agent to tidy it, explain it, or add to it.

A drawing has one or more pages. Each page has shapes and connectors. A connector is glued to its shapes: when you move a shape, its connectors follow and find a new path around the other shapes.

You save a drawing as an `.xpdiagram` file. You can export a page as an SVG picture or as a PNG picture.

## 2 - Open It

Click **Start -> Accessories -> Agent Diagrams**.

To open a saved drawing, double-click its `.xpdiagram` file in Explorer.

The agent can open Agent Diagrams by itself when it needs to draw.

## 3 - The Window

### The Menu Bar

The menu bar has the menus **File**, **Edit**, **View**, **Insert**, **Format**, **Shape**, and **Help**.

- **File** – New, Open, Save, Save As, Export Page as SVG, Export Page as PNG, Page Setup, and Exit.
- **Edit** – Undo and Redo (with the name of the change), Cut, Copy, Paste, Duplicate, Delete, Select All, and Edit Text.
- **View** – Zoom, Rulers, Grid, Snap to Grid, Shapes Window, Format Pane, and Chat pane.
- **Insert** – New Page, Duplicate Page, Text Box, and Connector.
- **Format** – Bold, Italic, Underline, Shadow, Clear Formatting, and Format Pane.
- **Shape** – Rotate, Align and Distribute, Order, Group, Ungroup, Lay Out Shapes, and Connector Style.

### The Standard Toolbar

The Standard toolbar has, from left to right:

- **New**, **Open**, **Save**, and **Export page as PNG**.
- **Cut**, **Copy**, **Paste**, **Undo**, and **Redo**.
- The tools: **Pointer Tool**, **Connector Tool**, and **Text Tool**.
- The connector styles for new connectors: **Right-angle**, **Straight**, and **Curved**.
- **Zoom Out**, the zoom box, **Zoom In**, and **Whole Page**.
- **Shapes Window** and **Format Pane**, which show or hide the two panes.

### The Formatting Toolbar

The Formatting toolbar changes the selected shapes and connectors.

- The font box and the font size box.
- **Bold**, **Italic**, and **Underline**.
- **Align Text Left**, **Center Text**, and **Align Text Right**.
- **Font Color**, **Fill Color**, and **Line Color**. Click the button to use the color on its bar. Click the small arrow to select a different color.
- **Line Weight and Pattern** and **Line Ends**. Each opens a short menu.
- **Shadow**.
- **Align Left**, **Align Center**, **Align Top**, **Align Middle**, **Distribute Horizontally**, and **Distribute Vertically**.
- **Bring to Front**, **Send to Back**, **Group**, **Ungroup**, **Rotate Left**, and **Rotate Right**.
- **Lay Out Shapes**, which arranges the shapes of the page from top to bottom.

### The Shapes Window

The Shapes window is at the left side. It has a **Search for Shapes** box and one panel for each stencil. Click the title of a panel to open or close it.

- Drag a shape onto the drawing page to add it there.
- Double-click a shape, or select it and press Enter, to add it in the middle of the page that you see.
- Type words in **Search for Shapes**, for example `database` or `decision`. The matching shapes show in **Search Results**.

### The Drawing Page

The drawing page is the white sheet in the middle. It has a grid and, at the top and the left, rulers in page units. A red mark on each ruler shows the position of the pointer.

- Click a shape or a connector to select it. Shift+click or Ctrl+click adds to the selection.
- Drag on an empty part of the page to select every shape inside the box.
- Drag a selected shape to move it. Blue-violet guide lines show when its edges or its center line up with another shape. Hold Shift to move in a straight line. Hold Alt to move freely, without the grid and the guides.
- Drag a green handle to change the size. Hold Shift to keep the proportions.
- Drag the round green handle above the shape to rotate it in steps of 15 degrees. Hold Alt to rotate freely.
- Point at a shape to see its connection points (small blue crosses). Drag from a connection point to another shape to connect the two shapes.
- Double-click a shape or a connector, or press F2, to type its text. When one shape is selected, you can also start to type. Press Ctrl+Enter or click outside to finish. Press Esc to cancel.
- Hold Ctrl and turn the mouse wheel to zoom at the pointer. Drag with the middle mouse button, or hold Space and drag, to move the view.

When the drawing grows past the edge of the sheet, the sheet grows by one page size. Dashed lines show where the paper pages meet. To stop this, clear **Grow the page to fit the drawing** in the Format pane.

### The Page Tabs

The page tabs are under the drawing page. Click a tab to show that page. Click **+** to insert a page. Double-click a tab to rename the page. Right-click a tab for **Insert Page**, **Duplicate Page**, **Rename Page**, **Delete Page**, **Move Left**, and **Move Right**. The arrow buttons at the left go to the first, previous, next, and last page.

### The Format Pane

The Format pane is at the right side. It shows the properties of what you selected. In a narrow window, the Format pane (and, in a very narrow window, the Shapes window) closes so that the drawing page keeps its room. Click **View -> Format Pane** to open it again.

- **A shape** – its text; **Size & Position** (X, Y, width, height, angle, and lock); **Fill & Line** (fill color, line color, weight, pattern, opacity, gradient, and shadow); **Text** (font, size, color, bold, italic, underline, and alignment); and **Shape Data** for shapes that have data, such as a UML class or an ERD entity.
- **A connector** – its kind, its route (right angle, straight, or curved), its label, its start and end labels, its line, and its line ends.
- **Nothing** – the page (name, paper size, width, height, growth, background color, and grid) and the drawing (title).

A change in a text box applies when you press Tab or click somewhere else.

### The Status Bar

The status bar shows the size and angle of the selected shape (or the name of the file), the page number, the position of the pointer, and the zoom. While the agent changes the drawing, a note says **The agent is editing the drawing**, and the shapes that it changed flash orange for a moment.

### The Chat Pane

Each Agent Diagrams window has a chat pane at its right edge. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees the name of the drawing, the page, and the shapes that you selected. See **[The Chat Pane](embedded-chat.md)**.

## 4 - Shapes and Connectors

### Stencils

A stencil is a group of shapes. Agent Diagrams has these stencils:

- **Basic Shapes** – rectangles, ellipses, polygons, stars, block arrows, a cylinder, a cloud, a callout, a note, a text box, a frame, and a line.
- **Flowchart** – process, decision, start/end, data, document, database, delay, display, manual input, preparation, off-page and on-page references, merge, extract, sort, and more.
- **UML Class** – class, abstract class, interface, enumeration, package, component, object, node, and note.
- **UML Sequence** – lifeline, actor lifeline, activation bar, combined fragment (alt, loop, opt), and destroy mark.
- **UML Use Case** – actor, use case, and system boundary.
- **UML Activity** – initial and final nodes, action, decision, fork/join bar, object node, signals, time event, and partition.
- **UML State** – state, composite state, choice, history, junction, and initial and final states.
- **ERD** – entity with attributes and keys, view, and the Chen notation shapes (entity, weak entity, relationship, attribute, key attribute, multivalued and derived attribute).
- **Containers** – container, horizontal and vertical swimlanes, and phase.
- **Org Chart** – executive, manager, position, assistant, consultant, and vacancy.
- **Network** – server, workstation, laptop, database, Internet, firewall, router, switch, printer, phone, and user.

### Connection Points and Glue

Each shape has connection points. When you let go of a connector on a connection point, the connector is glued to that point. When you let go of it on the body of a shape, the connector is glued to the shape, and it uses the side that gives the shortest path. A glued end is red when the connector is selected. A free end is green.

Some shapes have more connection points:

- An ERD entity has a connection point at each attribute row, on the left and on the right side.
- A UML lifeline and an activation bar accept a connection at any height, for the messages of a sequence diagram.

Drag the end of a selected connector to glue it somewhere else.

### Connector Styles and Line Ends

A right-angle connector finds a path around the other shapes. A straight connector goes in a line. A curved connector bends smoothly.

The **Kind** box in the Format pane gives a connector the line and the ends of a notation: flow, arrow, dashed, UML association, inheritance, realization, dependency, aggregation, composition, message, return, include, extend, transition, and ERD one-to-one, one-to-many, zero-or-one, many-to-many, and Chen lines.

### Shape Data

Some shapes draw their content from data. Select the shape and change the data in **Shape Data** in the Format pane. Write one item on each line.

- **UML class** – stereotype, abstract, attributes (for example `- id: UUID`), and operations (for example `+ submit(): void`). Write `_name_` to underline a static member. The class grows to fit its members.
- **Enumeration** – literals.
- **ERD entity** – attributes, for example `PK id int`, `FK customer_id int`, or `PK,FK order_id int`. Keys show first, with a line under them.
- **Org chart shapes** – title and details.
- **State** – activities, for example `entry / start timer`.

## 5 - What the Agent Can Do

When Agent Diagrams is open, the agent can use these tools. **Control Center -> Permissions -> Agent Diagrams** sets if the agent may use them.

| Tool | What the agent does with it |
|---|---|
| `diagram_new` | Starts a new, empty drawing. The old drawing stays in Undo. |
| `diagram_stencils` | Lists the stencils, the connector kinds, and the line ends. |
| `diagram_add` | Adds shapes and connectors in one step, and can lay them out automatically. |
| `diagram_update` | Changes shapes and connectors: position, size, text, style, data, ends, and labels. |
| `diagram_delete` | Deletes shapes and connectors. |
| `diagram_layout` | Arranges the shapes of a page: layered (top to bottom or left to right), grid, or circle. |
| `diagram_arrange` | Aligns, distributes, orders, groups, or ungroups shapes. |
| `diagram_pages` | Lists, shows, adds, renames, deletes, or duplicates pages. |
| `diagram_select` | Selects shapes to show them to you. |
| `diagram_read` | Reads a page as an outline, or the drawing as JSON. |
| `diagram_export` | Looks at a page as a picture, or writes an SVG or JSON file. |
| `diagram_save` | Saves the drawing as an `.xpdiagram` file. |
| `diagram_open` | Opens an `.xpdiagram` file. |

Each change by the agent is one step in **Edit -> Undo**. Press Ctrl+Z to undo the last change of the agent.

## 6 - Controls Reference

### The Window

| Name | What it does | data-testid |
|---|---|---|
| Agent Diagrams window | The root of the window. | `diagrams-app` |
| Agent is editing | Shows that the agent changes the drawing. | `diagrams-agent-editing` |
| Drawing area | The rulers and the drawing page. | `diagrams-canvas` |
| Ruler | The horizontal or the vertical ruler. The name ends with `horizontal` or `vertical`. | `diagrams-ruler-*` |
| Drawing page | The scrolling area around the sheet. Ctrl+wheel zooms. | `diagrams-page` |
| Drawing | The picture of the page. It tells the number of shapes and connectors. | `diagrams-svg` |
| Sheet | The paper of the page. | `diagrams-paper` |
| Shape | One shape on the page. | `diagrams-shape` |
| Connector | One connector on the page. | `diagrams-connector` |
| Selection | The outline of the selected shape or shapes. | `diagrams-selection` |
| Size handle | Changes the size of the shape. The name ends with `nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, or `w`. | `diagrams-handle-*` |
| Rotation handle | Rotates the shape. | `diagrams-handle-rotate` |
| Connector start | Moves or glues the start of the selected connector. | `diagrams-handle-from` |
| Connector end | Moves or glues the end of the selected connector. | `diagrams-handle-to` |
| Connection point | Drag from it to connect the shape. | `diagrams-port` |
| Glue target | Shows the shape that a connector will glue to. | `diagrams-glue-target` |
| Selection box | The box that you drag to select shapes. | `diagrams-marquee` |
| Text editor | The box where you type the text of a shape or a connector. | `diagrams-text-editor` |
| Page tabs | The tabs of the pages. | `diagrams-page-tabs` |
| Page tab | Shows a page. Double-click to rename. | `diagrams-page-tab` |
| Insert page | Adds a page after the current page. | `diagrams-page-add` |
| Page name | The box where you rename a page. | `diagrams-page-rename` |
| Status | The left part of the status bar. | `diagrams-status` |
| Page number | The page number in the status bar. | `diagrams-status-page` |
| Zoom level | The zoom in the status bar. | `diagrams-status-zoom` |
| Format: X | Format pane: the left edge of the shape. | `diagrams-format-x` |
| Format: Y | Format pane: the top edge of the shape. | `diagrams-format-y` |
| Format: width | Format pane: the width of the shape. | `diagrams-format-width` |
| Format: height | Format pane: the height of the shape. | `diagrams-format-height` |
| Format: angle | Format pane: the rotation of the shape in degrees. | `diagrams-format-angle` |
| Format: opacity | Format pane: the opacity of the shape in percent. | `diagrams-format-opacity` |
| Format: bold | Format pane: bold text. | `diagrams-format-bold` |
| Format: italic | Format pane: italic text. | `diagrams-format-italic` |
| Format: underline | Format pane: underlined text. | `diagrams-format-underline` |
| Format: align | Format pane: horizontal text alignment. | `diagrams-format-align` |
| Format: vertical align | Format pane: vertical text alignment. | `diagrams-format-valign` |
| Format: connector font color | Format pane: the text colour of the connector. | `diagrams-format-connector-font-color` |
| Format: line weight | Format pane: the width of the line. | `diagrams-format-line-weight` |
| Format: line pattern | Format pane: solid, dashed or dotted line. | `diagrams-format-line-pattern` |
| Format: text size | Format pane: the size of the connector text. | `diagrams-format-text-size` |
| Format: rounded | Format pane: rounded corners on the connector. | `diagrams-format-rounded` |
| Format: page width | Format pane: the width of the page. | `diagrams-format-page-width` |
| Format: page height | Format pane: the height of the page. | `diagrams-format-page-height` |
| Format: grid size | Format pane: the distance between grid lines. | `diagrams-format-grid-size` |
| Format: show grid | Format pane: shows the grid on this page. | `diagrams-format-show-grid` |
| First page | Page tabs: goes to the first page. | `diagrams-page-first` |
| Previous page | Page tabs: goes to the previous page. | `diagrams-page-previous` |
| Next page | Page tabs: goes to the next page. | `diagrams-page-next` |
| Last page | Page tabs: goes to the last page. | `diagrams-page-last` |

### The Toolbars

| Name | What it does | data-testid |
|---|---|---|
| New | Starts a new drawing. Ctrl+N. | `diagrams-tb-new` |
| Open | Opens a drawing. Ctrl+O. | `diagrams-tb-open` |
| Save | Saves the drawing. Ctrl+S. | `diagrams-tb-save` |
| Export | Saves the page as a PNG picture in your Downloads folder. | `diagrams-tb-export` |
| Cut | Cuts the selection. Ctrl+X. | `diagrams-tb-cut` |
| Copy | Copies the selection. Ctrl+C. | `diagrams-tb-copy` |
| Paste | Pastes. Ctrl+V. | `diagrams-tb-paste` |
| Undo | Undoes the last change. Ctrl+Z. | `diagrams-tb-undo` |
| Redo | Does the change again. Ctrl+Y. | `diagrams-tb-redo` |
| Pointer Tool | Selects, moves, and changes shapes. Ctrl+1. | `diagrams-tool-pointer` |
| Connector Tool | Drag from shape to shape to connect them. Ctrl+3. | `diagrams-tool-connector` |
| Text Tool | Click the page to add text. Ctrl+2. | `diagrams-tool-text` |
| Right-angle connectors | New connectors and the selected connectors go at right angles. | `diagrams-route-orthogonal` |
| Straight connectors | New connectors and the selected connectors go straight. | `diagrams-route-straight` |
| Curved connectors | New connectors and the selected connectors curve. | `diagrams-route-curved` |
| Zoom Out | Zooms out one step. Ctrl+-. | `diagrams-tb-zoom-out` |
| Zoom box | Selects the zoom. | `diagrams-zoom` |
| Zoom In | Zooms in one step. Ctrl+=. | `diagrams-tb-zoom-in` |
| Whole Page | Zooms to show the whole sheet. Ctrl+Shift+W. | `diagrams-tb-whole-page` |
| Shapes Window | Shows or hides the Shapes window. | `diagrams-tb-shapes` |
| Format Pane | Shows or hides the Format pane. | `diagrams-tb-format` |
| Font | The font of the selection. | `diagrams-font` |
| Font size | The font size of the selection. | `diagrams-font-size` |
| Bold | Bold text. Ctrl+B. | `diagrams-tb-bold` |
| Italic | Italic text. Ctrl+I. | `diagrams-tb-italic` |
| Underline | Underlined text. Ctrl+U. | `diagrams-tb-underline` |
| Align Text Left | Puts the text at the left. | `diagrams-tb-text-left` |
| Center Text | Puts the text in the center. | `diagrams-tb-text-center` |
| Align Text Right | Puts the text at the right. | `diagrams-tb-text-right` |
| Font Color | Gives the text the color on the bar. The arrow selects a color. | `diagrams-tb-font-color` |
| Fill Color | Gives the shapes the color on the bar. The arrow selects a color or No Fill. | `diagrams-tb-fill` |
| Line Color | Gives the lines the color on the bar. The arrow selects a color or No Line. | `diagrams-tb-line-color` |
| Line Weight and Pattern | Opens a menu of line weights and patterns. | `diagrams-tb-line` |
| Line weight | One line weight in that menu. The name ends with the weight, for example `2`. | `diagrams-weight-*` |
| Line pattern | One pattern in that menu. The name ends with `solid`, `dashed`, `dotted`, or `dash-dot`. | `diagrams-dash-*` |
| Line Ends | Opens a menu of line ends for the selected connectors. | `diagrams-tb-ends` |
| Arrow at end | One arrow at the end. | `diagrams-ends-arrow` |
| Arrows at both ends | Arrows at the start and at the end. | `diagrams-ends-both` |
| No arrows | No line ends. | `diagrams-ends-none` |
| Hollow triangle | The end of a UML inheritance line. | `diagrams-ends-triangle` |
| Filled diamond | The start of a UML composition line. | `diagrams-ends-diamond` |
| Crow's foot | The ends of an ERD one-to-many line. | `diagrams-ends-crow` |
| Shadow | Gives the shapes a shadow, or removes it. | `diagrams-tb-shadow` |
| Align Left | Lines up the left edges of the shapes. | `diagrams-tb-align-left` |
| Align Center | Lines up the centers of the shapes, from top to bottom. | `diagrams-tb-align-center` |
| Align Top | Lines up the top edges of the shapes. | `diagrams-tb-align-top` |
| Align Middle | Lines up the middles of the shapes, from left to right. | `diagrams-tb-align-middle` |
| Distribute Horizontally | Puts equal space between three or more shapes, from left to right. | `diagrams-tb-distribute-h` |
| Distribute Vertically | Puts equal space between three or more shapes, from top to bottom. | `diagrams-tb-distribute-v` |
| Bring to Front | Puts the shapes in front. Ctrl+Shift+F. | `diagrams-tb-front` |
| Send to Back | Puts the shapes behind. Ctrl+Shift+B. | `diagrams-tb-back` |
| Group | Makes the shapes one group. Ctrl+G. | `diagrams-tb-group` |
| Ungroup | Breaks the group. Ctrl+Shift+U. | `diagrams-tb-ungroup` |
| Rotate Left | Rotates the shapes 90 degrees to the left. Ctrl+L. | `diagrams-tb-rotate-left` |
| Rotate Right | Rotates the shapes 90 degrees to the right. Ctrl+R. | `diagrams-tb-rotate-right` |
| Lay Out Shapes | Arranges the shapes from top to bottom along the connectors. | `diagrams-tb-layout` |

### The Shapes Window

| Name | What it does | data-testid |
|---|---|---|
| Shapes window | The window of stencils. | `diagrams-shapes` |
| Close | Closes the Shapes window. | `diagrams-shapes-close` |
| Search for Shapes | Finds shapes by name. | `diagrams-shape-search` |
| Search Results | The shapes that match the search. | `diagrams-search-results` |
| Stencil | One stencil panel. The name ends with the stencil, for example `flowchart`. | `diagrams-category-*` |
| Shape | One shape of a stencil. The name ends with the shape, for example `flowchart.process`. | `diagrams-stencil-*` |

### The Format Pane

| Name | What it does | data-testid |
|---|---|---|
| Format pane | The pane of properties. | `diagrams-format` |
| Close | Closes the Format pane. | `diagrams-format-close` |
| Shape panel | The name of the selected shape, and its text. | `diagrams-format-shape` |
| Text | The text of the shape. | `diagrams-format-text` |
| Size & Position | The position, size, and angle. | `diagrams-format-size` |
| X | The left edge. | `diagrams-format-x` |
| Y | The top edge. | `diagrams-format-y` |
| W | The width. | `diagrams-format-w` |
| H | The height. | `diagrams-format-h` |
| Angle | The rotation in degrees. | `diagrams-format-angle` |
| Lock | Stops changes to the position and the size. | `diagrams-format-lock` |
| Fill & Line | The colors and the line of the shape. | `diagrams-format-fill` |
| Fill | The fill color. | `diagrams-format-fill-color` |
| Line | The line color. | `diagrams-format-line-color` |
| Weight | The line weight. | `diagrams-format-weight` |
| Pattern | The line pattern. | `diagrams-format-dash` |
| Gradient | Fills the shape with a soft gradient. | `diagrams-format-gradient` |
| Shadow | Gives the shape a shadow. | `diagrams-format-shadow` |
| Text panel | The font of the shape. | `diagrams-format-font` |
| Font | The font. | `diagrams-format-font-family` |
| Size | The font size. | `diagrams-format-font-size` |
| Font color | The color of the text. | `diagrams-format-font-color` |
| Shape Data | The data of the shape. | `diagrams-format-data` |
| Data field | One data field. The name ends with the field, for example `attributes`. | `diagrams-data-*` |
| Connector panel | The kind, route, and labels of the connector. | `diagrams-format-connector` |
| Kind | Gives the connector the line of a notation. | `diagrams-format-preset` |
| Route | Right angle, straight, or curved. | `diagrams-format-routing` |
| Label | The text on the connector. | `diagrams-format-label` |
| Start label | The text near the start, for example a multiplicity. | `diagrams-format-start-label` |
| End label | The text near the end. | `diagrams-format-end-label` |
| Line & Ends | The line and the ends of the connector. | `diagrams-format-line` |
| Connector color | The color of the connector. | `diagrams-format-connector-color` |
| Begin | The line end at the start. | `diagrams-format-start-marker` |
| End | The line end at the end. | `diagrams-format-end-marker` |
| Page panel | The settings of the page. | `diagrams-format-page` |
| Page name | The name of the page. | `diagrams-format-page-name` |
| Paper size | The paper size of the page. | `diagrams-format-page-size` |
| Grow the page | Makes the sheet grow when the drawing passes its edge. | `diagrams-format-autosize` |
| Background | The color of the page. | `diagrams-format-page-color` |
| Drawing panel | The title of the drawing. | `diagrams-format-drawing` |
| Title | The title of the drawing. | `diagrams-format-title` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click on the drawing page, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `diagrams-menu-help` |
| Menu: about | Opens the About Agent Diagrams box. | `diagrams-menu-about` |
| Dialog: about | The About Agent Diagrams box. | `diagrams-about` |
| Dialog: about ok | Closes the About box. | `diagrams-about-ok` |
| Menu: chat pane | Shows or hides the chat pane. Ctrl+Shift+C. | `diagrams-menu-chat-pane` |
| Menu: new | Starts a new drawing. Ctrl+N. | `diagrams-menu-new` |
| Menu: open | Opens a drawing. Ctrl+O. | `diagrams-menu-open` |
| Menu: save | Saves the drawing. Ctrl+S. | `diagrams-menu-save` |
| Menu: save as | Saves the drawing with a new name. | `diagrams-menu-save-as` |
| Menu: export SVG | Saves the page as an SVG picture in the folder of the drawing. | `diagrams-menu-export-svg` |
| Menu: export PNG | Saves the page as a PNG picture in your Downloads folder. | `diagrams-menu-export-png` |
| Menu: page setup | Shows the page settings in the Format pane. | `diagrams-menu-page-setup` |
| Menu: exit | Closes the window. Alt+F4. | `diagrams-menu-close` |
| Menu: undo | Undoes the last change. Ctrl+Z. | `diagrams-menu-undo` |
| Menu: redo | Does the change again. Ctrl+Y. | `diagrams-menu-redo` |
| Menu: cut | Cuts the selection. | `diagrams-menu-cut` |
| Menu: copy | Copies the selection. | `diagrams-menu-copy` |
| Menu: paste | Pastes. | `diagrams-menu-paste` |
| Menu: duplicate | Makes a copy of the selected shapes. Ctrl+D. | `diagrams-menu-duplicate` |
| Menu: delete | Deletes the selection. Del. | `diagrams-menu-delete` |
| Menu: select all | Selects every shape and connector of the page. Ctrl+A. | `diagrams-menu-select-all` |
| Menu: edit text | Types the text of the selected shape. F2. | `diagrams-menu-edit-text` |
| Menu: zoom | Sets the zoom. The name ends with the percent, for example `100`. | `diagrams-menu-zoom-*` |
| Menu: whole page | Zooms to show the whole sheet. | `diagrams-menu-zoom-page` |
| Menu: page width | Zooms to the width of the sheet. | `diagrams-menu-zoom-width` |
| Menu: zoom in | Zooms in. | `diagrams-menu-zoom-in` |
| Menu: zoom out | Zooms out. | `diagrams-menu-zoom-out` |
| Menu: rulers | Shows or hides the rulers. | `diagrams-menu-rulers` |
| Menu: grid | Shows or hides the grid. | `diagrams-menu-grid` |
| Menu: snap to grid | Snaps moves and sizes to the grid. | `diagrams-menu-snap` |
| Menu: shapes window | Shows or hides the Shapes window. | `diagrams-menu-shapes` |
| Menu: format pane | Shows or hides the Format pane. | `diagrams-menu-format-pane` |
| Menu: new page | Adds a page. | `diagrams-menu-new-page` |
| Menu: duplicate page | Copies the page. | `diagrams-menu-duplicate-page` |
| Menu: text box | Selects the Text Tool. | `diagrams-menu-text-tool` |
| Menu: connector | Selects the Connector Tool. | `diagrams-menu-connector-tool` |
| Menu: bold | Bold text. | `diagrams-menu-bold` |
| Menu: italic | Italic text. | `diagrams-menu-italic` |
| Menu: underline | Underlined text. | `diagrams-menu-underline` |
| Menu: shadow | Gives the shapes a shadow, or removes it. | `diagrams-menu-shadow` |
| Menu: clear formatting | Removes your formatting from the selection. | `diagrams-menu-clear-format` |
| Menu: format | Shows the Format pane. | `diagrams-menu-format` |
| Menu: rotate left | Rotates 90 degrees to the left. | `diagrams-menu-rotate-left` |
| Menu: rotate right | Rotates 90 degrees to the right. | `diagrams-menu-rotate-right` |
| Menu: align left | Lines up the left edges. | `diagrams-menu-align-left` |
| Menu: align center | Lines up the centers. | `diagrams-menu-align-center` |
| Menu: align right | Lines up the right edges. | `diagrams-menu-align-right` |
| Menu: align top | Lines up the top edges. | `diagrams-menu-align-top` |
| Menu: align middle | Lines up the middles. | `diagrams-menu-align-middle` |
| Menu: align bottom | Lines up the bottom edges. | `diagrams-menu-align-bottom` |
| Menu: distribute horizontally | Equal space from left to right. | `diagrams-menu-distribute-h` |
| Menu: distribute vertically | Equal space from top to bottom. | `diagrams-menu-distribute-v` |
| Menu: bring to front | Puts the shapes in front. | `diagrams-menu-front` |
| Menu: bring forward | Puts the shapes one step forward. | `diagrams-menu-forward` |
| Menu: send backward | Puts the shapes one step back. | `diagrams-menu-backward` |
| Menu: send to back | Puts the shapes behind. | `diagrams-menu-back` |
| Menu: group | Groups the shapes. | `diagrams-menu-group` |
| Menu: ungroup | Breaks the group. | `diagrams-menu-ungroup` |
| Menu: top to bottom | Lays out the shapes from top to bottom. | `diagrams-menu-layout-tb` |
| Menu: left to right | Lays out the shapes from left to right. | `diagrams-menu-layout-lr` |
| Menu: grid layout | Puts the shapes in a grid. | `diagrams-menu-layout-grid` |
| Menu: circle | Puts the shapes in a circle. | `diagrams-menu-layout-circle` |
| Menu: connector style | Sets the route of new and selected connectors. The name ends with `orthogonal`, `straight`, or `curved`. | `diagrams-menu-route-*` |
| Context menu: paste | Pastes. | `diagrams-ctx-paste` |
| Context menu: select all | Selects everything on the page. | `diagrams-ctx-select-all` |
| Context menu: lay out | Lays out the shapes. The name ends with `tb`, `lr`, `grid`, or `circle`. | `diagrams-ctx-layout-*` |
| Context menu: zoom | Sets the zoom. | `diagrams-ctx-zoom-*` |
| Context menu: insert page | Adds a page. | `diagrams-ctx-new-page` |
| Context menu: page setup | Shows the page settings. | `diagrams-ctx-page-setup` |
| Context menu: cut | Cuts the selection. | `diagrams-ctx-cut` |
| Context menu: copy | Copies the selection. | `diagrams-ctx-copy` |
| Context menu: duplicate | Copies the selected shapes. | `diagrams-ctx-duplicate` |
| Context menu: delete | Deletes the selection. | `diagrams-ctx-delete` |
| Context menu: edit text | Types the text. | `diagrams-ctx-edit-text` |
| Context menu: format | Shows the Format pane. | `diagrams-ctx-format` |
| Context menu: order | Bring to front, forward, backward, or send to back. The name ends with `front`, `forward`, `backward`, or `back`. | `diagrams-ctx-front` |
| Context menu: bring forward | Puts the shapes one step forward. | `diagrams-ctx-forward` |
| Context menu: send backward | Puts the shapes one step back. | `diagrams-ctx-backward` |
| Context menu: send to back | Puts the shapes behind. | `diagrams-ctx-back` |
| Context menu: align | Lines up or spaces the shapes. | `diagrams-ctx-align-left` |
| Context menu: align center | Lines up the centers. | `diagrams-ctx-align-center` |
| Context menu: align right | Lines up the right edges. | `diagrams-ctx-align-right` |
| Context menu: align top | Lines up the top edges. | `diagrams-ctx-align-top` |
| Context menu: align middle | Lines up the middles. | `diagrams-ctx-align-middle` |
| Context menu: align bottom | Lines up the bottom edges. | `diagrams-ctx-align-bottom` |
| Context menu: distribute horizontally | Equal space from left to right. | `diagrams-ctx-distribute-h` |
| Context menu: distribute vertically | Equal space from top to bottom. | `diagrams-ctx-distribute-v` |
| Context menu: group | Groups the shapes. | `diagrams-ctx-group` |
| Context menu: ungroup | Breaks the group. | `diagrams-ctx-ungroup` |
| Context menu: lock | Locks or unlocks the shapes. | `diagrams-ctx-lock` |
| Context menu: connector style | Sets the route of the selected connectors. | `diagrams-ctx-route-*` |
| Page menu: insert | Adds a page. | `diagrams-page-ctx-insert` |
| Page menu: duplicate | Copies the page. | `diagrams-page-ctx-duplicate` |
| Page menu: rename | Renames the page. | `diagrams-page-ctx-rename` |
| Page menu: delete | Deletes the page. A question appears if the page has shapes. | `diagrams-page-ctx-delete` |
| Page menu: move left | Moves the page one place to the left. | `diagrams-page-ctx-left` |
| Page menu: move right | Moves the page one place to the right. | `diagrams-page-ctx-right` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| Delete or Backspace | Deletes the selection. | none |
| Arrow keys | Move the selected shapes one grid step. With Shift, one unit. | none |
| Esc | Goes back to the Pointer Tool, or clears the selection. | none |
| F2 | Types the text of the selected shape or connector. | none |
| Ctrl+Enter | Finishes the text. | none |
| Ctrl+A, Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+D | Select all, copy, cut, paste, and duplicate. | none |
| Ctrl+Z, Ctrl+Y | Undo and redo. Ctrl+Shift+Z also redoes. | none |
| Ctrl+G, Ctrl+Shift+U | Group and ungroup. | none |
| Ctrl+1, Ctrl+2, Ctrl+3 | Pointer Tool, Text Tool, and Connector Tool. | none |
| Ctrl+wheel | Zooms at the pointer. | none |
| Space+drag, middle mouse button | Moves the view. | none |
| F1 | Opens this manual. | none |

## 7 - Common Tasks

To draw a flowchart, follow the steps below:

1. In the Shapes window, open **Flowchart**.
2. Drag **Start/End** onto the page. Type `Start`.
3. Drag **Process** below it, and type the step.
4. Point at the first shape. Drag from its lower connection point to the second shape.
5. Add the other steps in the same way.
6. Click **Shape -> Lay Out Shapes -> Top to Bottom** to tidy the drawing.

To draw a UML class diagram, follow the steps below:

1. Open **UML Class** and drag **Class** onto the page.
2. Type the name of the class.
3. In the Format pane, under **Shape Data**, type the attributes and the operations, one on each line.
4. Connect two classes. In the Format pane, set **Kind** to **UML: Inheritance**, **UML: Composition**, or another kind.

To draw an entity relationship diagram, follow the steps below:

1. Open **ERD** and drag **Entity** onto the page.
2. Type the name of the table.
3. Under **Shape Data**, type the columns, for example `PK id int` and `FK customer_id int`.
4. Connect two entities. Set **Kind** to **ERD: One to many**.
5. To connect a column to a column, drag from the connection point at the row of the column.

To ask the agent to draw, follow the steps below:

1. Open the chat pane of the window, or a chat.
2. Type what you want, for example `Draw a sequence diagram of the login`.
3. The agent draws on the page. Change the drawing by hand, or ask for changes.

To save the drawing, click **File -> Save**. The first time, type a name. The file goes to the Documents folder.

## 8 - Troubleshooting

- **A connector does not move with its shape.** The end is not glued. Select the connector and drag its green end onto the shape.
- **I cannot move or change a shape.** The shape is locked. Right-click it and click **Unlock**.
- **A shape does not move to where I drop it.** Snap to Grid and the guides move it to the nearest grid line or edge. Hold Alt while you drag, or clear **View -> Snap to Grid**.
- **The sheet is bigger than one page.** The drawing passed the edge of the sheet. Move the shapes back, or clear **Grow the page to fit the drawing** in the Format pane.
- **The agent says that Agent Diagrams is closed.** The agent can use its diagram tools only while Agent Diagrams is open. Open it, or let the agent open it. A window that the agent opens appears behind your window, and its taskbar button flashes.
- **I do not like what the agent drew.** Press Ctrl+Z. Each change of the agent is one undo step.

## 9 - Need Help?

Read **[The Chat Pane](embedded-chat.md)** to work with the agent in this window. Read **[Introduction to the Desktop](desktop.md)** for the Start menu, the windows, and the taskbar.
