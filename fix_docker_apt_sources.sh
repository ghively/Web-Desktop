#!/bin/bash

echo "Attempting to fix duplicate Docker APT sources..."

# Define the problematic file
DUPLICATE_FILE="/etc/apt/sources.list.d/archive_uri-https_download_docker_com_linux_ubuntu-noble.list"

# Check if the duplicate file exists
if [ -f "$DUPLICATE_FILE" ]; then
    echo "Found duplicate APT source file: $DUPLICATE_FILE"
    echo "Removing $DUPLICATE_FILE..."
    sudo rm "$DUPLICATE_FILE"
    if [ $? -eq 0 ]; then
        echo "Successfully removed $DUPLICATE_FILE."
    else
        echo "Error: Failed to remove $DUPLICATE_FILE. Please check permissions."
        exit 1
    fi
else
    echo "Duplicate APT source file not found: $DUPLICATE_FILE. It might have been removed already or named differently."
fi

echo "Running sudo apt update to refresh package lists..."
sudo apt update

if [ $? -eq 0 ]; then
    echo "APT update completed successfully. The duplicate source warnings should now be resolved."
else
    echo "APT update encountered an error. Please review the output above."
    exit 1
fi

echo "Fix script finished."
