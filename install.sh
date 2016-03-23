#/bin/bash

cmd_exec() {
  command $@ > /dev/null 2>&1
  # if [[ $? -ne 0 ]]
  # then
  #   echo "=> Error running $@"
  #   exit $?
  # fi
}
cmd_exist() {
  command -v "$1" > /dev/null 2>&1
}
if ! (cmd_exist "git" && cmd_exist "curl")
then
  echo >&2 "You need git and curl to install vbrajon/dotfiles"
  exit 1
fi

echo "> Downloading dotfiles"
cmd_exec ls ~/.dotfiles || git clone git@github.com:vbrajon/dotfiles.git ~/.dotfiles

echo "> Downloading antigen.zsh"
cmd_exec ls ~/.antigen.zsh || curl -Ss -L https://raw.githubusercontent.com/zsh-users/antigen/master/antigen.zsh > ~/.antigen.zsh

echo "> Downloading Vundle.vim"
mkdir -p ~/.vim/tmp
mkdir -p ~/.vim/bundle
cmd_exec ls ~/.vim/bundle/Vundle.vim || git clone https://github.com/gmarik/Vundle.vim.git ~/.vim/bundle/Vundle.vim

echo "> Creating symlinks"
cmd_exec cmp ~/.dotfiles/git/.gitconfig ~/.gitconfig || ln -si ~/.dotfiles/git/.gitconfig ~/.gitconfig
cmd_exec cmp ~/.dotfiles/git/.gitexcludes ~/.gitexcludes || ln -si ~/.dotfiles/git/.gitexcludes ~/.gitexcludes
cmd_exec cmp ~/.dotfiles/tmux/.tmux.conf ~/.tmux.conf || ln -si ~/.dotfiles/tmux/.tmux.conf ~/.tmux.conf
cmd_exec cmp ~/.dotfiles/vim/.vimrc ~/.vimrc || ln -si ~/.dotfiles/vim/.vimrc ~/.vimrc
cmd_exec diff -rq ~/.dotfiles/zsh ~/.zsh || ln -si ~/.dotfiles/zsh ~/.zsh
cmd_exec cmp ~/.dotfiles/zsh/.zshrc ~/.zshrc || ln -si ~/.dotfiles/zsh/.zshrc ~/.zshrc

echo "> Update gitconfig"
read -e -p "Git name: (Valentin Brajon)" NAME
git config --global user.name ${NAME:-Valentin Brajon}
read -e -p "Git email: (vbrajon@gmail.com)" EMAIL
git config --global user.email ${EMAIL:-vbrajon@gmail.com}

echo "> Installing vim plugins"
vim +PluginInstall +qall

echo "> Installing zsh plugins + starting = Enjoy ♥"
zsh
