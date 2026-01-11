import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface InitScriptOptions {
  sessionName: string;
  projectName: string;
  customEnvVars?: Record<string, string>;
  shell?: 'bash' | 'zsh';
  /** Issue plan to inject as Claude context (written to .claude/current-task.md) */
  issuePlan?: string;
  /** Issue title for display in welcome message */
  issueTitle?: string;
  /** Planning prompt to start Claude with (for planning sessions) */
  planningPrompt?: string;
}

/**
 * Detects the user's default shell from environment.
 */
export function detectUserShell(): 'bash' | 'zsh' {
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh')) return 'zsh';
  return 'bash';
}

/**
 * Generates a bash/zsh init script for tmux session initialization.
 * Features: adaptive prompt, tmux status bar, useful aliases, welcome message.
 */
export function generateInitScript(options: InitScriptOptions): string {
  const {
    sessionName,
    projectName,
    customEnvVars = {},
    shell = detectUserShell(),
    issuePlan,
    issueTitle,
    planningPrompt,
  } = options;

  const escapedSession = escapeForBash(sessionName);
  const escapedProject = escapeForBash(projectName);

  // Build custom env var exports
  const customExports: string[] = [];
  for (const [key, value] of Object.entries(customEnvVars)) {
    if (value && value.trim() !== '') {
      customExports.push(`export ${key}="${escapeForBash(value)}"`);
    }
  }

  // Colors matching xterm theme (256-color codes)
  const colors = {
    orange: '208', // #f97316 - accent
    green: '114', // #4ade80
    cyan: '80', // #22d3ee
    muted: '245', // #52525b
    magenta: '141', // #c084fc - git branch
    red: '203', // #f87171 - error
    white: '255', // #e4e4e7
  };

  // tmux status bar config
  const tmuxStatusConfig = `
# tmux status bar - minimal with project info
tmux set-option -t "${escapedSession}" status on 2>/dev/null
tmux set-option -t "${escapedSession}" status-position bottom 2>/dev/null
tmux set-option -t "${escapedSession}" status-interval 10 2>/dev/null
tmux set-option -t "${escapedSession}" status-style "bg=#1a1a2e,fg=#e4e4e7" 2>/dev/null
tmux set-option -t "${escapedSession}" status-left "#[fg=#f97316,bold] 247 #[fg=#52525b]|#[fg=#e4e4e7] ${escapedProject} " 2>/dev/null
tmux set-option -t "${escapedSession}" status-left-length 40 2>/dev/null
tmux set-option -t "${escapedSession}" status-right "#[fg=#52525b]|#[fg=#4ade80] %H:%M " 2>/dev/null
tmux set-option -t "${escapedSession}" status-right-length 20 2>/dev/null`;

  // Prompt configuration - adapts to terminal width
  // Note: $ doesn't need escaping in JS template literals except before {
  const bashPromptConfig = `
# Adaptive prompt - compact on mobile, full on desktop
_247_prompt_command() {
  local exit_code=$?
  local cols=$(tput cols 2>/dev/null || echo 80)

  # Exit code indicator (red X if failed)
  local exit_ind=""
  if [ $exit_code -ne 0 ]; then
    exit_ind="\\[\\e[38;5;${colors.red}m\\]x \\[\\e[0m\\]"
  fi

  # Git branch (if in git repo)
  local git_branch=""
  if command -v git &>/dev/null; then
    git_branch=$(git symbolic-ref --short HEAD 2>/dev/null)
    if [ -n "$git_branch" ]; then
      git_branch=" \\[\\e[38;5;${colors.magenta}m\\]($git_branch)\\[\\e[0m\\]"
    fi
  fi

  # Short path (last 2 components)
  local short_path="\${PWD##*/}"
  local parent="\${PWD%/*}"
  parent="\${parent##*/}"
  if [ "$parent" != "" ] && [ "$parent" != "$short_path" ]; then
    short_path="$parent/$short_path"
  fi

  # Mobile (<60 cols): ultra-compact
  # Desktop: full info with git branch
  if [ "$cols" -lt 60 ]; then
    PS1="\${exit_ind}\\[\\e[38;5;${colors.orange}m\\]$short_path\\[\\e[0m\\] \\[\\e[38;5;${colors.orange}m\\]>\\[\\e[0m\\] "
  else
    PS1="\${exit_ind}\\[\\e[38;5;${colors.muted}m\\][\\[\\e[38;5;${colors.green}m\\]$short_path\\[\\e[0m\\]\${git_branch}\\[\\e[38;5;${colors.muted}m\\]]\\[\\e[0m\\] \\[\\e[38;5;${colors.orange}m\\]>\\[\\e[0m\\] "
  fi
}

PROMPT_COMMAND="_247_prompt_command"`;

  const zshPromptConfig = `
# Adaptive prompt - compact on mobile, full on desktop
setopt PROMPT_SUBST

_247_precmd() {
  local exit_code=$?
  local cols=$COLUMNS

  # Exit indicator
  local exit_ind=""
  if [[ $exit_code -ne 0 ]]; then
    exit_ind="%F{${colors.red}}x %f"
  fi

  # Git branch
  local git_branch=""
  if command -v git &>/dev/null; then
    git_branch=$(git symbolic-ref --short HEAD 2>/dev/null)
    [[ -n "$git_branch" ]] && git_branch=" %F{${colors.magenta}}($git_branch)%f"
  fi

  # Mobile vs Desktop
  if (( cols < 60 )); then
    PROMPT="\${exit_ind}%F{${colors.orange}}%1~%f %F{${colors.orange}}>%f "
  else
    PROMPT="\${exit_ind}%F{${colors.muted}}[%F{${colors.green}}%2~%f\${git_branch}%F{${colors.muted}}]%f %F{${colors.orange}}>%f "
  fi
}

precmd_functions+=(_247_precmd)`;

  const historyConfig =
    shell === 'zsh'
      ? `
# History configuration (zsh)
HISTSIZE=50000
SAVEHIST=100000
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_SPACE
setopt SHARE_HISTORY
setopt EXTENDED_HISTORY`
      : `
# History configuration (bash)
export HISTSIZE=50000
export HISTFILESIZE=100000
export HISTCONTROL=ignoreboth:erasedups
export HISTIGNORE="ls:cd:pwd:exit:clear:history"
shopt -s histappend`;

  const aliases = `
# 247 Aliases
alias c='claude'
alias cc='claude --continue'
alias cr='claude --resume'

# Git shortcuts
alias gs='git status'
alias gd='git diff'
alias gl='git log --oneline -15'
alias gco='git checkout'

# Navigation & dev
alias ll='ls -lah'
alias ..='cd ..'
alias ...='cd ../..'`;

  // Issue plan injection - writes plan to .claude/current-task.md for Claude context
  const escapedIssueTitle = issueTitle ? escapeForBash(issueTitle) : '';
  const issuePlanSection = issuePlan
    ? `
# ═══════════════════════════════════════════════════════════════
# SECTION 6.5: Issue Plan Injection
# ═══════════════════════════════════════════════════════════════
mkdir -p .claude 2>/dev/null
cat > .claude/current-task.md << 'ISSUE_PLAN_EOF'
# Current Task

${issuePlan}
ISSUE_PLAN_EOF
printf "\\033[38;5;${colors.cyan}m[247] Issue plan written to .claude/current-task.md\\033[0m\\n"
`
    : '';

  // Animated rabbit chasing carrot loader function
  // Skip animation in CI/test environments for faster startup
  const loaderAnimation = `
# ═══════════════════════════════════════════════════════════════
# Animated Loader: Rabbit chasing carrot with progress bar
# ═══════════════════════════════════════════════════════════════

# ANSI color codes (using $'...' syntax for proper escape)
C_RESET=$'\\033[0m'
C_ORANGE=$'\\033[38;5;${colors.orange}m'
C_GREEN=$'\\033[38;5;${colors.green}m'
C_CYAN=$'\\033[38;5;${colors.cyan}m'
C_MUTED=$'\\033[38;5;${colors.muted}m'
C_WHITE=$'\\033[38;5;${colors.white}m'
C_BOLD=$'\\033[1m'
C_DIM=$'\\033[2m'

# Skip animation in CI/test environments (set by terminal.ts)
if [ -n "$_247_SKIP_ANIMATION" ]; then
  # Quick non-animated version for tests
  :  # No output, go straight to welcome message
else

# Hide cursor during animation
printf "\\033[?25l"

# Clear screen
clear

# Rabbit ASCII art frames (running animation)
# Frame 1: legs back    Frame 2: legs forward
#  /)/)                  /)/)
# ( . .)               ( . .)
# (")~(")>             (")(")<

# Animation: Rabbit running toward carrot
animate_chase() {
  local frame=0
  local rabbit_pos=0
  local carrot_pos=52

  for i in {1..30}; do
    rabbit_pos=$((i * 2 - 2))
    if [ $rabbit_pos -gt 44 ]; then rabbit_pos=44; fi

    carrot_pos=$((54 - i / 3))
    if [ $carrot_pos -lt $((rabbit_pos + 10)) ]; then carrot_pos=$((rabbit_pos + 10)); fi

    # Clear rabbit lines (3 lines for rabbit)
    printf "\\033[6;1H\\033[K"
    printf "\\033[7;1H\\033[K"
    printf "\\033[8;1H\\033[K"

    local gap=$((carrot_pos - rabbit_pos - 7))
    if [ $gap -lt 0 ]; then gap=0; fi

    # Draw rabbit with running animation
    printf "\\033[6;1H"
    printf "%*s" "$rabbit_pos" ""
    printf "\\033[38;5;${colors.white}m (\\\\/)/)\\033[0m"
    printf "%*s" "$gap" ""
    printf "\\033[38;5;${colors.green}m//\\033[0m\\n"

    printf "%*s" "$rabbit_pos" ""
    printf "\\033[38;5;${colors.white}m( \\033[38;5;${colors.cyan}m. .\\033[38;5;${colors.white}m)\\033[0m"
    printf "%*s" "$gap" ""
    printf "\\033[38;5;${colors.orange}m<\\033[38;5;${colors.green}m}}\\033[0m\\n"

    printf "%*s" "$rabbit_pos" ""
    if [ $((frame % 2)) -eq 0 ]; then
      printf "\\033[38;5;${colors.white}mc(\\033[38;5;${colors.muted}m\\"\\033[38;5;${colors.white}m)(\\033[38;5;${colors.muted}m\\"\\033[38;5;${colors.white}m)\\033[0m"
    else
      printf "\\033[38;5;${colors.white}mc(\\033[38;5;${colors.muted}m\\"\\033[38;5;${colors.white}m) (\\033[38;5;${colors.muted}m\\"\\033[38;5;${colors.white}m)\\033[0m"
    fi

    frame=$((frame + 1))
    sleep 0.07
  done

  # Final frame: rabbit eating carrot!
  printf "\\033[6;1H\\033[K"
  printf "\\033[7;1H\\033[K"
  printf "\\033[8;1H\\033[K"

  printf "\\033[6;1H"
  printf "%*s" "46" ""
  printf "\\033[38;5;${colors.white}m (\\\\/)/)\\033[0m\\n"
  printf "%*s" "46" ""
  printf "\\033[38;5;${colors.white}m( \\033[38;5;${colors.cyan}m^.^\\033[38;5;${colors.white}m)\\033[38;5;${colors.orange}m<\\033[38;5;${colors.green}m}}\\033[0m  \\033[38;5;${colors.green}m*munch*\\033[0m\\n"
  printf "%*s" "46" ""
  printf "\\033[38;5;${colors.white}mc(\\033[38;5;${colors.muted}m\\"\\033[38;5;${colors.white}m)(\\033[38;5;${colors.muted}m\\"\\033[38;5;${colors.white}m)\\033[0m"
}

# Progress bar animation
show_progress() {
  local steps=("Initializing tmux" "Loading config" "Setting up env" "Ready!")
  local total=\${#steps[@]}
  local bar_width=40

  for i in "\${!steps[@]}"; do
    local step=\${steps[$i]}
    local progress=$(( (i + 1) * 100 / total ))
    local filled=$(( progress * bar_width / 100 ))
    local empty=$(( bar_width - filled ))

    # Progress bar line
    printf "\\033[11;3H\\033[K"
    printf "  \\033[38;5;${colors.muted}m[\\033[0m"
    printf "\\033[38;5;${colors.orange}m%*s\\033[0m" "$filled" "" | tr ' ' '█'
    printf "\\033[38;5;${colors.muted}m%*s\\033[0m" "$empty" "" | tr ' ' '░'
    printf "\\033[38;5;${colors.muted}m]\\033[0m"
    printf " \\033[38;5;${colors.cyan}m%3d%%\\033[0m" "$progress"

    # Status line
    printf "\\033[12;3H\\033[K"
    printf "  \\033[38;5;${colors.muted}m%s\\033[0m" "$step"

    sleep 0.4
  done
}

# Main animation sequence
printf "\\n"
printf "\\033[2;1H"
printf "  \\033[38;5;${colors.orange}m\\033[1m    ____  _  _  ______ \\033[0m\\n"
printf "  \\033[38;5;${colors.orange}m\\033[1m   / __ \\\\| || ||____  |\\033[0m\\n"
printf "  \\033[38;5;${colors.orange}m\\033[1m  | |  | | || |_   / / \\033[0m\\n"
printf "  \\033[38;5;${colors.orange}m\\033[1m  | |  | |__   _| / /  \\033[0m\\n"
printf "  \\033[38;5;${colors.orange}m\\033[1m   \\\\___\\\\_\\\\  |_|/_/    \\033[0m\\n"
printf "\\n"

animate_chase &
CHASE_PID=$!

sleep 0.5
show_progress

wait $CHASE_PID 2>/dev/null

# Show cursor again
printf "\\033[?25h"

sleep 0.6
clear

fi  # End of animation conditional`;

  const welcomeMessage = issueTitle
    ? `
${loaderAnimation}

# Welcome message (with issue)
printf "\\n"
printf "  \${C_MUTED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${C_RESET}\\n"
printf "  \${C_ORANGE}\${C_BOLD}247\${C_RESET} \${C_MUTED}│\${C_RESET} \${C_GREEN}${escapedProject}\${C_RESET}\\n"
printf "  \${C_MUTED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${C_RESET}\\n"
printf "  \${C_MUTED}Session:\${C_RESET} \${C_CYAN}${escapedSession}\${C_RESET}\\n"
printf "  \${C_MUTED}Task:   \${C_RESET} \${C_GREEN}${escapedIssueTitle}\${C_RESET}\\n"
printf "  \${C_MUTED}Tips:   \${C_RESET} \${C_DIM}Type\${C_RESET} \${C_ORANGE}c\${C_RESET} \${C_DIM}to start Claude Code\${C_RESET}\\n"
printf "  \${C_MUTED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${C_RESET}\\n"
printf "\\n"`
    : `
${loaderAnimation}

# Welcome message
printf "\\n"
printf "  \${C_MUTED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${C_RESET}\\n"
printf "  \${C_ORANGE}\${C_BOLD}247\${C_RESET} \${C_MUTED}│\${C_RESET} \${C_GREEN}${escapedProject}\${C_RESET}\\n"
printf "  \${C_MUTED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${C_RESET}\\n"
printf "  \${C_MUTED}Session:\${C_RESET} \${C_CYAN}${escapedSession}\${C_RESET}\\n"
printf "  \${C_MUTED}Tips:   \${C_RESET} \${C_DIM}Type\${C_RESET} \${C_ORANGE}c\${C_RESET} \${C_DIM}to start Claude Code\${C_RESET}\\n"
printf "  \${C_MUTED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${C_RESET}\\n"
printf "\\n"`;

  const promptConfig = shell === 'zsh' ? zshPromptConfig : bashPromptConfig;

  return `#!/bin/bash
# 247 Terminal Init Script - Auto-generated
# Session: ${sessionName}
# Project: ${projectName}
# Shell: ${shell}
# Generated: ${new Date().toISOString()}

# ═══════════════════════════════════════════════════════════════
# SECTION 1: Environment Variables
# ═══════════════════════════════════════════════════════════════
export CLAUDE_TMUX_SESSION="${escapedSession}"
export CLAUDE_PROJECT="${escapedProject}"
export TERM="xterm-256color"
export COLORTERM="truecolor"
export LANG="\${LANG:-en_US.UTF-8}"
export LC_ALL="\${LC_ALL:-en_US.UTF-8}"
${customExports.length > 0 ? customExports.join('\n') : ''}

# ═══════════════════════════════════════════════════════════════
# SECTION 2: tmux Configuration
# ═══════════════════════════════════════════════════════════════
tmux set-option -t "${escapedSession}" history-limit 50000 2>/dev/null
tmux set-option -t "${escapedSession}" mouse on 2>/dev/null
tmux set-option -t "${escapedSession}" focus-events on 2>/dev/null
${tmuxStatusConfig}

# ═══════════════════════════════════════════════════════════════
# SECTION 3: History Configuration
# ═══════════════════════════════════════════════════════════════
${historyConfig}

# ═══════════════════════════════════════════════════════════════
# SECTION 4: Prompt Configuration
# ═══════════════════════════════════════════════════════════════
${promptConfig}

# ═══════════════════════════════════════════════════════════════
# SECTION 5: Useful Aliases
# ═══════════════════════════════════════════════════════════════
${aliases}
${issuePlanSection}
# ═══════════════════════════════════════════════════════════════
# SECTION 6: Welcome Message
# ═══════════════════════════════════════════════════════════════
${welcomeMessage}

# ═══════════════════════════════════════════════════════════════
# SECTION 7: Start Session
# ═══════════════════════════════════════════════════════════════
${
  planningPrompt
    ? `
# Planning mode - write prompt to file and start Claude with it
PLANNING_PROMPT_FILE="/tmp/247-planning-${escapedSession}.md"
cat > "$PLANNING_PROMPT_FILE" << 'PLANNING_PROMPT_EOF'
${planningPrompt}
PLANNING_PROMPT_EOF

printf "\\033[38;5;${colors.cyan}m[247] Starting Claude with planning prompt...\\033[0m\\n"
printf "\\n"

# Start Claude with the planning prompt content (passed as initial message)
claude "$(cat $PLANNING_PROMPT_FILE)"

# After Claude exits, start interactive shell
exec ${shell} -i
`
    : `exec ${shell} -i`
}
`;
}

/**
 * Escapes a string for safe use in bash double-quoted strings.
 */
function escapeForBash(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
}

/**
 * Writes the init script to a temporary file.
 * @returns The path to the created script file.
 */
export function writeInitScript(sessionName: string, content: string): string {
  const scriptPath = path.join(os.tmpdir(), `247-init-${sessionName}.sh`);
  fs.writeFileSync(scriptPath, content, { mode: 0o755 });
  return scriptPath;
}

/**
 * Removes the init script file.
 */
export function cleanupInitScript(sessionName: string): void {
  const scriptPath = path.join(os.tmpdir(), `247-init-${sessionName}.sh`);
  try {
    fs.unlinkSync(scriptPath);
  } catch {
    // Ignore errors (file might already be deleted)
  }
}

/**
 * Gets the path where an init script would be written.
 */
export function getInitScriptPath(sessionName: string): string {
  return path.join(os.tmpdir(), `247-init-${sessionName}.sh`);
}
