#!/bin/sh
app_dir=$(pwd)
cd client;

echo "Removing node modules: $(pwd)/node_modules/"
rm -rf node_modules;
echo "Removing npm bulid: $(pwd)/build/"
rm -rf build;
echo "Running npm install"
npm install;
echo "Running npm run build"
npm run build;

cd ..;
go_path=$(go env GOPATH)
echo "Removing go src: $go_path/src/whats-for-lunch/"
rm -rf "$go_path/src/whats-for-lunch";
echo "Removing go bin: $go_path/bin/whats-for-lunch"
rm -rf "$go_path/bin/whats-for-lunch";

echo "Make go directory and copy over source files"
mkdir -p "$go_path/src/whats-for-lunch"
cp -a server/. "$go_path/src/whats-for-lunch/";
cd "$go_path/src/whats-for-lunch/";

echo "Running go get"
go get;
echo "Running go clean"
go clean;
echo "Running go build"
go build;
echo "Running go install"
go install;

echo "NPM build: $app_dir/client/build"
echo "Go binary: $go_path/bin/whats-for-lunch"
