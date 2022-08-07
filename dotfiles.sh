log() { echo -e $yellow$@$reset; }

which brew &>/dev/null || {
  log "> Install Package Manager"
  /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
  xcode-select --install
}

ls ~/.dotfiles &>/dev/null || {
  log "> Install Dotfiles"
  git clone https://github.com/vbrajon/dotfiles.git ~/.dotfiles
  for f in $(ls -d ~/.dotfiles/.* | grep -v '\.$' | grep -v '\.git$');do ln -fs $f ~;done
}

[[ -f ~/.extra ]] || {
  log "> Configure Dotfiles"
  PACKAGES="
brew install node docker brave-browser visual-studio-code microsoft-office
npm install -g http-server
"
  read -p "Name: ($NAME) " NAME
  read -p "Email: ($EMAIL) " EMAIL
  read -p "Hostname: ($HOSTNAME) " HOSTNAME
  read -p "Install Additional Packages:$PACKAGES(Y/n) " PKG
  read -p "Install Mac Preferences (Y/n) " MAC
  [[ $PKG ]] || PKG=Y
  [[ $MAC ]] || MAC=Y
  [[ $HOSTNAME ]] || HOSTNAME=$(hostname)
  cat > ~/.extra <<EOL
NAME="$NAME"
EMAIL="$EMAIL"
HOSTNAME="$HOSTNAME"
PACKAGES="$PACKAGES"
EOL
  cat > ~/.gitextra <<EOL
[user]
  name = $NAME
  email = $EMAIL
EOL
  echo "# https://raw.githubusercontent.com/github/gitignore/master/Global/macOS.gitignore" >> ~/.gitexcludes
  curl -s https://raw.githubusercontent.com/github/gitignore/master/Global/macOS.gitignore >> ~/.gitexcludes
  echo "# https://raw.githubusercontent.com/github/gitignore/master/Node.gitignore" >> ~/.gitexcludes
  curl -s https://raw.githubusercontent.com/github/gitignore/master/Node.gitignore >> ~/.gitexcludes
  curl -s https://raw.githubusercontent.com/rupa/z/master/z.sh > ~/.z.sh
}

[[ $(date -r ~/.extra "+%H%M") == "0000" ]] || {
  log "> Install Required Packages"
  touch -t $(date +%Y%m%d0000) ~/.extra
  source ~/.extra

  brew leaves | xargs [[ " ${array[*]} " =~ " ${value} " ]] && echo "true" || echo "false"

  brew install coreutils findutils gnu-tar gnu-sed gawk gnutls gnu-indent gnu-getopt grep
  brew install bash bash-completion@2 git git-delta tmux
  brew install bat btop duf dust exa fd fzf ripgrep
  brew install httpie sampler
  brew tap homebrew/cask-fonts
  brew install font-hack

  echo /usr/local/bin/bash >> /etc/shells
  chsh -s /usr/local/bin/bash
  open ~/.dotfiles/Raw.terminal
  defaults write com.apple.terminal "Default Window Settings" "Raw"
  defaults write com.apple.terminal "Startup Window Settings" "Raw"

  [[ "$PKG" == [Yy]* ]] && {
    log "> Install Additional Packages"
    echo "$PACKAGES" | bash
  }

  [[ "$MAC" == [Yy]* ]] && {
    log "> Install Mac Preferences"
    osascript -e 'tell application "System Preferences" to quit'
    sudo -v;while true;do sudo -n true;sleep 60;kill -0 "$$" || exit;done 2>/dev/null &
    scutil --set HostName "$HOSTNAME"
    scutil --set LocalHostName "$HOSTNAME"
    scutil --set ComputerName "$HOSTNAME"
    dscacheutil -flushcache
    /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user
    chflags nohidden /Volumes
    chflags nohidden ~/Library
    hash tmutil &> /dev/null && tmutil disable
    nvram SystemAudioVolume=" "
    touch ~/.bash_sessions_disable
    defaults write /Library/Preferences/com.apple.loginwindow AdminHostInfo HostName
    defaults write com.apple.dashboard mcx-disabled -bool true
    defaults write com.apple.desktopservices DSDontWriteNetworkStores true
    defaults write com.apple.dock autohide -bool true
    defaults write com.apple.dock autohide-delay -float 0
    defaults write com.apple.dock autohide-time-modifier -float 0
    defaults write com.apple.dock expose-animation-duration -float 0.1
    defaults write com.apple.dock expose-group-by-app -bool false
    defaults write com.apple.dock launchanim -bool false
    defaults write com.apple.dock mru-spaces -bool false
    defaults write com.apple.dock showhidden -bool true
    defaults write com.apple.finder _FXShowPosixPathInTitle -bool true
    defaults write com.apple.finder _FXSortFoldersFirst -bool true
    defaults write com.apple.finder DisableAllAnimations -bool true
    defaults write com.apple.finder FXDefaultSearchScope -string "SCcf"
    defaults write com.apple.finder FXEnableExtensionChangeWarning -bool false
    defaults write com.apple.finder FXInfoPanesExpanded -dict General -bool true OpenWith -bool true Privileges -bool true
    defaults write com.apple.finder QuitMenuItem -bool true
    defaults write com.apple.finder ShowPathbar -bool true
    defaults write com.apple.finder ShowStatusBar -bool true
    defaults write com.apple.finder WarnOnEmptyTrash -bool false
    defaults write com.apple.ImageCapture disableHotPlug -bool true
    defaults write com.apple.LaunchServices LSQuarantine -bool false
    defaults write com.apple.screencapture disable-shadow -bool true
    defaults write com.apple.screencapture location -string "$HOME/Desktop"
    defaults write com.apple.screencapture type -string "png"
    defaults write com.apple.terminal StringEncodings -array 4
    defaults write com.apple.TimeMachine DoNotOfferNewDisksForBackup -bool true
    defaults write NSGlobalDomain AppleShowAllExtensions -bool true
    defaults write NSGlobalDomain com.apple.springing.delay -float 0
    defaults write NSGlobalDomain com.apple.springing.enabled -bool true
    defaults write NSGlobalDomain com.apple.swipescrolldirection -bool false
    defaults write NSGlobalDomain InitialKeyRepeat -int 10
    defaults write NSGlobalDomain KeyRepeat -int 5
    defaults write NSGlobalDomain NSAutomaticCapitalizationEnabled -bool false
    defaults write NSGlobalDomain NSAutomaticDashSubstitutionEnabled -bool false
    defaults write NSGlobalDomain NSAutomaticPeriodSubstitutionEnabled -bool false
    defaults write NSGlobalDomain NSAutomaticQuoteSubstitutionEnabled -bool false
    defaults write NSGlobalDomain NSAutomaticSpellingCorrectionEnabled -bool false
  }
}
