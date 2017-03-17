silent() {
  eval "$@" >/dev/null 2>&1
  return $?
}

if ! silent command -v open
then
  # echo "no open, use nautilus"
  open() {
    silent nautilus $@ &
  }
fi

if silent command -v hub
then
  alias git=hub
fi

# zz [cmd] [path] [args]
# If path is not an existing file then execute "z path"
# Then execute "cmd args"
zz() {
  cmd=$1
  shift
  if ! [ -e "$1" ] && ! [[ $# -eq 0 ]]
  then
    zpath=$1
    shift
    echo "z $zpath"
    silent z $zpath
  fi
  echo "$cmd ${@:-.}"
  eval "$cmd ${@:-.}"
}

# t
# If already in a tmux session, do nothing
# Else create if needed a "yeah" session and join
t() {
  [ ! -z "$TMUX" ] && return
  if ! silent tmux has-session -t yeah
  then
    tmux new-session -d -s yeah
    tmux select-window -t 1
    tmux split-window -h
    tmux split-window -v
    tmux send-keys -t 1.2 'tmux clock-mode' Enter
    tmux send-keys -t 1.3 'htop' Enter
    tmux resize-pane -t 1.2 -U 1000
    tmux resize-pane -t 1.2 -R 1000
    tmux resize-pane -t 1.2 -L 50
    tmux resize-pane -t 1.2 -D 8
    tmux select-pane -t 1.1
    tmux split-window -v
    tmux select-pane -t 1.1
  fi
  tmux attach-session -t yeah
}
# Run tmux
t

h() {
  if [[ $# -eq 0 ]]
  then
    history | awk '{CMD[$2]++;count++;}END { for (a in CMD)print CMD[a] " " CMD[a]/count*100 "% " a;}' | grep -v "./" | column -c3 -s " " -t | sort -nr | nl |  head -n10
  else
    history | grep $@
  fi
}

myip() {
  ifconfig en0 | awk '$1 == "inet" {print $2}'
  dig +short myip.opendns.com @resolver1.opendns.com
}

server() {
  re='^[0-9]+$'
  [[ $1 =~ $re ]] && port=$1 || port=8000
  if [ "$port" -gt 1024 ]
  then
    python -m SimpleHTTPServer $port
  else
    sudo python -m SimpleHTTPServer $port
  fi
}

extract () {
if [ -f $1 ]
then
  case $1 in
    *.tar.bz2) tar xvjf $1 && cd $(echo $1 | sed 's/.tar.bz2//') ;;
    *.tar.gz)  tar xvzf $1 && cd $(echo $1 | sed 's/.tar.gz//') ;;
    *.bz2)     bunzip2 $1 && cd $(echo $1 | sed 's/.bz2//') ;;
    *.rar)     unrar x $1 && cd $(echo $1 | sed 's/.rar//') ;;
    *.gz)      gunzip $1 && cd $(echo $1 | sed 's/.gz//') ;;
    *.tar)     tar xvf $1 && cd $(echo $1 | sed 's/.tar//') ;;
    *.tbz2)    tar xvjf $1 && cd $(echo $1 | sed 's/.tbz2//') ;;
    *.tgz)     tar xvzf $1 && cd $(echo $1 | sed 's/.tgz//') ;;
    *.zip)     unzip $1 && cd $(echo $1 | sed 's/.zip//') ;;
    *.Z)       uncompress $1 && cd $(echo $1 | sed 's/.Z//') ;;
    *.7z)      7z x $1 && cd $(echo $1 | sed 's/.7z//') ;;
    *)         echo "don't know how to extract '$1'..." ;;
  esac
else
  echo "'$1' is not a valid file!"
fi
}

alias g=git
alias v=vim
alias vi=vim
alias a='zz "atom -a"'
alias o='zz open'
alias m='zz meteor'
alias s='zz server'
alias dotfiles='bash <(curl -L https://raw.githubusercontent.com/vbrajon/dotfiles/master/install.sh)'
