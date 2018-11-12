#!/bin/bash
DIR="$(dirname "$(readlink -f "$0")")" && cd "$DIR/../../"

IMAGE="postgres:9-alpine"
INSTANCE="postgres"

docker stop $INSTANCE || echo 'Not running'
docker rm $INSTANCE || echo 'Not existing'
docker run -it -d \
  --name $INSTANCE \
  -v `pwd`/sql:/sql \
  -v `pwd`/docker/postgresql/init-user-db.sh:/docker-entrypoint-initdb.d/init-user-db.sh \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=justus \
  -p 5432:5432 \
  $IMAGE
docker logs $INSTANCE -f
