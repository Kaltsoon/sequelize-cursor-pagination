#!/bin/bash
DIR=$(pwd)

npm run build
cp package.json package-lock.json ./build
cd build
npm publish
cd $DIR
