export PATH=$HOME/bin:/usr/local/bin:$PATH 
eval "$(fasd --init auto)"

source ~/.zsh/antigen.zsh
source ~/.zsh/pure.zsh

antigen use oh-my-zsh
antigen bundle command-not-found
antigen bundle git
antigen bundle zsh-users/zsh-syntax-highlighting
antigen bundle zsh-users/zsh-history-substring-search
#antigen bundle swirepe/alwaysontop
antigen apply

