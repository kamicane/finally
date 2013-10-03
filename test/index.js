"use strict"

var expect = require('expect.js')
var flow = require('../')

describe('Finally', function(){

  describe('syncronous operations', function() {

    it('should accept a last step in finally', function() {

      flow()
      .then(function(err, data) {
        expect(data).to.be(1)
        this.continue(null, data + 1)
      })
      .then(function(err, data) {
        expect(data).to.be(2)
        this.continue(null, data + 1)
      })
      .then(function(err, data) {
        expect(data).to.be(3)
      })
      .run(null, 1)

    })

    it('should accept a first step in the constructor and a last step in finally', function() {

      flow(function() {
        this.continue(null, 1)
      })
      .then(function(err, data) {
        expect(data).to.be(1)
        this.continue(null, data + 1)
      })
      .finally(function(err, data) {
        expect(data).to.be(2)
      })

    })

    it('should keep the parallels order', function() {

      var counter = 0

      flow([
        function() {
          this.done(null, counter++)
        },
        function(){
          this.done(null, counter++)
        }
      ])
      .then(function(err, n1, n2) {
        expect(counter).to.be(2)
        expect(n1).to.be(0)
        expect(n2).to.be(1)
        this.continue(null, counter)
      })
      .finally(function(err, data) {
        expect(data).to.be(2)
      })

    })

    it('should continue on parallels', function() {

      flow([
        function() {
          this.continue(null, 20)
        },
        function(){
          this.continue(null, 10)
        }
      ])
      .finally(function(err, n1, n2) {
        expect(n1).to.be(20)
        expect(n2).to.be(undefined)
      })

    })

    it('should break on parallels', function() {

      flow([
        function() {
          this.break(null, 20)
        }, function(){
          this.break(null, 10)
        }
      ])
      .then(function(err, n1, n2) {
        throw new Error('this should never get called')
      })
      .finally(function(err, data) {
        expect(data).to.be(20)
      })

    })

    it('should spread values to and from parallels', function() {

      var counter = 0

      flow(function() {
        this.spread(null, [10, 20, 30])
      })
      .then(function(err, n){
        counter += n
        this.done(null, n)
      })
      .finally(function(err, n1, n2, n3) {
        expect(n1).to.be(10)
        expect(n2).to.be(20)
        expect(n3).to.be(30)
        expect(counter).to.be(60)
      })

    })

    it('should ignore empty parallels', function() {

      flow().then([]).then().finally(function(err) {
        expect(err).to.be(undefined)
      })

    })

    it('should go to the next sequential on empty spreads', function() {

      flow(function(err) {
        this.spread(null, [])
      }).then(function(error, number) {
        expect(error).to.be(null)
        expect(number).to.be(undefined)
        this.done(null, 10);
      }).finally(function(error, number) {
        expect(number).to.be(10);
      })

      flow(function(err) {
        this.spread(null)
      }).then(function(error, number) {
        expect(error).to.be(null)
        expect(number).to.be(undefined)
        this.done(null, 10);
      }).finally(function(error, number) {
        expect(number).to.be(10);
      })

    })

    it('should spread objects with a length', function() {

      flow(function(err) {
        this.spread(null, "yes")
      }).then(function(error, letter) {
        expect(error).to.be(null)
        this.done(null, letter);
      }).finally(function(error, y, e, s) {
        expect(error).to.be(null)
        expect(y + e + s).to.eql("yes")
      })

    })

    it('should get errors when parallels return errors', function() {

      flow(function(err) {
        this.done(new Error('A'));
      }, function(err) {
        this.done(new Error('B'));
      }, function(err) {
        this.done(null, true)
      }).finally(function(error, vA, vB, vC) {
        expect(error.message).to.be('A\nB')
        expect(vA).to.be(undefined)
        expect(vB).to.be(undefined)
        expect(vC).to.be(true)
      })

    })

  })

  describe('asyncronous operations', function() {

    it('should accept a last step in finally', function(done) {

      flow()
      .then(function(err, data) {
        setTimeout(function() {
          expect(data).to.be(1)
          this.continue(null, data + 1)
        }.bind(this), 10)
      })
      .then(function(err, data) {
        setTimeout(function() {
          expect(data).to.be(2)
          this.continue(null, data + 1)
        }.bind(this), 10)
      })
      .then(function(err, data) {
        setTimeout(function() {
          expect(data).to.be(3)
          done()
        }.bind(this), 10)
      })
      .run(null, 1)

    })

    it('should accept a first step in the constructor and a last step in finally', function(done) {

      flow(function() {
        setTimeout(function() {
          this.continue(null, 1)
        }.bind(this), 10)
      })
      .then(function(err, data) {
        setTimeout(function() {
          expect(data).to.be(1)
          this.continue(null, data + 1)
        }.bind(this), 10)
      })
      .finally(function(err, data) {
        setTimeout(function() {
          expect(data).to.be(2)
          done()
        }.bind(this), 10)
      })

    })

    it('should keep the parallels order', function(done) {

      flow([
        function() {
          setTimeout(function() {
            this.done(null, 0)
          }.bind(this), 20)
        },
        function(){
          setTimeout(function() {
            this.done(null, 1)
          }.bind(this), 10)
        }
      ])
      .then(function(err, n1, n2) {
        setTimeout(function() {
          expect(n1).to.be(0)
          expect(n2).to.be(1)
          this.continue(null, n1 + n2)
        }.bind(this), 10)
      })
      .finally(function(err, data) {
        setTimeout(function() {
          expect(data).to.be(1)
          done()
        }.bind(this), 10)
      })

    })

    it('should continue on parallels', function(done) {

      flow([
        function() {
          setTimeout(function() {
            this.continue(null, 20)
          }.bind(this), 20)
        },
        function(){
          setTimeout(function() {
            this.continue(null, 10)
          }.bind(this), 5)
        }
      ])
      .finally(function(err, n1, n2) {
        setTimeout(function() {
          expect(n1).to.be(10)
          expect(n2).to.be(undefined)
          done()
        }.bind(this), 10)
      })

    })

    it('should break on parallels', function(done) {

      flow([
        function() {
          setTimeout(function() {
            this.break(null, 20)
          }.bind(this), 20)
        }, function(){
          setTimeout(function() {
            this.break(null, 10)
          }.bind(this), 10)
        }
      ])
      .then(function(err, n1, n2) {
        throw new Error('this should never get called')
      })
      .finally(function(err, data) {
        setTimeout(function() {
          expect(data).to.be(10)
          done()
        }.bind(this), 10)
      })

    })

    it('should spread values to and from parallels', function(done) {

      var ms = 50

      flow(function() {
        this.spread(null, [10, 20, 30])
      })
      .then(function(err, n){
        setTimeout(function() {
          this.done(null, n)
        }.bind(this), ms -= 10)
      })
      .finally(function(err, n1, n2, n3) {
        setTimeout(function() {
          expect(n1).to.be(10)
          expect(n2).to.be(20)
          expect(n3).to.be(30)
          done()
        }.bind(this), 10)
      })

    })

  })

})
