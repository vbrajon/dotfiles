#
# /etc/bash.bashrc
#

##################################
### Initialize
##################################

# Shell is non-interactive. Be done now!
if [[ $- != *i* ]] ; then
    return
fi
# Resizable window
shopt -s checkwinsize
# Append history, don't overwrite it
shopt -s histappend
# Correct little typography error
shopt -s cdspell
# Allow accent
bind 'set convert-meta off'
# Try to enable the auto-completion.
[ -r /usr/share/bash-completion/bash_completion   ] && . /usr/share/bash-completion/bash_completion
# Try to enable the "Command not found" hook.
[ -r /usr/share/doc/pkgfile/command-not-found.bash ] && . /usr/share/doc/pkgfile/command-not-found.bash
# Default umask
umask 022

##################################
### Export
##################################

export PATH=${PATH}:/root/.gem/ruby/1.9.1/bin:/opt/android-sdk/platform-tools
# Choix de l'éditeur par défaut
export EDITOR=vim
# ne pas mettre en double dans l'historique les commandes tapées 2x
export HISTCONTROL=ignoredups
# lignes de l'historique par session bash
export HISTSIZE=10000
# lignes de l'historique conservées
export HISTFILESIZE=50000
# Ne pas garder les trucs inutiles dans les logs (attention peut casser certaines habitudes)
# export HISTIGNORE="cd:ls:[bf]g:clear"

##################################
### Colors
##################################
# Reset
NoColor='\e[0m'       # Text Reset

# Regular Colors
Black='\e[0;30m'        # Black
Red='\e[0;31m'          # Red
Green='\e[0;32m'        # Green
Yellow='\e[0;33m'       # Yellow
Blue='\e[0;34m'         # Blue
Purple='\e[0;35m'       # Purple
Cyan='\e[0;36m'         # Cyan
White='\e[0;37m'        # White

# Bold
BBlack='\e[1;30m'       # Black
BRed='\e[1;31m'         # Red
BGreen='\e[1;32m'       # Green
BYellow='\e[1;33m'      # Yellow
BBlue='\e[1;34m'        # Blue
BPurple='\e[1;35m'      # Purple
BCyan='\e[1;36m'        # Cyan
BWhite='\e[1;37m'       # White

# Underline
UBlack='\e[4;30m'       # Black
URed='\e[4;31m'         # Red
UGreen='\e[4;32m'       # Green
UYellow='\e[4;33m'      # Yellow
UBlue='\e[4;34m'        # Blue
UPurple='\e[4;35m'      # Purple
UCyan='\e[4;36m'        # Cyan
UWhite='\e[4;37m'       # White

# Background
On_Black='\e[40m'       # Black
On_Red='\e[41m'         # Red
On_Green='\e[42m'       # Green
On_Yellow='\e[43m'      # Yellow
On_Blue='\e[44m'        # Blue
On_Purple='\e[45m'      # Purple
On_Cyan='\e[46m'        # Cyan
On_White='\e[47m'       # White

# High Intensity
IBlack='\e[0;90m'       # Black
IRed='\e[0;91m'         # Red
IGreen='\e[0;92m'       # Green
IYellow='\e[0;93m'      # Yellow
IBlue='\e[0;94m'        # Blue
IPurple='\e[0;95m'      # Purple
ICyan='\e[0;96m'        # Cyan
IWhite='\e[0;97m'       # White

# Bold High Intensity
BIBlack='\e[1;90m'      # Black
BIRed='\e[1;91m'        # Red
BIGreen='\e[1;92m'      # Green
BIYellow='\e[1;93m'     # Yellow
BIBlue='\e[1;94m'       # Blue
BIPurple='\e[1;95m'     # Purple
BICyan='\e[1;96m'       # Cyan
BIWhite='\e[1;97m'      # White

# High Intensity backgrounds
On_IBlack='\e[0;100m'   # Black
On_IRed='\e[0;101m'     # Red
On_IGreen='\e[0;102m'   # Green
On_IYellow='\e[0;103m'  # Yellow
On_IBlue='\e[0;104m'    # Blue
On_IPurple='\e[10;95m'  # Purple
On_ICyan='\e[0;106m'    # Cyan
On_IWhite='\e[0;107m'   # White

use_color=false
# sanitize TERM:
safe_term=${TERM//[^[:alnum:]]/?}
color_exist=""

[[ -f /etc/bash.colors ]] && color_exist="${color_exist}$(</etc/bash.colors)"
[[ -z ${color_exist}    ]] \
    && type -P dircolors >/dev/null \
    && color_exist=$(dircolors --print-database)
[[ $'\n'${color_exist} == *$'\n'"TERM "${safe_term}* ]] && use_color=true

if ${use_color} ; then
    # Enable colors for ls, etc.  Prefer ~/.dir_colors #64489
    eval $(dircolors -b /etc/bash.colors)
    alias ls='ls --color=auto'
    alias dir='dir --color=auto'
    alias grep='grep --colour=auto'
fi

##################################
### Prompt
##################################

PROMPT_COMMAND='Return=$?;'
ReturnValue='$(echo $Return)'
ReturnSmiley='$(if [[ $Return = 0 ]]; then echo -ne "\[$Blue\];)\[$NoColor\]"; else echo -ne "\[$Red\];(\[$NoColor\]"; fi;)'

IpRegex='192\.168\.1\.([0-9]{1,3})'
Ip=`ip -o -4 address`;
if [[ $Ip =~ $IpRegex ]]; then
    IpNum=`expr 91 + ${BASH_REMATCH[1]} % 6`;
    IpColor=`echo "\e[0;$IpNum"m`;
fi

if [ $(whoami) == 'root' ]; then
    Time="|"
    User="\[$Red\]\u\[$NoColor\]"
    Path="\[$Yellow\]\w\[$NoColor\]" # Partial Path
    LastChar=#
else
    Time="\[$Blue\][\t]\[$NoColor\]"
    User="\[$White\]\u\[$NoColor\]"
    Path="\[$Yellow\]\W\[$NoColor\]" # Full Path
    LastChar=\$
fi
Host="\[$IpColor\]\h\[$NoColor\]"

PS1="$ReturnSmiley$Time$User@$Host:$Path$LastChar "
PS2='> '
PS3='> '
PS4='+ '

##################################
### Functions
##################################

bkp()
{
    cp -R $1{,.bkp}
}
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

##################################
### Aliases
##################################

alias c='var=$(cal -m); echo "${var/$(date +%-d)/$(echo -e "\033[1;31m$(date +%-d)\033[0m")}"'
alias net='netstat -tlnp'
alias lsusers='cat /etc/passwd | cut -d: -f1'
alias lsgroups='cat /etc/group | cut -d: -f1'

alias ll='ls -lh'
alias la='ls -lha'
alias ..='cd ..'

alias p='packer --noedit --noconfirm'
alias pac='sudo pacman'
alias paclist="sudo pacman -Qi | awk '/^Nom/ {pkg=$3} /Taille/ {print $4$5,pkg}' | sort -n"
alias pkglist='expac -s "%-30n" > pkglist'

# Try to keep environment pollution down, EPA loves us.
unset use_color safe_term color_exist
