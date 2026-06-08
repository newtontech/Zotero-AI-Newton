import { getLocaleID, getString } from "../utils/locale";
import {
  ChatTurn,
  WorkspaceContext,
  collectContext,
  describeItems,
} from "./workspaceContext";
import {
  requestLLMCompletion,
  summarizeContextForHistory,
  GroundedAnswer,
} from "./llmClient";
import { buildAnalysisInstruction, getAnalysisTemplates } from "./aiAnalysis";
import type { AnalysisKind } from "./aiAnalysis";

const PANEL_ID = "zotero-ai-workspace-pane";

function renderHistory(container: HTMLElement, history: ChatTurn[]) {
  const doc = container.ownerDocument;
  if (!doc) return;
  container.replaceChildren();

  const historyTitle = doc.createElement("div");
  historyTitle.classList.add("ai-workspace-subheading");
  historyTitle.textContent = getString("workspace-dialog-title");
  container.appendChild(historyTitle);

  history.forEach((turn) => {
    const row = doc.createElement("div");
    row.classList.add("ai-workspace-line");
    row.textContent = `${turn.role === "user" ? "🧑" : "🤖"} ${turn.content}`;

    // Render grounded answer with citations if available
    if (turn.role === "assistant" && turn.groundedAnswer) {
      renderGroundedAnswer(doc, row, turn.groundedAnswer);
    }

    if (turn.contextLabel) {
      const detail = doc.createElement("div");
      detail.classList.add("ai-workspace-context");
      detail.textContent = turn.contextLabel;
      row.appendChild(detail);
    }
    container.appendChild(row);
  });
}

function renderGroundedAnswer(
  doc: Document,
  container: HTMLElement,
  answer: GroundedAnswer,
) {
  // Confidence indicator
  const confidenceBadge = doc.createElement("span");
  confidenceBadge.classList.add(
    "ai-evidence-confidence",
    `ai-confidence-${answer.confidence}`,
  );
  confidenceBadge.textContent =
    getString(`workspace-confidence-${answer.confidence}` as any) ||
    answer.confidence;
  container.appendChild(confidenceBadge);

  // Citations
  if (answer.citations && answer.citations.length > 0) {
    const citationsContainer = doc.createElement("div");
    citationsContainer.classList.add("ai-evidence-citations");

    const citationsTitle = doc.createElement("div");
    citationsTitle.classList.add("ai-evidence-citations-title");
    citationsTitle.textContent = getString("workspace-citations-title");
    citationsContainer.appendChild(citationsTitle);

    answer.citations.forEach((citation) => {
      const citationCard = doc.createElement("div");
      citationCard.classList.add("ai-evidence-card");

      const citationHeader = doc.createElement("div");
      citationHeader.classList.add("ai-evidence-card-header");
      citationHeader.textContent = citation.title;
      citationCard.appendChild(citationHeader);

      if (citation.page) {
        const pageInfo = doc.createElement("span");
        pageInfo.classList.add("ai-evidence-card-page");
        pageInfo.textContent = `p. ${citation.page}`;
        citationHeader.appendChild(pageInfo);
      }

      if (citation.quote) {
        const quote = doc.createElement("div");
        quote.classList.add("ai-evidence-card-quote");
        quote.textContent = ` "${citation.quote}"`;
        citationCard.appendChild(quote);
      }

      citationsContainer.appendChild(citationCard);
    });

    container.appendChild(citationsContainer);
  }

  // Unsupported claims warning
  if (answer.unsupportedClaims && answer.unsupportedClaims.length > 0) {
    const warning = doc.createElement("div");
    warning.classList.add("ai-evidence-unsupported");
    warning.textContent = getString("workspace-unsupported-warning");

    const claimsList = doc.createElement("ul");
    answer.unsupportedClaims.forEach((claim) => {
      const li = doc.createElement("li");
      li.textContent = claim;
      claimsList.appendChild(li);
    });
    warning.appendChild(claimsList);
    container.appendChild(warning);
  }

  // Copy button for cited answer
  const copyButton = doc.createElement("button");
  copyButton.classList.add("ai-evidence-copy-btn");
  copyButton.textContent = getString("workspace-copy-answer");
  copyButton.addEventListener("click", () => {
    const textToCopy = formatGroundedAnswerForCopy(answer);
    Zotero.Utilities.Internal.copyTextToClipboard(textToCopy);
  });
  container.appendChild(copyButton);
}

