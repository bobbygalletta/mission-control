#!/bin/bash
# Battery Alert Script
# If battery < 25%, sends Telegram message with current level
# Otherwise does nothing

BOT_TOKEN="8577289252:AAHPMZx6g0v5lf0ZLCbFDfUTsx-dOTgnJnc"
CHAT_ID="8212808444"

get_battery() {
    pmset -g batt | grep -oE '[0-9]+%' | tr -d '%'
}

get_charging() {
    pmset -g batt | grep -o 'AC Power\|Battery Power'
}

send_telegram() {
    local pct="$1"
    curl -s "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -d "chat_id=${CHAT_ID}" \
        -d "text=🔋 <b>Battery Low:</b> ${pct}%%0APlug in to charge!" \
        -d "parse_mode=HTML" > /dev/null 2>&1
}

main() {
    local pct=$(get_battery)
    local power=$(get_charging)
    
    # Only alert if on battery (not charging)
    if [[ "$power" == "AC Power" ]]; then
        exit 0
    fi
    
    # If battery is below 25%, send alert
    if [ "$pct" -lt 25 ]; then
        send_telegram "$pct"
    fi
}

main
