# eval $(docker-machine env default --shell bash)
mkdir releases
TAG=midnight-lizard:$(date +"%Y-%m-%d--%H-%M-%S")
docker build -t $TAG .
docker run --rm -it -v $(pwd -$1)/releases:/build/releases $TAG