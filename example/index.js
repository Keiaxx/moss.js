const MossClient = require('../moss')

const userId = process.env.MOSS_ID ? process.env.MOSS_ID : 'YOUR_USER_ID_HERE'

let client = new MossClient("python", userId)

async function start() {
    try {
        client.setComment("project1")
        client.addBaseFile('./submissions/base.py', 'base')
        client.addFile('./submissions/sub1.py', 'sub1')
        client.addFile('./submissions/sub2.py', 'sub2')

        let url = await client.process()
        console.log(url)
    } catch (e) {
        console.log("Error with MOSS submission")
    }
}

start()