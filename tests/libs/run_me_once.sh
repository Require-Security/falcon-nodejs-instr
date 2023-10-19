#!/bin/bash
#

cp package.json-copy package.json

npm install

# Install raptor and correct getEnv() call in _helper.js
npm install raptor@^2.6.17
sed -i -e 's/^getEnv/jasmine.getEnv/' node_modules/raptor/test/_helper.js

# Configure ssl certificate required to run needle tests
pushd node_modules/needle
if [[ ! -f test/keys/ssl.key ]]; then
  npm install jschardet@^1.6.0
  mkdir -p test/keys
  openssl genrsa -out test/keys/ssl.key 2048
  openssl req -new -key test/keys/ssl.key -x509 -days 999 -out test/keys/ssl.cert \
    -subj "/C=US/ST=Massachusetts/L=Boston/O=Aarno Labs/OU=Research/CN=aarno-labs.com"
fi
popd
