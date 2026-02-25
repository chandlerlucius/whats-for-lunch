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

/usr/local/go/bin/go mod init whatsforlunch
/usr/local/go/bin/go mod tidy

go_path=$(/usr/local/go/bin/go env GOPATH)
echo "Removing go src: $go_path/src/whats-for-lunch/"
rm -rf "$go_path/src/whats-for-lunch";
echo "Removing go bin: $go_path/bin/whats-for-lunch"
rm -rf "$go_path/bin/whats-for-lunch";

echo "Make go directory and copy over source files"
mkdir -p "$go_path/src/whats-for-lunch"
cp -a server/* "$go_path/src/whats-for-lunch/";
cd "$go_path/src/whats-for-lunch/";

echo "Running go get"
/usr/local/go/bin/go get -d;
echo "Running go clean"
/usr/local/go/bin/go clean -v;
echo "Running go build"
/usr/local/go/bin/go build -v;
echo "Running go install"
/usr/local/go/bin/go install -v;

echo "NPM build: $app_dir/client/build"
echo "Go binary: $go_path/bin/whats-for-lunch"

# Run as root
# sudo su
# npx serve -l 5000 -s /var/www/html/whats-for-lunch/client/build >> /var/www/html/whats-for-lunch/logs/react.log 2>&1 &
# /var/www/go/bin/whats-for-lunch >>logs/golang.log 2>&1 &
