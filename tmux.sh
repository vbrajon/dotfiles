#!/bin/sh

if ! tmux has-session -t yeah
then
  tmux new-session -d -s yeah
  tmux select-window -t yeah:1
  tmux split-window -h
  tmux split-window -v
  tmux send-keys 'htop' 'C-m'
fi
tmux attach-session -t yeah
