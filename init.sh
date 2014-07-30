#/bin/bash

# Z
ls ~/.z.sh || (curl https://raw.githubusercontent.com/rupa/z/master/z.sh > ~/.z.sh)

# Vim
mkdir -p ~/.vim/tmp
mkdir -p ~/.vim/bundle
ls ~/.vim/bundle/Vundle.vim || git clone https://github.com/gmarik/Vundle.vim.git ~/.vim/bundle/Vundle.vim

# Symlinks
SCRIPT=$(readlink -f $0)
SCRIPTPATH=`dirname $SCRIPT`

rm ~/.atom/config.cson
rm ~/.atom/keymap.cson
rm ~/.gitconfig
rm ~/.gitexcludes
rm ~/.tmux.conf
rm ~/.vimrc
rm ~/.zsh
rm ~/.zshrc

ln -s $SCRIPTPATH/atom/config.cson ~/.atom/config.cson
ln -s $SCRIPTPATH/atom/keymap.cson ~/.atom/keymap.cson
ln -s $SCRIPTPATH/gitconfig ~/.gitconfig
ln -s $SCRIPTPATH/gitexcludes ~/.gitexcludes
ln -s $SCRIPTPATH/tmux.conf ~/.tmux.conf
ln -s $SCRIPTPATH/vimrc ~/.vimrc
ln -s $SCRIPTPATH/zsh ~/.zsh
ln -s $SCRIPTPATH/zshrc ~/.zshrc