export function formatGroundedAnswerForCopy(answer: GroundedAnswer): string {
  const lines: string[] = [answer.answer, ""];

  if (answer.citations && answer.citations.length > 0) {
    lines.push("Citations:");
    answer.citations.forEach((cit) => {
      const pageStr = cit.page ? ` (p. ${cit.page})` : "";
      lines.push(`- ${cit.title}${pageStr}`);
      if (cit.quote) lines.push(`  "${cit.quote}"`);
    });
    lines.push("");
  }

  if (answer.unsupportedClaims && answer.unsupportedClaims.length > 0) {
    lines.push("Unsupported claims:");
    answer.unsupportedClaims.forEach((claim) => lines.push(`- ${claim}`));
  }

  lines.push(`Confidence: ${answer.confidence}`);
  return lines.join("\n");
}

function updateStatus(doc: Document, text: string) {
  const status = doc.getElementById(`${PANEL_ID}-status`);
  if (!status) return;
  status.textContent = text;
}

function getHistoryStore(): ChatTurn[] {
  addon.data.aiSession ??= { history: [] } as { history: ChatTurn[] };
  return addon.data.aiSession!.history;
}

function getWorkspaceBodies() {
  const data = addon.data as any;
  data.workspaceBodies ??= new WeakMap<Window, HTMLElement>();
  return data.workspaceBodies as WeakMap<Window, HTMLElement>;
}

export async function ensureReaderSidebar(doc: Document) {
  const deck = doc.querySelector(".notes-pane-deck") as any;
  const tabbox = deck?.parentElement as any;
  const tabs = tabbox?.querySelector?.("tabs") as any;
  if (!deck || !tabs || !tabbox) return;
  if (doc.getElementById("zotero-ai-reader-tab")) return;

  const tab =
    (doc as any).createXULElement?.("tab") ?? doc.createElement("tab");
  tab.id = "zotero-ai-reader-tab";
  tab.setAttribute("label", getString("workspace-section-label"));
  tab.setAttribute(
    "image",
    `chrome://${addon.data.config.addonRef}/content/icons/sidebar-16.svg`,
  );

  const panel =
    (doc as any).createXULElement?.("tabpanel") ??
    doc.createElement("tabpanel");
  panel.id = "zotero-ai-reader-panel";

  const body = doc.createElement("div");
  body.classList.add("ai-workspace-reader-panel");
  panel.appendChild(body);

  buildSectionBody(
    body as HTMLElement,
    resolveContextFromArgs("reader", undefined),
  );

  tabs.appendChild(tab);
  deck.appendChild(panel);

  const updateDeck = () => {
    const idx = Array.from(tabs.children).indexOf(tab);
    if (idx >= 0) deck.selectedIndex = idx;
  };

  tab.addEventListener("command", updateDeck);
  tabs.addEventListener("select", () => {
    deck.selectedIndex = (tabs as any).selectedIndex ?? 0;
  });
}

function resolveContextFromArgs(
  tabType: "library" | "reader",
  item?: Zotero.Item | null,
) {
  if (tabType === "reader" && item) {
    const attachments =
      typeof (item as any).getAttachments === "function"
        ? ((item as any).getAttachments() as number[]).length
        : 0;
    return {
      items: [item],
      label: item.getDisplayTitle?.() || item.getField("title") || "",
      attachments,
    } as WorkspaceContext;
  }
  return collectContext();
}

