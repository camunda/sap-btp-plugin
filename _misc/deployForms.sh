#!/bin/bash

# Script to deploy all files in specified directories using c8ctl deploy
# Usage: ./deploy-all.sh <directory1> [directory2] [directory3] ...

set -e

# Check if at least one directory is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <directory1> [directory2] [directory3] ..."
    echo "Example: $0 ./forms ./configs"
    exit 1
fi

# Check if c8ctl is available
if ! command -v c8ctl &> /dev/null; then
    echo "Error: c8ctl command not found. Please install @camunda8/cli first."
    exit 1
fi

total_deployed=0
total_failed=0

# Iterate through all provided directories
for dir in "$@"; do
    # Check if directory exists
    if [ ! -d "$dir" ]; then
        echo "Warning: Directory '$dir' does not exist. Skipping..."
        continue
    fi
    
    echo "Processing directory: $dir"
    echo "-----------------------------------"
    
    # Find all files (not directories) in the specified directory
    while IFS= read -r -d '' file; do
        echo "Deploying: $file"
        
        if c8ctl deploy "$file"; then
            echo "✓ Successfully deployed: $file"
            ((total_deployed++))
        else
            echo "✗ Failed to deploy: $file"
            ((total_failed++))
        fi
        echo ""
    done < <(find "$dir" -maxdepth 1 -type f -print0)
    
    echo ""
done

# Summary
echo "==================================="
echo "Deployment Summary:"
echo "  Successfully deployed: $total_deployed"
echo "  Failed: $total_failed"
echo "==================================="

if [ $total_failed -gt 0 ]; then
    exit 1
fi
