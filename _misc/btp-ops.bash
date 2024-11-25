#!/bin/bash

# get the first argument from the cmd line
doWhat=$1
# if not "stop" or "start" then exit
if [ "$doWhat" != "stop" ] && [ "$doWhat" != "start" ]; then
    echo "Usage: $0 [start|stop]"
    exit 1
fi

components=("ui" "srv" "router")

for component in "${components[@]}"; do
    cf ${doWhat} "btp-integration-${component}"
done