#!/bin/bash

source ~/.bash_prompt
source ~/.bash_shortcuts
source ~/.extra
_Z_NO_PROMPT_COMMAND=0 && source /usr/local/etc/profile.d/z.sh
[[ ! "$PATH" == */usr/local/opt/fzf/bin* ]] && PATH="${PATH:+${PATH}:}/usr/local/opt/fzf/bin"
source /usr/local/opt/fzf/shell/completion.bash
source /usr/local/opt/fzf/shell/key-bindings.bash
source $(pkg-config --variable=prefix bash-completion)/share/bash-completion/bash_completion
ssh_launch
tmux_launch
