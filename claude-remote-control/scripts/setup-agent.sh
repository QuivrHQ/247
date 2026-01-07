#!/bin/bash
set -euo pipefail

echo "Setting up 247 Agent..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Install dependencies
cd "$PROJECT_ROOT"
pnpm install

# Build agent
cd "$PROJECT_ROOT/apps/agent"
pnpm build

# Create launchd plist for auto-start
PLIST_PATH="$HOME/Library/LaunchAgents/com.vibecompany.247.plist"

cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.vibecompany.247</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/node</string>
        <string>$PROJECT_ROOT/apps/agent/dist/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$PROJECT_ROOT/apps/agent</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/247-agent.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/247-agent.error.log</string>
</dict>
</plist>
EOF

echo "Agent setup complete!"
echo ""
echo "To start the agent service:"
echo "  launchctl load $PLIST_PATH"
echo ""
echo "To stop the agent service:"
echo "  launchctl unload $PLIST_PATH"
echo ""
echo "Logs are at:"
echo "  /tmp/247-agent.log"
echo "  /tmp/247-agent.error.log"
