#!/bin/bash

# cd current

# --force rm
rm ~/.gitconfig
rm ~/.gitexcludes
rm ~/.tmux.conf
rm ~/.vimrc
rm -Rf ~/.zsh/
rm ~/.zshrc

ln -s gitconfig ~/.gitconfig
ln -s gitexcludes ~/.gitexcludes
ln -s tmux.conf ~/.tmux.conf
ln -s vimrc ~/.vimrc
ln -s zsh ~/.zsh/
ln -s zshrc ~/.zshrc
