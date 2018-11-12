#!/bin/bash
DIR="$(dirname "$(readlink -f "$0")")" && cd "$DIR/../"

INSTANCE="justus2-backend"
IMAGE="justus2-backend"

docker stop $INSTANCE || echo 'Not running'
docker rm $INSTANCE || echo 'Not existing'
docker run -it -d \
  --name $INSTANCE \
  --link postgres:postgres \
  --sysctl=net.core.somaxconn=511 \
  -e "PG_URL=User ID=applicationuser;Password=postgres;Host=postgres;Port=5432;Database=justus;" \
  -p 3000:3000 \
  $IMAGE
docker logs $INSTANCE -f
