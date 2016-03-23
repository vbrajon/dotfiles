export GOPATH=~/.go
export PATH=$PATH:~/.go/bin
export NVM_DIR=~/.nvm
source $(brew --prefix nvm)/nvm.sh

export PURE_CMD_MAX_EXEC_TIME=1
export PROMPT="%(?.%F{green}.%F{red})${PURE_PROMPT_SYMBOL:-❯}%f "

cmd_exist() {
  type "$1" > /dev/null 2>&1
}
alias v=vim
alias vi=vim
alias git='cmd_exist hub && hub || git'
alias g=git
