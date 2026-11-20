#!/bin/sh
# Installs a launchd agent that runs scripts/relay.sh at 07.40 and 19.40 every day.
# A Mac that is asleep at that time runs it on wake.
#   sh scripts/relay-install.sh            install or update
#   sh scripts/relay-install.sh --remove   uninstall
set -eu
LABEL=lv.iziet.relay
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/iziet-relay.log"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="gui/$(id -u)"

launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
if [ "${1:-}" = "--remove" ]; then
	rm -f "$PLIST"
	echo "Relay schedule removed."
	exit 0
fi

TOOLS_PATH="$(dirname "$(command -v node)"):$(dirname "$(command -v gh)"):/usr/bin:/bin"
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key><string>$LABEL</string>
	<key>ProgramArguments</key>
	<array><string>/bin/sh</string><string>$REPO/scripts/relay.sh</string></array>
	<key>EnvironmentVariables</key>
	<dict><key>PATH</key><string>$TOOLS_PATH</string></dict>
	<key>StartCalendarInterval</key>
	<array>
		<dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>40</integer></dict>
		<dict><key>Hour</key><integer>19</integer><key>Minute</key><integer>40</integer></dict>
	</array>
	<key>StandardOutPath</key><string>$LOG</string>
	<key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST
launchctl bootstrap "$DOMAIN" "$PLIST"
echo "Relay runs at 07.40 and 19.40. Log: $LOG"
