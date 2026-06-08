/**
 * Write-action confirmation infrastructure for agent tools.
 *
 * This module provides confirmation dialogs before executing write actions
 * (creating notes, modifying tags, updating items, etc.) to prevent
 * unintended modifications by the AI agent.
 */

export type WriteActionType =
  | "create_note"
  | "delete_note"
  | "create_annotation"
  | "delete_annotation"
  | "modify_tags"
  | "modify_item"
  | "create_item"
  | "delete_item"
  | "modify_related"
  | "other_write";

export interface WriteAction {
  type: WriteActionType;
  description: string;
  details?: string;
  itemIds?: number[];
  estimatedChanges?: number;
}

export interface ConfirmationResult {
  confirmed: boolean;
  modifiedAction?: WriteAction;
}

/**
 * Show a confirmation dialog for a write action.
 * Returns a Promise that resolves to the confirmation result.
 *
 * In the Zotero UI context, this would show a modal dialog.
 * For now, this is a placeholder that logs the action and returns confirmed=true.
 * The actual UI dialog should be implemented when the agent runtime is added.
 */
export async function confirmWriteAction(
  action: WriteAction,
): Promise<ConfirmationResult> {
  const actionDescription = formatActionDescription(action);

  Zotero.debug(
    `[AI Newton] Write action confirmation required: ${action.type}`,
  );
  Zotero.debug(`[AI Newton] Action details: ${actionDescription}`);

  // TODO: Implement actual Zotero dialog when agent runtime is added
  // For now, return confirmed=true to allow the action
  // In production, this should show a proper confirmation dialog to the user

  // Placeholder: always confirm (remove this when UI is implemented)
  Zotero.debug(
    "[AI Newton] Auto-confirming write action (UI not yet implemented)",
  );

  return {
    confirmed: true,
    modifiedAction: action,
  };
}

/**
 * Format a write action into a human-readable description.
 */
function formatActionDescription(action: WriteAction): string {
  const parts: string[] = [];

  parts.push(`Type: ${action.type}`);
  parts.push(`Description: ${action.description}`);

  if (action.itemIds && action.itemIds.length > 0) {
    parts.push(`Items: ${action.itemIds.join(", ")}`);
  }

  if (action.estimatedChanges) {
    parts.push(`Estimated changes: ${action.estimatedChanges}`);
  }

  if (action.details) {
    parts.push(`Details: ${action.details}`);
  }

  return parts.join("; ");
}

/**
 * Check if an action type requires confirmation.
 * Some actions might be considered "safe" and not require confirmation.
 */
export function requiresConfirmation(actionType: WriteActionType): boolean {
  // All write actions require confirmation by default
  const noConfirmationNeeded: WriteActionType[] = [
    // Add any action types that don't need confirmation here
    // For example, if "read" actions were in this enum
  ];

  return !noConfirmationNeeded.includes(actionType);
}

/**
 * Create a write action object with sensible defaults.
 */
export function createWriteAction(
  type: WriteActionType,
  description: string,
  options?: {
    details?: string;
    itemIds?: number[];
    estimatedChanges?: number;
  },
): WriteAction {
  return {
    type,
    description,
    details: options?.details,
    itemIds: options?.itemIds,
    estimatedChanges: options?.estimatedChanges,
  };
}
