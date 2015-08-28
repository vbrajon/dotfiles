function docker-machine-setup() {
  docker-machine ip default || docker-machine start default || docker-machine create default -d virtualbox
  eval "$(docker-machine env default)"
}

function docker-go() {
  ID=$(docker ps -f name=$@ -l -q)
  docker exec -it $ID bash
}

function docker-killall() {
  if [[ $(docker ps -a -q) != '' ]]
  then
    docker stop $(docker ps -a -q) && docker rm $(docker ps -a -q)
  fi
}

function docker-clean() {
  docker rmi $(docker images | grep "^<none>" | awk "{print $3}")
}

alias dm="docker-machine-setup"
alias dps="docker ps"
alias dgo="docker-go"
alias dup="docker-compose up -d"
alias dbuild="docker-compose build"
alias dkill="docker-killall"
alias dclean="docker-clean"
