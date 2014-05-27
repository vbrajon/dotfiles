eval "$(fasd --init auto)"

ZSH=$HOME/.oh-my-zsh
ZSH_THEME="flazz"

DISABLE_AUTO_TITLE="true"
COMPLETION_WAITING_DOTS="true"
HIST_STAMPS="dd/mm/yyyy"

plugins=(git vim)

source $ZSH/oh-my-zsh.sh

export PATH=$HOME/bin:/usr/local/bin:$PATH

if [[ -n $SSH_CONNECTION ]]; then
  export EDITOR='vim'
else
  export EDITOR='mvim'
fi

