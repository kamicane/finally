/*
Finally
*/'use strict';

var prime = require('prime');

var kindOf = require('mout/lang/kindOf');
var map = require('mout/array/map');
var slice = require('mout/array/slice');
var forEach = require('mout/array/forEach');
var reduce = require('mout/array/reduce');

var each = require('mout/collection/forEach');
var cmap = require('mout/collection/map');

var push_ = Array.prototype.push;

/* create the flow */
var Flow = prime({

  /* options */
  constructor: function Flow() {
    this._seq = [];
  },

  /* add steps to the flow */
  then: function() {
    this._push(this._callbacks(arguments));
    return this;
  },

  _parallel: function(parallel, args) {
    var self = this;
    return function() {
      var control = new Controller(self, self._index++);
      self._controls.push(control);
      parallel.apply(control, args ? args.concat(slice(arguments)) : arguments);
    };
  },

  _push: function(parallels, args) {
    if (!parallels.length) return;
    this._seq.push(map(parallels, function(parallel) {
      return this._parallel(parallel, args);
    }, this));
  },

  _callbacks: function(callbacks) {
    return reduce(callbacks, function(a, b) {
      if (kindOf(b) === 'Array') push_.apply(a, b);
      else a.push(b);
      return a;
    }, []);
  },

  /* will make a sequential entry for each entry in the object */
  sequential: function(object) {
    var callbacks = this._callbacks(slice(arguments, 1));
    each(object, function(value, key) {
      this._push(callbacks, [value, key]);
    }, this);
    return this;
  },

  /* will make a single sequential entry with one parallel for each entry in the object */
  parallel: function(object, parallel) {
    var parallels = cmap(object, function(value, key) {
      return this._parallel(parallel, [value, key]);
    }, this);
    if (parallels.length) this._seq.push(parallels);
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
    this._index = 0;

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
