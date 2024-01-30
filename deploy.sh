#!/bin/bash


token=$1
url=$2
stand=$3
tag=1


if [ "$stand" = "prod" ]
then
  nameDapp="dex-aggregator"
  dockerComposePath="/home/ubuntu/front/docker-compose.yaml"
else
  exit
fi


echo "$nameDapp"

rm -rf dist/
npm run build

docker build . -t cr.yandex/crp6lhbprjft0c8fhg61/overnight/dex-aggregator:$tag --platform linux/amd64

docker login \
         --username oauth \
         --password $token \
        cr.yandex

docker push  cr.yandex/crp6lhbprjft0c8fhg61/overnight/dex-aggregator:$tag


ssh $url docker login \
         --username oauth \
         --password $token \
        cr.yandex

ssh $url docker pull cr.yandex/crp6lhbprjft0c8fhg61/overnight/dex-aggregator:$tag
ssh $url docker-compose -f $dockerComposePath up -d --no-deps $nameDapp
