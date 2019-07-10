# eval $(docker-machine env default --shell bash)
mkdir releases
docker build -t midnight-lizard .
docker run --rm -it -v $(pwd -$1)/releases:/build/releases midnight-lizard