// MIT License

// Copyright (c) 2019 Adrian Gose

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const fs = require('fs')
const path = require('path')
const net = require('net')

const moss_host = 'moss.stanford.edu'
const moss_port = 7690
const languages = ["c", "cc", "java", "ml", "pascal", "ada", "lisp", "scheme", "haskell", "fortran", "ascii", "vhdl", "perl", "matlab", "python", "mips", "prolog", "spice", "vb", "csharp", "modula2", "a8086", "javascript", "plsql", "verilog"]

class MossClient {
    constructor(language, userId) {
        if (!languages.includes(String(language).toLowerCase()))
            throw new Error("MossClient: Invalid language specified")

        this.baseFiles = []
        this.files = []
        this.userId = userId
        this.language = language
        this.opts = {
            l: this.language,
            m: 10,
            d: 0,
            x: 0,
            c: '',
            n: 250
        }
    }

    /**
     * The -c option supplies a comment string that is attached to the generated
     * report.  This option facilitates matching queries submitted with replies
     * received, especially when several queries are submitted at once.
     * @param {*} comment 
     */
    setComment(comment) {
        this.opts.c = comment
    }

    /**
     * The -n option determines the number of matching files to show in the results.
     * The default is 250.
     * @param {*} num 
     */
    setNumMatchingFiles(num) {
        this.opts.n = num
    }

    /**
     *  # The -m option sets the maximum number of times a given passage may appear
        # before it is ignored.  A passage of code that appears in many programs
        # is probably legitimate sharing and not the result of plagiarism.  With -m N,
        # any passage appearing in more than N programs is treated as if it appeared in
        # a base file (i.e., it is never reported).  Option -m can be used to control
        # moss' sensitivity.  With -m 2, moss reports only passages that appear
        # in exactly two programs.  If one expects many very similar solutions
        # (e.g., the short first assignments typical of introductory programming
        # courses) then using -m 3 or -m 4 is a good way to eliminate all but
        # truly unusual matches between programs while still being able to detect
        # 3-way or 4-way plagiarism.  With -m 1000000 (or any very
        # large number), moss reports all matches, no matter how often they appear. 
        # The -m setting is most useful for large assignments where one also a base file
        # expected to hold all legitimately shared code.  The default for -m is 10.
     * @param {*} limit 
     */
    setMIgnoreLimit(limit) {
        this.opts.m = limit
    }

    async addBaseFile(filePath, description) {
        let fp = path.resolve(filePath)
        fs.access(fp, fs.constants.F_OK, (err) => {
            if (err)
                throw new Error(`Base file ${filePath} cannot be found`)

            const stat = fs.statSync(fp);
            const bytes = stat.size;

            this.baseFiles.push({ description: description, path: filePath, size: bytes })
        });
    }

    async addFile(filePath, description) {
        let fp = path.resolve(filePath)
        fs.access(fp, fs.constants.F_OK, (err) => {
            if (err)
                throw new Error(`Normal file ${filePath} cannot be found`)

            const stat = fs.statSync(fp);
            const bytes = stat.size;

            this.files.push({ description: description, path: filePath, size: bytes })
        });
    }

    async _uploadFile(socket, fileObj, fileId){
        console.log(fileObj)

        return new Promise((resolve, reject) => {
            fs.readFile(fileObj.path, "utf-8", (err, data) => {
                if(err)
                    reject(err)
            
                let newdata = data.replace(/[^a-zA-Z0-9\t\n ./,<>?;:"'`!@#$%^&*()\[\]{}_+=|\\-]/g, '')
                let writing = `file ${fileId} ${this.opts.l} ${Buffer.byteLength(newdata)} ${fileObj.description}\n`
                socket.write(writing)
                socket.write(newdata)
                console.log("Written " + writing)
                resolve()
            })
        })
    }

    async process() {
        return new Promise((resolve, reject) => {
            let socket = new net.Socket()
            socket.connect(moss_port, moss_host, () => {
                console.log(`Connected to MOSS server @ ${moss_host}:${moss_port}`)

                socket.write(`moss ${this.userId}\n`)
                socket.write(`directory ${this.opts.d}\n`)
                socket.write(`X ${this.opts.x}\n`)
                socket.write(`maxmatches ${this.opts.m}\n`)
                socket.write(`show ${this.opts.n}\n`)
                socket.write(`language ${this.opts.l}\n`)
            });

            socket.on('data', async (data) => {
                console.log('DATA: ' + data);

                if (data == "no\n")
                    reject(new Error("Invalid language specified"))

                if (data == "yes\n"){

                    for(const baseFile of this.baseFiles){
                        await this._uploadFile(socket, baseFile, 0)
                    }

                    let fileId = 1
                    for(const file of this.files){
                        try{
                            await this._uploadFile(socket, file, fileId)
                            fileId++
                        }catch(e){}
                    }

                    socket.write(`query 0 ${this.opts.c}\n`)

                }

                if (String(data).startsWith("http://moss.stanford.edu")){
                    socket.write('end\n')
                    socket.destroy()
                    resolve(data.toString('utf8'))
                }
            });

            socket.on('close', () => {
                console.log('Connection closed');
            });
        })
    }
}

module.exports = MossClient