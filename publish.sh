#!/bin/bash
DIR=$(pwd)

set -e

npm run build
cp package.json package-lock.json README.md ./build
cd build
npm publish
cd $DIR
