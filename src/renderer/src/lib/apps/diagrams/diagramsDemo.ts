/** A sample drawing (an order flow and a small class diagram) for the Storybook story and the manual's screenshots. */
import { applyAgentMethod } from "./model/agentApi";
import { createDoc } from "./model/document";
import { estimateMeasure, type Measure } from "./model/text";
import type { DiagramDoc } from "./model/types";

/** diagram_add: an order flowchart. */
export const DEMO_FLOW = {
  shapes: [
    {
      ref: "start",
      stencil: "flowchart.terminator",
      text: "Order received",
      x: 80,
      y: 60,
    },
    {
      ref: "check",
      stencil: "flowchart.decision",
      text: "In stock?",
      x: 80,
      y: 170,
    },
    {
      ref: "pick",
      stencil: "flowchart.process",
      text: "Pick and pack",
      x: 80,
      y: 310,
    },
    {
      ref: "order",
      stencil: "flowchart.process",
      text: "Order from supplier",
      x: 330,
      y: 182,
    },
    { ref: "db", stencil: "flowchart.database", text: "Stock", x: 360, y: 300 },
    {
      ref: "ship",
      stencil: "flowchart.terminator",
      text: "Shipped",
      x: 80,
      y: 430,
    },
  ],
  connectors: [
    { from: "start", to: "check" },
    { from: "check", to: "pick", label: "Yes" },
    { from: "check", to: "order", label: "No" },
    { from: "order", to: "db", preset: "dashed" },
    { from: "pick", to: "ship" },
  ],
};

/** diagram_add: three UML classes beside the flowchart. */
export const DEMO_CLASSES = {
  shapes: [
    {
      ref: "order",
      stencil: "uml.class",
      text: "Order",
      x: 620,
      y: 60,
      data: {
        attributes: ["- id: UUID", "- placed: Date", "- total: Money"],
        operations: ["+ submit(): void", "+ cancel(): void"],
      },
    },
    {
      ref: "line",
      stencil: "uml.class",
      text: "OrderLine",
      x: 620,
      y: 300,
      data: {
        attributes: ["- quantity: int", "- price: Money"],
        operations: [],
      },
    },
    {
      ref: "customer",
      stencil: "uml.class",
      text: "Customer",
      x: 860,
      y: 60,
      data: {
        attributes: ["- name: String", "- email: String"],
        operations: ["+ orders(): Order[]"],
      },
    },
  ],
  connectors: [
    {
      from: "order",
      to: "line",
      preset: "uml.composition",
      startLabel: "1",
      endLabel: "1..*",
    },
    {
      from: "customer",
      to: "order",
      preset: "uml.association",
      startLabel: "1",
      endLabel: "0..*",
      label: "places",
    },
  ],
};

/** diagram_add: an ER diagram with crow's-foot lines, on its own page. */
export const DEMO_ERD = {
  shapes: [
    {
      ref: "cust",
      stencil: "erd.entity",
      text: "customer",
      x: 60,
      y: 60,
      data: { attributes: ["PK id int", "name varchar", "email varchar"] },
    },
    {
      ref: "ord",
      stencil: "erd.entity",
      text: "order",
      x: 360,
      y: 60,
      data: {
        attributes: ["PK id int", "FK customer_id int", "placed_at date"],
      },
    },
    {
      ref: "line",
      stencil: "erd.entity",
      text: "order_line",
      x: 360,
      y: 300,
      data: { attributes: ["PK,FK order_id int", "PK line_no int", "qty int"] },
    },
  ],
  connectors: [
    {
      from: "cust",
      to: "ord",
      fromPort: "id",
      toPort: "customer_id",
      preset: "erd.one-to-many",
    },
    { from: "ord", to: "line", preset: "erd.one-to-one-or-many" },
  ],
};

/** The whole sample drawing as one document. */
export function demoDiagram(measure: Measure = estimateMeasure): DiagramDoc {
  let s = {
    doc: createDoc("Order process"),
    page: 0,
    selection: [] as string[],
  };
  for (const [method, params] of [
    ["add", DEMO_FLOW],
    ["add", DEMO_CLASSES],
  ] as const)
    s = applyAgentMethod(s, method, params, measure).session;
  return s.doc;
}
