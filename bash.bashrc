#
# /etc/bash.bashrc
#

# If not running interactively, don't do anything
[[ $- != *i* ]] && return

# ne pas mettre en double dans l'historique les commandes tapées 2x
export HISTCONTROL=ignoredups
# lignes de l'historique par session bash
export HISTSIZE=10000
# lignes de l'historique conservées
export HISTFILESIZE=50000
# Ne pas garder les trucs inutiles dans les logs (attention peut casser certaines habitudes)
# export HISTIGNORE="cd:ls:[bf]g:clear"
# supporte des terminaux redimensionnables (xterm et screen -r)
shopt -s checkwinsize
# correction automatique des petites typos
shopt -s cdspell

umask 022

#PS1='[\u@\h \W]\$ '
if [ $(whoami) == 'root' ]; then
    PS1="\[\e[01;31m\]\u@\h\[\e[00m\]:\[\e[01;34m\]\W\[\e[00m\]\$ "
else
    PS1="\[\e[01;30m\][\t] \[\e[01;32m\]\u@\h\[\e[00m\]:\[\e[01;34m\]\w\[\e[00m\]\$ "
fi
PS2='> '
PS3='> '
PS4='+ '

case ${TERM} in
  xterm*|rxvt*|Eterm|aterm|kterm|gnome*)
    PROMPT_COMMAND=${PROMPT_COMMAND:+$PROMPT_COMMAND; }'printf "\033]0;%s@%s:%s\007" "${USER}" "${HOSTNAME%%.*}" "${PWD/#$HOME/~}"'
                                                        
    ;;
  screen)
    PROMPT_COMMAND=${PROMPT_COMMAND:+$PROMPT_COMMAND; }'printf "\033_%s@%s:%s\033\\" "${USER}" "${HOSTNAME%%.*}" "${PWD/#$HOME/~}"'
    ;;
esac

[ -r /etc/bash_completion   ] && . /etc/bash_completion

# Choix de l'éditeur par défaut
export EDITOR=vim

export PATH=${PATH}:/root/.gem/ruby/1.9.1/bin:/opt/android-sdk/platform-tools

# Caractères accentués dans le shell
bind 'set convert-meta off'

## Fonctions ##
bak()
{
    cp $1{,.bak}
}
h()
{
    history | grep $1
}

## Aliases ##
alias c='var=$(cal -m); echo "${var/$(date +%-d)/$(echo -e "\033[1;31m$(date +%-d)\033[0m")}"'
alias net='netstat -tlnp'

# utilisation des couleurs pour certaines commandes
eval "`dircolors -b`"
alias ls='ls --color=auto'
alias grep='grep --color=auto'

# -o : affiche les flags, pratique pour détecter les uchg (cf chflags(1))
alias ll='ls -lh'
alias la='ls -lha'
alias ..='cd ..'

alias p='packer --noedit --noconfirm'
alias pac='sudo pacman'
alias paclist="sudo pacman -Qi | awk '/^Nom/ {pkg=$3} /Taille/ {print $4$5,pkg}' | sort -n"
alias pkglist='expac -s "%-30n" > pkglist'

wiki()
{
    dig +short txt $1.wp.dg.cx
}
delay() # delay "You can simulate on-screen typing just like in the movies"
{
    echo $1 | pv -qL 5
}
h()
{
    history | grep $1
}
pass()
{
    pass=`echo -n $1 | md5sum | cut -c 1-8`;
    gpaste add $pass;
    echo "Password for $1 saved : $pass";
}