function buildSectionBody(
  body: HTMLElement,
  context: WorkspaceContext,
  setSectionSummary?: (summary: string) => void,
) {
  body.replaceChildren();
  const doc = body.ownerDocument;
  if (!doc) return;

  if (doc.defaultView) {
    getWorkspaceBodies().set(doc.defaultView, body);
  }

  const panel = doc.createElement("div");
  panel.id = PANEL_ID;
  panel.classList.add("ai-workspace-pane");

  const toolbar = doc.createElement("div");
  toolbar.classList.add("ai-workspace-toolbar");

  const title = doc.createElement("div");
  title.classList.add("ai-workspace-heading");
  title.textContent = getString("workspace-section-title");

  const summary = doc.createElement("div");
  summary.classList.add("ai-workspace-summary");
  summary.textContent = `${getString("workspace-context")}: ${context.label}`;

  const toolbarActions = doc.createElement("div");
  toolbarActions.classList.add("ai-workspace-actions");

  const refreshBtn = doc.createElement("button");
  refreshBtn.textContent = getString("workspace-refresh-context");
  refreshBtn.addEventListener("click", () =>
    buildSectionBody(body, collectContext()),
  );

  const clearBtn = doc.createElement("button");
  clearBtn.textContent = getString("workspace-close");
  clearBtn.addEventListener("click", () => {
    const history = getHistoryStore();
    history.splice(0, history.length);
    renderHistory(historyContainer, history);
    updateStatus(doc, "");
  });

  toolbarActions.appendChild(refreshBtn);
  toolbarActions.appendChild(clearBtn);

  toolbar.appendChild(title);
  toolbar.appendChild(summary);
  toolbar.appendChild(toolbarActions);

  const historyContainer = doc.createElement("div");
  historyContainer.id = `${PANEL_ID}-history`;
  historyContainer.classList.add("ai-workspace-history");

  const statusLine = doc.createElement("div");
  statusLine.id = `${PANEL_ID}-status`;
  statusLine.classList.add("ai-workspace-status");

  const history = getHistoryStore();

  const inputArea = doc.createElement("div");
  inputArea.classList.add("ai-workspace-input");

  const templateRow = doc.createElement("div");
  templateRow.classList.add("ai-workspace-templates");

  const templateLabel = doc.createElement("label");
  templateLabel.classList.add("ai-workspace-templates-label");
  templateLabel.textContent = getString("workspace-templates-label");

  const templateSelect = doc.createElement("select");
  templateSelect.classList.add("ai-workspace-template-select");
  getAnalysisTemplates(context, history).forEach(({ kind, label }) => {
    const option = doc.createElement("option");
    option.value = kind;
    option.textContent = label;
    templateSelect.appendChild(option);
  });

  const templateBtn = doc.createElement("button");
  templateBtn.classList.add("ai-workspace-template-insert");
  templateBtn.textContent = "→";
  templateBtn.title = getString("workspace-templates-label");
  templateBtn.addEventListener("click", () => {
    const kind = (templateSelect.value || "summary") as AnalysisKind;
    const text = buildAnalysisInstruction(kind, collectContext(), history);
    if (!text) return;
    const caret = textarea.selectionStart || textarea.value.length;
    const before = textarea.value.slice(0, caret);
    const after = textarea.value.slice(caret);
    textarea.value = `${before}${text}\n\n${after}`;
    textarea.focus();
    const newPos = before.length + text.length + 2;
    textarea.selectionStart = textarea.selectionEnd = newPos;
  });

  templateRow.appendChild(templateLabel);
  templateRow.appendChild(templateSelect);
  templateRow.appendChild(templateBtn);

  const textarea = doc.createElement("textarea");
  textarea.id = `${PANEL_ID}-question`;
  textarea.placeholder = getString("workspace-question-placeholder");
  textarea.addEventListener("keydown", (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void sendHandler();
    }
  });

  const footer = doc.createElement("div");
  footer.classList.add("ai-workspace-footer");
  const sendButton = doc.createElement("button");
  sendButton.classList.add("ai-workspace-send");
  sendButton.textContent = getString("workspace-send");

  renderHistory(historyContainer, history);

  const sendHandler = async () => {
    const question = textarea.value.trim();
    if (!question) {
      updateStatus(doc, getString("workspace-error-empty-question"));
      return;
    }
    const freshContext = collectContext();
    summary.textContent = `${getString("workspace-context")}: ${freshContext.label}`;

    history.push({
      role: "user",
      content: question,
      contextLabel: freshContext.label,
    });
    textarea.value = "";
    renderHistory(historyContainer, history);
    updateStatus(doc, getString("workspace-status-waiting"));
    try {
      const answer = await requestLLMCompletion(
        question,
        freshContext,
        history,
      );

      // Handle both GroundedAnswer and plain string responses
      const chatTurn: ChatTurn = {
        role: "assistant",
        content: typeof answer === "string" ? answer : answer.answer,
        contextLabel: summarizeContextForHistory(freshContext),
      };

      // Store grounded answer if available
      if (typeof answer !== "string") {
        chatTurn.groundedAnswer = answer;
      }

      history.push(chatTurn);
      renderHistory(historyContainer, history);
      updateStatus(doc, "");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : getString("workspace-status-error");
      history.push({
        role: "assistant",
        content: `${getString("workspace-error-generic")}: ${message}`,
        contextLabel: summarizeContextForHistory(freshContext),
      });
      renderHistory(historyContainer, history);
      updateStatus(doc, message);
    }
  };

  sendButton.addEventListener("click", () => void sendHandler());

  inputArea.appendChild(templateRow);
  inputArea.appendChild(textarea);
  footer.appendChild(sendButton);

  panel.appendChild(toolbar);
  panel.appendChild(historyContainer);
  panel.appendChild(statusLine);
  panel.appendChild(inputArea);
  panel.appendChild(footer);

  // Quick context snapshot under the toolbar
  const contextSummary = doc.createElement("div");
  contextSummary.classList.add("ai-workspace-context-summary");
  contextSummary.textContent = describeItems(
    context.items,
    context.attachments,
  );
  panel.insertBefore(contextSummary, historyContainer);

  if (setSectionSummary) {
    setSectionSummary(context.label);
  }

  body.appendChild(panel);
}

