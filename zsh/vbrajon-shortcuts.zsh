if [[ ! -a "/usr/bin/open" ]]
then
function open() {
   (nautilus $@ 1>&- 2>&- &)
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
  move $@
  open .
}

function m() {
  move $@
  meteor
}
