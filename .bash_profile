#!/bin/bash

. ~/.bash_prompt
. ~/.bash_shortcuts
. ~/.extra
. ~/.z.sh
eval $(/opt/homebrew/bin/brew shellenv)
PATH="/opt/homebrew/opt/coreutils/libexec/gnubin:$PATH:/opt/homebrew/opt/fzf/bin"
. /opt/homebrew/opt/fzf/shell/completion.bash
. /opt/homebrew/opt/fzf/shell/key-bindings.bash
. /opt/homebrew/etc/profile.d/bash_completion.sh
ssh_launch
tmux_launch
