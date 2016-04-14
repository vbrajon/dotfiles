source ~/.antigen.zsh

antigen use oh-my-zsh
antigen bundle command-not-found
antigen bundle extract
## antigen bundle tmux
## antigen bundle vi-mode
# antigen bundle docker
# antigen bundle docker-compose
# antigen bundle go
# antigen bundle heroku
# antigen bundle meteor
# antigen bundle npm
# antigen bundle nvm
# antigen bundle pip

antigen bundle mafredri/zsh-async
antigen bundle sindresorhus/pure
antigen bundle zsh-users/zsh-completions
antigen bundle zsh-users/zsh-history-substring-search
antigen bundle zsh-users/zsh-syntax-highlighting
antigen bundle zsh-users/zsh-autosuggestions
antigen bundle rupa/z

for f in ~/.zsh/vbrajon-*.zsh
do
  source $f
done
