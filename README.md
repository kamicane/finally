Finally
=======

Finally is a simple flow control library for node.js and the browsers, with a mentally sane API.

## It works like this

Think of your flow as an array of sequential operations, each one containing an array of parallel operations.

## Reading 2 files sequentially

```js
var fs = require('fs')
var flow = require('finally')

flow(function(){
  fs.readFile('path/to/file', 'utf-8', this.continue)
  // this.continue is a node-style callback that also triggers the next sequential
})
.then(function(error, data1){
  if (error) this.break(error)
  // this.break is a node-style callback that also triggers the last sequential
  fs.readFile('path/to/file', 'utf-8', function(error, data2) {
    this.continue(error, data1, data2)
  }.bind(this))
})
.finally(function(error, data1, data2){
  if (error) throw error
  console.log(data1, data2)
})
```

## Reading 2 files in parallel

```js
var fs = require('fs')
var flow = require('finally')

flow(
  function(){
    fs.readFile('path/to/file', 'utf-8', this.done)
    // this.done is a node-style callback that increments the parallels counter and
    // triggers the next sequential when all are completed.
    // the first argument passed to done is then distributed, in order, to the next sequential
  },
  function(){
    fs.readFile('path/to/file', 'utf-8', this.done)
  },
)
.finally(function(error, data1, data2){
  if (error) throw error
  else console.log(data1, data2)
})
```

## Spreading arguments

```js
var fs = require('fs')
var flow = require('finally')

flow(function(){
  fs.readFile('path/to/file.json', function(error, data){
    if (error) return this.break(error) // goes to finally
    var someObject = JSON.parse(data)
    var someArray = someObject.someArray // someArray is [0,1,2,3,4]
    this.spread(null, someArray)
    // this.spread is a node-style callback that triggers the next sequential
    // n times as the array's length
    // treating the next sequential as an array of parallels
    // each iteration gets the array[index] value as a single argument (after error, ofcourse)
  }.bind(this))
})
.then(function(error, n){
  this.done(error, n + 1)
})
.finally(function(error, n1, n2, n3, n4, n5){
  if (error) throw error
  else console.log(n1, n2, n3, n4, n5) // [1,2,3,4,5]
})
```

## Continuing on error

Say we want to continue on error only, for instance to find the first existing file.

```js
var fs = require('fs')
var flow = require('finally')

flow(function(){
  fs.readFile('path/to/file1', function(error, data){
    if (error) this.continue(error)
    else this.break(null, 'path/to/file1', data)
  }.bind(this))
})
.then(function(error, n){
  fs.readFile('path/to/file2', function(error, data){
    if (error) this.continue(error)
    else this.break(null, 'path/to/file2', data)
  }.bind(this))
})
.then(function(error, n){
  fs.readFile('path/to/file3', function(error, data){
    if (error) this.continue(error)
    else this.break(null, 'path/to/file3', data)
  }.bind(this))
})
.finally(function(error, path, data){
  if (error) console.log('no existing file found')
  else console.log('first existing file was ' + path + ' with data ' + data)
})
```

## Reading files sequentially, generating the flow

```js
var fs = require('fs')
var flow = require('finally')

var ƒ = flow()

['path/to/file1', 'path/to/file2', 'path/to/file3'].forEach(function(path) {
  ƒ.then(function(error){
    fs.readFile(path, function(error, data){
      if (error) this.continue(error)
      else this.break(null, path, data)
    }.bind(this))
  })
})

ƒ.finally(function(error, path, data){
  if (error) console.log('no existing file found')
  else console.log('first existing file was ' + path + ' with data ' + data)
})
```

There is also a shortcut for the above:

```js
var fs = require('fs')
var flow = require('finally')

var ƒ = flow()

ƒ.sequential(['path/to/file1', 'path/to/file2', 'path/to/file3'], function(path, i, error) {
  fs.readFile(path, function(error, data){
    if (error) this.continue(error)
    else this.break(null, path, data)
  }.bind(this))
})

ƒ.finally(function(error, path, data){
  if (error) console.log('no existing file found')
  else console.log('first existing file was ' + path + ' with data ' + data)
})
```

## Reading files in parallel, generating the flow

```js
var fs = require('fs')
var flow = require('finally')

var ƒ = flow()

ƒ(['path/to/file1', 'path/to/file2', 'path/to/file3'].map(function(path) {
  return function(error){
    fs.readFile(path, function(error, data){
      if (error) this.done(error)
      else this.break(null, path, data)
    }.bind(this))
  }
})

ƒ.finally(function(error, path, data){
  if (error) console.log('no existing file found')
  else console.log('first existing file was ' + path + ' with data ' + data)
})
```

There is also a shortcut for the above:

```js
var fs = require('fs')
var flow = require('finally')

var ƒ = flow()

ƒ.parallel(['path/to/file1', 'path/to/file2', 'path/to/file3'], function(path, i, error) {
  fs.readFile(path, function(error, data){
    if (error) this.done(error)
    else this.break(null, path, data)
  }.bind(this))
})

ƒ.finally(function(error, path, data){
  if (error) console.log('no existing file found')
  else console.log('first existing file was ' + path + ' with data ' + data)
})
```
