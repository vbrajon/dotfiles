#/bin/bash

# Z
mkdir -p ~/.z
curl https://raw.githubusercontent.com/rupa/z/master/z.sh > ~/.z.sh

# Vim
mkdir -p ~/.vim/tmp
mkdir -p ~/.vim/bundle
git clone https://github.com/gmarik/Vundle.vim.git ~/.vim/bundle/Vundle.vim

