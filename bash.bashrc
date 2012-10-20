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
# Global extensions (needed for extract)
shopt -s extglob
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

#export PATH=${PATH}:/root/.gem/ruby/1.9.1/bin:/opt/android-sdk/platform-tools
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export EDITOR=vim
export HISTCONTROL=ignoredups
export HISTSIZE=10000
export HISTFILESIZE=50000
export HISTIGNORE="cd:..:ls:ll:la:clear:history"
# Set terminal title with the last command

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

##################################
### Prompt
##################################

ReturnValue='$(echo $Return)'
ReturnSmiley='$(if [[ $Return = 0 ]]; then echo -ne "\[$Blue\];)\[$NoColor\]"; else echo -ne "\[$Red\];(\[$NoColor\]"; fi;)'

IpLast=`ip -o -4 address | grep -o '192.168.[0-9]\{1,3\}.[0-9]\{1,3\}' | head -n 1 | sed -e 's/192\.168\.[0-9]\{1,3\}\.\([0-9]\)/\1/'`
IpNum=`expr 91 + $IpLast % 6`
IpColor=`echo "\e[0;$IpNum"m`;

if [ $(whoami) == 'root' ]; then
    Time="|"
    History="\[$Red\][\!]\[$NoColor\]"
    User="\[$Red\]\u\[$NoColor\]"
    Path="\[$Yellow\]\w\[$NoColor\]" # Partial Path
    LastChar=#
else
    Time="\[$Blue\][\t]\[$NoColor\]"
    History="\[$Red\][\!]\[$NoColor\]"
    User="\[$White\]\u\[$NoColor\]"
    Path="\[$Yellow\]\W\[$NoColor\]" # Full Path
    LastChar=\$
fi
Host="\[$IpColor\]\h\[$NoColor\]"
GitPath=`git branch --no-color 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/(\1)/'`

PS1="$ReturnSmiley$History$Time$User@$Host:$Path$GitPath$LastChar "
PS2='> '
PS3='> '
PS4='+ '

TTY=`tty | sed -e "s/\/dev\/\(.*\)/\1/"`
Title="$(whoami)@$HOSTNAME | $(date "+%A %d %B %Y") | $HOSTTYPE | $TTY[$SHLVL]"
if [[ $TTY =~ tty ]]; then
    Prompt="\t\t\t\t\t$Title\n"
else
    Prompt="\e]2;$Title\e\\"
fi

PROMPT_COMMAND='Return=$?;echo -en $Prompt;';

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
pass()
{
    pass=`echo -n $1 | md5sum | cut -c 1-8`;
    gpaste add $pass;
    echo "Password for $1 saved : $pass";
}
extract() {
    local c e i

    (($#)) || return

    for i; do
        c=''
        e=1

        if [[ ! -r $i ]]; then
            echo "$0: file is unreadable: \`$i'" >&2
            continue
        fi

        case $i in
        *.t@(gz|lz|xz|b@(2|z?(2))|a@(z|r?(.@(Z|bz?(2)|gz|lzma|xz)))))
               c='bsdtar xvf';;
        *.7z)  c='7z x';;
        *.Z)   c='uncompress';;
        *.bz2) c='bunzip2';;
        *.exe) c='cabextract';;
        *.gz)  c='gunzip';;
        *.rar) c='unrar x';;
        *.xz)  c='unxz';;
        *.zip) c='unzip';;
        *)     echo "$0: unrecognized file extension: \`$i'" >&2
               continue;;
        esac

        command $c "$i"
        e=$?
    done

    return $e
}

##################################
### Aliases
##################################

# Enable colors for ls, etc.  Prefer ~/.dir_colors #64489
eval $(dircolors -b /etc/bash.colors)
alias ls='ls --color=auto'
alias dir='dir --color=auto'
alias grep='grep --colour=auto'
alias diff='colordiff'

# History
alias h='history | grep $1'
alias hc='mv -i ~/.bash_history ~/.bash_history_$(date "+%Y%m%d")'
alias hh='history | head'
alias ht='history | tail'

# Navigation
alias ..="cd .."
alias ...="cd ../.."
alias ....="cd ../../.."
alias .....="cd ../../../.."
alias ~="cd ~" # `cd` is probably faster to type though
alias -- -="cd -"

# Shortcuts
alias d="cd ~/Dev"
alias dl="cd ~/Downloads"
alias dt="cd ~/Desktop"
alias d1='du --max-depth=1'
alias g="git"
alias j="jobs"
alias v="vim"
alias s="subl ."
alias net='netstat -tlnp'
alias lsd='ls -l ${colorflag} | grep "^d"'
alias ip="curl ifconfig.me"

# Custom functions
alias c='var=$(cal -m); echo "${var/$(date +%-d)/$(echo -e "\033[1;31m$(date +%-d)\033[0m")}"'
alias da='date "+%A %d %B %Y [%T]"'
alias lsgroups='cat /etc/group | cut -d: -f1'
alias lsusers='cat /etc/passwd | cut -d: -f1'
alias xdebug='export XDEBUG_CONFIG="idekey=netbeans-xdebug"''

# Overwrite aliases
alias df='df -h'
alias du='du -c -h'
alias la='ls -lha'
alias ll='ls -lh'
alias mkdir='mkdir -p -v'
alias more='less'
alias ping='ping -c 5'

# Package management (Pacman+Packer)
alias p='packer --noedit --noconfirm'
alias pac='sudo pacman'
alias paclist='sudo pacman -Qi | awk '\''/^Nom/ {pkg=} /Taille/ {print ,pkg}'\'' | sort -n'
alias pkglist='expac -s "%-30n" > pkglist'
