function silent() {
  eval "$@" >/dev/null 2>&1
  return $?
}

if ! silent command -v open
then
  # echo "no open, use nautilus"
  function open() {
    silent nautilus $@ &
  }
fi

if silent command -v hub
then
  alias git=hub
fi

# zz cmd [arguments]
# If the first argument is an existing file
# Then execute "cmd arguments"
# Else move "z arguments" and execute "cmd ."
function zz {
  cmd=$1
  shift
  if [ -e "$1" ]
  then
    # echo "no z, exec $cmd $@"
    eval "$cmd $@"
  else
    # echo "z, exec z $@ then $cmd"
    silent z $@
    eval "$cmd ."
  fi
}


# t
# If already in a tmux session, do nothing
# Else create if needed a "yeah" session and join
function t() {
  [ ! -z "$TMUX" ] && return
  if ! silent tmux has-session -t yeah
  then
    tmux new-session -d -s yeah
    tmux select-window -t 1
    tmux split-window -h
    tmux split-window -v
    tmux select-pane -t 1.2
    tmux select-pane -t 1.1
    tmux send-keys -t 1.2 'tmux clock-mode' Enter
    tmux send-keys -t 1.3 'htop' Enter
  fi
  tmux attach-session -t yeah
}
# Run tmux
t

alias g=git
alias v=vim
alias vi=vim
alias a='zz atom'
alias o='zz open'
alias m='zz meteor'
alias dotfiles='curl -L https://raw.githubusercontent.com/vbrajon/dotfiles/master/install.sh | bash'
