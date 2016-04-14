if [[ ! -a "/usr/bin/open" ]]
then
function open() {
  silent nautilus $@ &
}
fi

function move() {
  if [ ! -z "$1" ]
  then
    z $@
  fi
}

function a() {
  move $@
  atom .
}

function t() {
  if ! tmux has-session -t yeah
  then
    tmux new-session -d -s yeah
    tmux select-window -t yeah:1
    tmux split-window -h
    tmux split-window -v
    tmux send-keys 'htop' 'C-m'
  fi
  tmux attach-session -t yeah
}

function o() {
  if [ -e "$1" ]
  then
    open $1
  else
    move $@
    open .
  fi
}

function m() {
  move $@
  meteor
}