export function registerWorkspaceSection() {
  Zotero.ItemPaneManager.registerSection({
    paneID: "ai-workspace",
    pluginID: addon.data.config.addonID,
    header: {
      l10nID: getLocaleID("workspace-section-label"),
      icon: `chrome://${addon.data.config.addonRef}/content/icons/sidebar-16.svg`,
    },
    sidenav: {
      l10nID: getLocaleID("workspace-section-tooltip"),
      icon: `chrome://${addon.data.config.addonRef}/content/icons/sidebar-20.svg`,
    },
    onRender: ({
      body,
      tabType,
      item,
      setSectionSummary,
    }: _ZoteroTypes.ItemPaneManagerSection.SectionHookArgs) => {
      buildSectionBody(
        body as HTMLElement,
        resolveContextFromArgs(tabType as "library" | "reader", item),
        setSectionSummary,
      );
    },
    onItemChange: ({
      body,
      tabType,
      item,
      setSectionSummary,
    }: _ZoteroTypes.ItemPaneManagerSection.SectionHookArgs) => {
      buildSectionBody(
        body as HTMLElement,
        resolveContextFromArgs(tabType as "library" | "reader", item),
        setSectionSummary,
      );
    },
  });
}

export function registerWorkspaceMenu() {
  // @ts-expect-error - ztoolkit.Menu may not exist in newer toolkit
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    id: "zotero-ai-workspace-open",
    label: getString("workspace-menuitem-label"),
    commandListener: () => openWorkspacePanel(),
    icon: `chrome://${addon.data.config.addonRef}/content/icons/favicon.svg`,
  });
}

export function openWorkspacePanel() {
  const pane = ztoolkit.getGlobal("ZoteroPane");
  const doc = pane?.document;
  if (!doc) return;
  const win = doc.defaultView || undefined;
  const body =
    getWorkspaceBodies().get(win as Window) ||
    (doc.querySelector(`#${PANEL_ID}`)?.parentElement as HTMLElement | null) ||
    (doc.querySelector(
      `[data-section-id="ai-workspace"] .section-body`,
    ) as HTMLElement | null) ||
    (doc.querySelector(
      `[data-pane-id="ai-workspace"] .section-body`,
    ) as HTMLElement | null);
  if (!body) return;
  const section = body.closest(".section-container") as HTMLElement | null;
  section?.classList.remove("collapsed");
  body.scrollIntoView({ behavior: "smooth", block: "nearest" });
  buildSectionBody(body, collectContext());
}
