#!/bin/bash
set -euo pipefail

# Read stdin for hook input
INPUT=$(cat)

# Extract event details from JSON
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"' 2>/dev/null || echo "unknown")
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null || echo "")
NOTIFICATION_TYPE=$(echo "$INPUT" | jq -r '.notification_type // ""' 2>/dev/null || echo "")
STOP_REASON=$(echo "$INPUT" | jq -r '.stop_reason // ""' 2>/dev/null || echo "")
CWD=$(echo "$INPUT" | jq -r '.cwd // ""' 2>/dev/null || echo "")

# Detect tmux session name
# Priority 1: CLAUDE_TMUX_SESSION env var (set by agent - most reliable)
TMUX_SESSION="${CLAUDE_TMUX_SESSION:-}"

# Priority 2: If not set, try tmux display-message (only if in tmux context)
if [ -z "$TMUX_SESSION" ] && [ -n "${TMUX:-}" ]; then
  TMUX_SESSION=$(tmux display-message -p '#{session_name}' 2>/dev/null || echo "")
fi

# If still no session detected, log warning but continue
if [ -z "$TMUX_SESSION" ]; then
  echo "[WARN] Could not detect tmux session for hook $EVENT" >&2
fi

# Map events to simplified status model
# Status: working | needs_attention | idle
# AttentionReason: permission | input | plan_approval | task_complete
STATUS="working"
ATTENTION_REASON=""

case "$EVENT" in
  "SessionStart")
    STATUS="working"
    ;;
  "PermissionRequest")
    STATUS="needs_attention"
    ATTENTION_REASON="permission"
    ;;
  "Stop")
    STATUS="needs_attention"
    # end_turn means Claude is waiting for user input
    # Otherwise, task is complete
    if [ "$STOP_REASON" = "end_turn" ]; then
      ATTENTION_REASON="input"
    else
      ATTENTION_REASON="task_complete"
    fi
    ;;
  "Notification")
    # idle_prompt notification means Claude is waiting for user input
    if [ "$NOTIFICATION_TYPE" = "idle_prompt" ]; then
      STATUS="needs_attention"
      ATTENTION_REASON="input"
    fi
    ;;
  "SessionEnd")
    STATUS="idle"
    ;;
  *)
    # Unknown event, default to working
    STATUS="working"
    ;;
esac

# Extract project name from cwd (last component of path)
PROJECT=$(basename "$CWD" 2>/dev/null || echo "")

# Get current timestamp in milliseconds
TIMESTAMP=$(($(date +%s) * 1000))

# Send status update to local agent
# Note: Use || true to ensure we never block Claude execution
curl -s -X POST "http://localhost:4678/api/hooks/status" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"$EVENT\",
    \"status\": \"$STATUS\",
    \"attention_reason\": \"$ATTENTION_REASON\",
    \"session_id\": \"$SESSION_ID\",
    \"tmux_session\": \"$TMUX_SESSION\",
    \"project\": \"$PROJECT\",
    \"timestamp\": $TIMESTAMP
  }" > /dev/null 2>&1 || true

# Exit successfully (never block Claude)
exit 0
