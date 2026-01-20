import { toast } from 'sonner';

// Map attention reason to notification body (front-end decides how to display)
const REASON_LABELS: Record<string, string> = {
  // Claude Code notification_type values
  permission_prompt: 'Permission requise',
  input_request: 'Input attendu',
  plan_mode: 'Approbation du plan',
  task_complete: 'Tâche terminée',
  // Stop hook value
  input: 'Input attendu',
  // Legacy values (for backwards compat)
  permission: 'Permission requise',
  plan_approval: 'Approbation du plan',
};

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
}

/**
 * Show an in-app toast notification.
 * Used when the app is in the foreground to avoid showing system notifications.
 */
export function showInAppToast(project: string, reason?: string): void {
  const title = `Claude - ${project}`;
  const body = reason ? REASON_LABELS[reason] || `Attention: ${reason}` : 'Attention requise';

  toast(title, {
    description: body,
    duration: 6000,
  });
}
