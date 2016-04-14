export GOPATH=~/.go
export PATH=$PATH:/usr/local/sbin:~/.go/bin
export NVM_DIR=~/.nvm
source $(brew --prefix nvm)/nvm.sh

export PURE_CMD_MAX_EXEC_TIME=1
export PROMPT="%(?.%F{green}.%F{red})${PURE_PROMPT_SYMBOL:-❯}%f "
export ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE="fg=3"

function silent() {
  eval "$@" >/dev/null 2>&1
  return $?
}
if silent command hub
then
  alias git=hub
fi
alias g=git
alias v=vim
alias vi=vim
