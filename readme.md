# Ethnodes Location
Map and visualizes Ethereum Nodes. Uses data from [node-crawler](https://github.com/ethereum/node-crawler)

## How to use
Copy the SQLite DB generated from node-crawler `crawler.db` to this projects root folder.
Run `go run main.go`, this will generate the `html/nodes.json`.
Serve the html folder with your favorite webserver.
