/*
Finally
*/'use strict';

var prime = require('prime');
var type = require('prime/type');
var map = require('prime/array/map');
var slice = require('prime/array/slice');
var forEach = require('prime/array/forEach');

/* create the flow */
var Flow = prime({

  /* options */
  constructor: function Flow() {
    this._seq = [];
  },

  /* add steps to the flow */
  then: function(callbacks) {
    var self = this;
    if (!arguments.length) return this;
    if (type(callbacks) !== 'array') callbacks = slice(arguments);
    if (!callbacks.length) return this;

    var i = 0;

    var exec = function(fn, index, args) {
      var control = new Controller(self, index);
      self._controls.push(control);
      fn.apply(control, args);
    };

    this._seq.push(map(callbacks, function(parallel) {

      return function() {
        var j = i++;
        exec(parallel, j, arguments);
      };

    }));
    return this;
  },

  /* assign last step and execute the flow */
  finally: function() {
    this.then.apply(this, arguments);
    this._continue.call(this);
    return this;
  },

  /* execute the flow with arguments to the first step */
  run: function() {
    this._continue.apply(this, arguments);
    return this;
  },

  // private

  _break: function() {
    this._seq.splice(0, this._seq.length - 1);
    this._continue.apply(this, arguments);
  },

  _spread: function(error, args) {
    var seq = this._next();
    if (!seq || !(seq = seq[0])) return;
    if (!args || !args.length) args = [undefined];
    this._length = args.length;
    forEach(args, function(arg) {
      seq(error, arg);
    });
  },

  _continue: function() {
    var seq = this._next();
    if (!seq) return;
    this._length = seq.length;
    var args = arguments;
    forEach(seq, function(parallel) {
      parallel.apply(null, args);
    });
  },

  _next: function() {
    var seq = this._seq.shift();
    if (!seq) return;

    if (this._controls) forEach(this._controls, function(control) { // kill old controls
      control._kill();
    });

    // reset variables

    this._arguments = [];
    this._errors = [];
    this._controls = [];

    return seq;
  },

  _done: function(index, error, data) {
    this._arguments[index] = data;
    if (error) this._errors.push(error);
    if (!--this._length) {
      var errors = null;
      if (this._errors.length === 1) errors = this._errors[0];
      else if (this._errors.length) errors = new Error(map(this._errors, function(e) {
        return e.message;
      }).join('\n'));
      this._continue.apply(this, [errors].concat(this._arguments));
    }
    else this._controls[index]._kill();
  }

});

/* control the flow */
var Controller = function Controller(flow, index) {

  var dead;

  this._kill = function() {
    dead = true;
  };

  /* break the flow */
  this.break = function() {
    if (!dead) flow._break.apply(flow, arguments);
  };

  /* step in the next sequential */
  this.continue = function() {
    if (!dead) flow._continue.apply(flow, arguments);
  };

  /* spread results to the next sequential */
  this.spread = function(error, args) {
    if (!dead) flow._spread(error, args);
  };

  /* set the the current parallel in the sequential as complete */
  var done = this.done = function(error, data) {
    if (!dead) flow._done.call(flow, index, error, data);
  };

};

/* public interface */
module.exports = function() {
  var flow = new Flow();
  flow.then.apply(flow, arguments);
  return flow;
};
