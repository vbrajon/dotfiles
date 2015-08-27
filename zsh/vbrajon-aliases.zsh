if [[ ! -a "/usr/bin/open" ]]
then
function open() {
   (nautilus $@ 1>&- 2>&- &)
}
fi

function a() {
  z $@
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
  z $@
  open .
}

function m() {
  z $@
  meteor
}

function p() {
  z $@
  (pstorm . 1>&- 2>&- &)
}

alias v=vim
alias vi=vim

PATH=$PATH:~/.go/bin
