<h1 align="center">
    <a href="https://whatsforlunch.dev">
        <img alt="What's For Lunch" width="30%" src="https://github.com/chandlerlucius/whats-for-lunch/blob/master/client/public/logo.svg" alt="What's For Lunch"/>
    </a>
</h1>

<p align="center">
    <strong>Location voting platform with chat capabilities built using React and Golang.</strong>
</p>

<p align="center">
    <a href="https://whatsforlunch.dev">Live Demo</a> |
    <a href="https://github.com/chandlerlucius/whats-for-lunch/releases">Releases</a>
</p>

# Intro

What's for Lunch is a fun little project written to allow voting for locations added by users and the ability to chat whilst doing so.

It is written in React for the front-end and Golang for the back-end using a mongo database to store the data.

## Prerequisites

Node, npm, and golang are needed to build/test/install/deploy the project.

## Installation

Install from source

1.  Clone the repo

    ```bash
    git clone https://github.com/chandlerlucius/whats-for-lunch
    ```

2.  Navigate to repo directory

    ```bash
    cd whats-for-lunch
    ```

3.  Build project w/o tests

    ```bash
    ./build-for-prod.sh
    ```

4.  The npm directory to deploy will be ./client/build

    ```bash
    ls -haltr ./client/build
    ```

5.  The go script to deploy will be $GOPATH/bin/whats-for-lunch

    ```bash
    ls -haltr "$(go env GOPATH)/bin/whats-for-lunch"
    ```

Install from release

1.  Download the jar

    ```bash
    wget https://github.com/chandlerlucius/whats-for-lunch/releases/download/
    ```

## Deployment

Deploy golang in foreground  
* Since 'go install' creates an executable file you can simply run the built file

```bash
./whats-for-lunch 
```

Deploy react in foreground  
* Since 'npm install' creates a build folder that one must 'serve' the easiest way to do so is to use npm's [serve](https://www.npmjs.com/package/serve "serve") package

```bash
sudo npm install -g serve
serve -s build
```

## Considerations

The default port for serve is 5000.
The port can be changed by adding a parameter to the serve command:

```bash
serve -l 3000 -s build
```

## Reccomendations

 * Since HTTPS security is **NOT** provided by default, it is recommended to setup the project behind a reverse proxy like NGinx or Apache.

    The react port is 5000.  
    The golang port is 9000.

* Since logging by default goes to stdout and stderr it is recommended to redirect the logs elsewhere.  

    Example:
    ```bash
    serve -s build >>logs/react.log 2>&1 &
    ./whats-for-lunch >>logs/golang.log 2>&1 &
    ```

## Support

For help, please use the [chat room](https://gitter.im/chandlerlucius/whats-for-lunch).

## License

[MIT](LICENSE)

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fchandlerlucius%2Fwhats-for-lunch.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fchandlerlucius%2Fwhats-for-lunch?ref=badge_large)
