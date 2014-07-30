#!/bin/bash

SCRIPT=$(readlink -f $0)
SCRIPTPATH=`dirname $SCRIPT`

# --force rm
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

