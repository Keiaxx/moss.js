# moss.js

A node.js client implementation of http://theory.stanford.edu/~aiken/moss/

## Install

```
npm install moss-node-client
```

## Running the example

Clone the project, navigate to example, edit `index.js` to specify your moss user id, or alternatively run via `cross-env` 

``` bash
cross-env MOSS_ID=12345678 node ./index.js
```

## Generic usage

``` javascript
const MossClient = require('moss-node-client')
const fs = require('fs)

const base2 = fs.readFileSync('./submissions/base2.py').toString()
const sub3 = fs.readFileSync('./submissions/sub3.py').toString()

// Create a client and specify language and moss user id
const client = new MossClient("python", "12345678")

// Name the current session
client.setComment("project1")

// Add a base file
client.addBaseFile('./submissions/base.py', 'base1')

//Add a raw base file
client.addRawBaseFile(base2,'base2')

// Add files to compare
client.addFile('./submissions/sub1.py', 'sub1')
client.addFile('./submissions/sub2.py', 'sub2')

//Add raw files to compare
client.addRawFile(sub3,'sub3')

// Call process(), a async/promise that returns the moss url
client.process().then(url => {
    console.log(url)
})
```