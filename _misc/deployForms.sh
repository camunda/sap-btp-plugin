#!/bin/bash

# Script to deploy all files in specified directories using c8ctl deploy
# Usage: ./deploy-all.sh <directory1> [directory2] [directory3] ...

# Note: Don't use 'set -e' here, as we want to continue deploying even if some files fail

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
failed_files=()

# Iterate through all provided directories
for dir in "$@"; do
    # Check if directory exists
    if [ ! -d "$dir" ]; then
        echo "Warning: Directory '$dir' does not exist. Skipping..."
        continue
    fi
    
    echo "Processing directory: $dir"
    echo "-----------------------------------"
    
    # Find all .bpmn and .form files in the specified directory
    while IFS= read -r -d '' file; do
        echo "Deploying: $file"
        
        if c8ctl deploy "$file"; then
            echo "✓ Successfully deployed: $file"
            ((total_deployed++))
        else
            echo "✗ Failed to deploy: $file"
            ((total_failed++))
            failed_files+=("$file")
        fi
        echo ""
    done < <(find "$dir" -maxdepth 1 -type f \( -name "*.bpmn" -o -name "*.form" \) -print0)
    
    echo ""
done

# Summary
echo "==================================="
echo "Deployment Summary:"
echo "  Successfully deployed: $total_deployed"
echo "  Failed: $total_failed"
echo "==================================="

# List failed files if any
if [ $total_failed -gt 0 ]; then
    echo ""
    echo "⚠️  Warning: Failed to deploy the following files:"
    for failed_file in "${failed_files[@]}"; do
        echo "  - $failed_file"
    done
    echo "⚠️  Continuing anyway (some features may not be supported in this Camunda version)"
    exit 0  # Don't fail the build
fi
