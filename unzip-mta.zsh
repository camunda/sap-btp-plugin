#!/bin/zsh

cd mta_archives
unzip *.mtar
find . -name "*.zip" | while read filename; do 
    unzip -o -d "`dirname "$filename"`" "$filename"; 
done;