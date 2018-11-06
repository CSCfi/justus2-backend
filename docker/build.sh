#!/bin/bash
DIR="$(dirname "$(readlink -f "$0")")" && cd "$DIR/../"

IMAGE="justus2-backend"
docker build -t $IMAGE -f docker/Dockerfile .
