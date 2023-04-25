#!/bin/bash


token=$1
url=$2
stand=$3
tag=1


if [ "$stand" = "prod" ]
then
  nameDapp="dex-aggregator"
  dockerComposePath="/home/ubuntu/docker-compose.yaml"
else
  exit
fi


echo "$nameDapp"

rm -rf dist/
npm run build

docker build . -t cr.yandex/crpg11k469bhc8lch9gm/overnight/dex-aggregator:$tag

docker login \
         --username oauth \
         --password $token \
        cr.yandex

docker push  cr.yandex/crpg11k469bhc8lch9gm/overnight/dex-aggregator:$tag


ssh $url docker login \
         --username oauth \
         --password $token \
        cr.yandex

ssh $url docker pull cr.yandex/crpg11k469bhc8lch9gm/overnight/dex-aggregator:$tag
ssh $url docker-compose -f $dockerComposePath up -d --no-deps $nameDapp
