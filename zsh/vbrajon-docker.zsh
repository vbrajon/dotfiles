alias d=docker
alias dc=docker-compose
alias dup='docker-compose up -d'

function dm() {
  docker-machine ip default || docker-machine start default || docker-machine create default -d virtualbox --virtualbox-cpu-count "2" -virtualbox-memory "2048"
  eval "$(docker-machine env default)"
}

function dgo() {
  ID=$(docker ps -f name=$@ -l -q)
  docker exec -it $ID bash
}

function dkill() {
  if [[ $(docker ps -a -q) != '' ]]
  then
    docker stop $(docker ps -a -q) && docker rm $(docker ps -a -q)
  fi
}

function dclean() {
  docker rmi $(docker images | grep "^<none>" | awk "{print $3}")
}
