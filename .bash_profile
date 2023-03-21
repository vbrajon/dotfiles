#!/bin/bash

. ~/.bash_prompt
. ~/.bash_shortcuts
. ~/.extra
. ~/.z.sh
[[ -d "/usr/local" ]] && HOMEBREW_PREFIX="/usr/local"
[[ -d "/opt/homebrew" ]] && HOMEBREW_PREFIX="/opt/homebrew"
eval $($HOMEBREW_PREFIX/bin/brew shellenv)
PATH="$HOMEBREW_PREFIX/opt/coreutils/libexec/gnubin:$PATH:$HOMEBREW_PREFIX/opt/fzf/bin"
. $HOMEBREW_PREFIX/opt/fzf/shell/completion.bash
. $HOMEBREW_PREFIX/opt/fzf/shell/key-bindings.bash
. $HOMEBREW_PREFIX/etc/profile.d/bash_completion.sh
ssh_launch
tmux_launch
