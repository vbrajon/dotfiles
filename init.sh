#/bin/bash

# Z
ls ~/.z.sh || (curl https://raw.githubusercontent.com/rupa/z/master/z.sh > ~/.z.sh)

# Vim
mkdir -p ~/.vim/tmp
mkdir -p ~/.vim/bundle
ls ~/.vim/bundle/Vundle.vim || git clone https://github.com/gmarik/Vundle.vim.git ~/.vim/bundle/Vundle.vim
(vim +PluginInstall +qall 1>&- 2>&- &)

rm ~/.gitconfig
rm ~/.gitexcludes
rm ~/.tmux.conf
rm ~/.vimrc
rm ~/.zsh
rm ~/.zshrc

ln -s .dotfiles/gitconfig ~/.gitconfig
ln -s .dotfiles/gitexcludes ~/.gitexcludes
ln -s .dotfiles/tmux.conf ~/.tmux.conf
ln -s .dotfiles/vimrc ~/.vimrc
ln -s .dotfiles/zsh ~/.zsh
ln -s .dotfiles/zshrc ~/.zshrc
