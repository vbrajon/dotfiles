function docker-killall() {
  if [[ $(docker ps -a -q) != '' ]]
  then
    docker stop $(docker ps -a -q) && docker rm $(docker ps -a -q)
  fi
}

function docker-rmi-untagged() {
  docker rmi $(docker images | grep "^<none>" | awk "{print $3}")
}

function docker-up() {
  docker-compose up -d $1
}

function docker-go() {
  ID=$(docker ps -f name=$1 -l -q)
  docker exec -it $ID bash
}

alias dgo=docker-go
alias dup=docker-up
alias dkill=docker-killall