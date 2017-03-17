[[ -f /usr/local/opt/nvm.sh ]] && source /usr/local/opt/nvm.sh
[[ -f /usr/share/nvm/init-nvm.sh ]] && source /usr/share/nvm/init-nvm.sh

export GOPATH=~/.go
export PATH=$PATH:/usr/local/sbin:~/.go/bin

export PURE_CMD_MAX_EXEC_TIME=1
export PROMPT="%(?.%F{green}.%F{red})${PURE_PROMPT_SYMBOL:-❯}%f "
export ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE="fg=3"
