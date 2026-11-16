import type { Component } from 'svelte'
import type { WinformsComponentName } from '@shared/a2ui/catalog'
import type { A2uiComponentProps } from './components/types'
import Panel from './components/Panel.svelte'
import FlowLayoutPanel from './components/FlowLayoutPanel.svelte'
import TableLayoutPanel from './components/TableLayoutPanel.svelte'
import GroupBox from './components/GroupBox.svelte'
import TabControl from './components/TabControl.svelte'
import SplitContainer from './components/SplitContainer.svelte'
import Label from './components/Label.svelte'
import LinkLabel from './components/LinkLabel.svelte'
import Button from './components/Button.svelte'
import CheckBox from './components/CheckBox.svelte'
import RadioButtonGroup from './components/RadioButtonGroup.svelte'
import TextBox from './components/TextBox.svelte'
import NumericUpDown from './components/NumericUpDown.svelte'
import ComboBox from './components/ComboBox.svelte'
import ListBox from './components/ListBox.svelte'
import CheckedListBox from './components/CheckedListBox.svelte'
import ProgressBar from './components/ProgressBar.svelte'
import TrackBar from './components/TrackBar.svelte'
import DateTimePicker from './components/DateTimePicker.svelte'
import MonthCalendar from './components/MonthCalendar.svelte'
import PictureBox from './components/PictureBox.svelte'
import TreeView from './components/TreeView.svelte'
import ListView from './components/ListView.svelte'
import DataGridView from './components/DataGridView.svelte'
import PropertyGrid from './components/PropertyGrid.svelte'
import CodeViewer from './components/CodeViewer.svelte'
import DiffViewer from './components/DiffViewer.svelte'
import ConsoleView from './components/ConsoleView.svelte'
import Markdown from './components/Markdown.svelte'
import MessageBoxPanel from './components/MessageBoxPanel.svelte'

/**
 * Maps each catalog component to the Svelte wrapper that renders it with the WinForms kit.
 * Typed over the catalog's component names, so a component added to `winforms-catalog.json`
 * does not compile until it has a wrapper here.
 */
export const a2uiRegistry: Record<WinformsComponentName, Component<A2uiComponentProps>> = {
  Panel,
  FlowLayoutPanel,
  TableLayoutPanel,
  GroupBox,
  TabControl,
  SplitContainer,
  Label,
  LinkLabel,
  Button,
  CheckBox,
  RadioButtonGroup,
  TextBox,
  NumericUpDown,
  ComboBox,
  ListBox,
  CheckedListBox,
  ProgressBar,
  TrackBar,
  DateTimePicker,
  MonthCalendar,
  PictureBox,
  TreeView,
  ListView,
  DataGridView,
  PropertyGrid,
  CodeViewer,
  DiffViewer,
  ConsoleView,
  Markdown,
  MessageBoxPanel
}

/** The wrapper for a component type, or undefined for types outside the catalog. */
export function lookupComponent(type: string): Component<A2uiComponentProps> | undefined {
  return Object.hasOwn(a2uiRegistry, type) ? a2uiRegistry[type as WinformsComponentName] : undefined
}
