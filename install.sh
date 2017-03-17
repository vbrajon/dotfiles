#/bin/bash

silent() {
  eval "$@" >/dev/null 2>&1
  return $?
}
check() {
  silent command -v $@ && return
  echo "You need to install $@"
  exit 1
}
pull() {
  if [ -d "$2" ]
  then
    cd $2
    git pull
    cd -
  else
    git clone $1 $2
  fi
}
check curl
check git
check tmux
check vim
check zsh

echo "Please backup any important config (.vim, .zsh, .tmux.conf ...) !"
read -e -p "Confirm (y/n) ? " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]
then
  exit 1
fi

echo "> Downloading dotfiles"
pull https://github.com/vbrajon/dotfiles.git ~/.dotfiles

echo "> Downloading antigen.zsh"
curl -Ss -L https://raw.githubusercontent.com/zsh-users/antigen/master/bin/antigen.zsh > ~/.antigen.zsh

echo "> Downloading Vundle.vim"
mkdir -p ~/.vim/tmp
mkdir -p ~/.vim/bundle
pull https://github.com/gmarik/Vundle.vim.git ~/.vim/bundle/Vundle.vim

echo "> Creating symlinks"
ln -sf ~/.dotfiles/.editorconfig ~/.editorconfig
ln -sf ~/.dotfiles/git/.gitconfig ~/.gitconfig
ln -sf ~/.dotfiles/git/.gitexcludes ~/.gitexcludes
ln -sf ~/.dotfiles/tmux/.tmux.conf ~/.tmux.conf
ln -sf ~/.dotfiles/vim/.vimrc ~/.vimrc
ln -sfn ~/.dotfiles/zsh ~/.zsh
ln -sf ~/.dotfiles/zsh/.zshrc ~/.zshrc

echo "> Updating gitconfig"
NAME=$(git config --global user.name)
read -e -p "Git name: ($NAME) " NAME
git config --global user.name $NAME
EMAIL=$(git config --global user.email)
read -e -p "Git email: ($EMAIL) " EMAIL
git config --global user.email $EMAIL

echo "> Installing vim plugins"
vim +PluginInstall +qall

echo "> Installing zsh plugins + starting - Enjoy ♥"
zsh
