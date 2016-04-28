# dotfiles
> command line productivity tools

Install > `bash <(curl -L https://raw.githubusercontent.com/vbrajon/dotfiles/master/install.sh)`

## Useful commands

- Change shell > `chsh /bin/zsh $USER`
- Update gitconfig > `gitconfig --global -e`
- Install vim plugins > `vim +PluginInstall +qall`
- Update dotfiles, same as install or > `dotfiles`

## Note

- The first time you run zsh, antigen will clone bundles.
- The first time you do cd, z will prompt a folder creation error.
