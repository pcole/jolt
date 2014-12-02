(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], factory);
	}
	else if (typeof module !== "undefined" && module.exports) {
		module.exports = factory();
	}
	else {
		root.Jolt = factory();
	}
}(this, function () {

	/* globals */

	var request;
	var doc = document;
	var win = window;

	var defaults = {
		autostart: true,
		fullscreen: false
	}

	var layerDefaults = {
		scale: [1, 1],
		position: [0, 0],
		opacity: 1,
		visible: true,
		autoclear: false
	}

	var transitionDefaults = {
		duration: 750,
		easing: 'easeOutQuad'
	}

	/* constructor */

	function Jolt (canvas, options) {
		if (!(canvas instanceof HTMLCanvasElement)) {
			options = canvas
			canvas = doc.createElement('canvas');
		}

		for (var key in defaults) {
			if(key in options){
				this[key] = options[key];
			}
			else {
				this[key] = defaults[key];
			}
		}

		this.layers = {
			default: {
				ctx: canvas.getContext('2d')
			}
		}

		for (var key in layerDefaults) {
			if(key in options){
				this.layers.default[key] = options[key];
			}
			else {
				this.layers.default[key] = layerDefaults[key];
			}
		}

		this.canvas = canvas;
		this.ctx = this.layers.default.ctx;

		this.frameHandlers = [];

		this.resize();

		if (this.autostart) {
			this.start();
		}
	}

	/* api */

	Jolt.prototype.start = function () {
		this.now = +new Date();
		this.running = true;
		this.frame();
	}

	Jolt.prototype.stop = function () {
		this.running = false;
	}

	Jolt.prototype.onFrame = function (handler) {
		this.frameHandlers.push(handler);

		return this.frameHandlers.length;
	}

	Jolt.prototype.cancelFrame = function (index) {
		if (this.frameHandlers[index]) {
			this.frameHandlers.splice(index, 1);
		}
	}

	Jolt.prototype.frame = function () {
		cAF(request);

		if (this.running) {

			this.dt = (clock = +new Date()) - this.now;
			this.now = clock;

			for (key in this.layers) {
				layer = this.layers[key];

				if(layer.transition){
					layer.transition.update();
				}

				if(layer.autoclear){
					this.clear(key);
				}

				if(key != 'default' && layer.visible){
					this.load(key);
				}
			}

			for (var i = 0; i < this.frameHandlers.length; i++) {
				this.frameHandlers[i].apply(this);
			}

			that = this;

			request = rAF(function() {
				that.frame();
			});
		}
	}

	Jolt.prototype.create = function(layerName, options) {
		canvas = doc.createElement('canvas');
		options = options || {};

		this.layers[layerName] = {
			ctx: canvas.getContext('2d')
		}

		for (var key in layerDefaults) {
			if (key in options) {
				this.layers[layerName][key] = options[key];
			}
			else {
				this.layers[layerName][key] = layerDefaults[key];
			}
		}

		this.resize(layerName);

		return this.layers[layerName];
	}

	Jolt.prototype.draw = function (layerName, callback) {
		if (typeof layerName == "function") {
			callback = layerName;
			layerName = 'default';
		}

		layer = this.layers[layerName];

		callback(layer.ctx);

		if(!this.running && layerName != 'default') {
			this.load(layerName);
		}
	}

	Jolt.prototype.clear = function (layerName) {
		layer = this.layers[layerName || 'default'];
		layer.ctx.clearRect(0, 0, layer.ctx.canvas.width, layer.ctx.canvas.height);
	}

	Jolt.prototype.copy = function (from, to) {
		if (!to){
			to = from;
			from = 'default';
		}

		from = this.layers[from];
		to = this.layers[to];

		if (from.scale[0] != 1 && from.scale[1] != 1) {
			to.ctx.save();

			to.ctx.globalAlpha = from.opacity;
			to.ctx.translate(this.halfWidth, this.halfHeight);
			to.ctx.scale(from.scale[0], from.scale[1]);
			to.ctx.drawImage(from.ctx.canvas, -this.halfWidth, -this.halfHeight, this.width, this.height);

			to.ctx.restore();
		}
		else {
			to.ctx.drawImage(from.ctx.canvas, 0, 0, from.ctx.canvas.width, from.ctx.canvas.height);
		}
	}

	Jolt.prototype.save = function (to) {
		this.copy(to);
	}

	Jolt.prototype.load = function (from) {
		this.copy(from, 'default');
	}

	Jolt.prototype.resize = function (layerName) {
		if (this.fullscreen) {
			this.width = win.innerWidth;
			this.height = win.innerHeight;
		}
		else {
			this.width = this.canvas.width;
			this.height = this.canvas.height;
		}

		if (layerName) {
			layer = this.layers[layerName];
			layer.ctx.canvas.width = this.width;
			layer.ctx.canvas.height = this.height;
		}
		else {
			for (var key in this.layers) {
				layer = this.layers[key];
				layer.ctx.canvas.width = this.width;
				layer.ctx.canvas.height = this.height;
			}
		}

		// cache values to use in transitions
		this.halfWidth = this.width/2;
		this.halfHeight = this.height/2;
	}

	Jolt.prototype.transition = function (layerName, type, options, callback) {
		if(typeof options == 'function'){
			callback = options;
			options = null;
		}

		options = options || {};

		layer = this.layers[layerName];

		layer.transition = {}

		for (var key in transitionDefaults) {
			if (key in options) {
				layer.transition[key] = options[key];
			}
			else {
				layer.transition[key] = transitionDefaults[key];
			}
		}

		that = this;

		switch(type) {

			case 'expandIn':
				layer.scale = [0, 0];

				layer.transition.update = function () {
					layer.visible = true;
					layer.transition.start = layer.transition.start || that.now;
					dt = that.now - layer.transition.start;

					layer.scale[0] = that.ease(layer.transition.easing, dt, 0, 1, layer.transition.duration);
					layer.opacity = layer.scale[1] = layer.scale[0];

					if(dt >= layer.transition.duration) {
						layer.scale = [1, 1];
						layer.opacity = 1;
						that.stopTransition(layerName, callback);
					}
				};

				break;

			case 'shrinkOut':
				layer.scale = [1, 1];

				layer.transition.update = function () {
					layer.transition.start = layer.transition.start || that.now;
					dt = that.now - layer.transition.start;

					layer.scale[0] = that.ease(layer.transition.easing, dt, 1, 1, layer.transition.duration);
					layer.scale[1] = layer.scale[0];
					layer.opacity = 2 - layer.scale[0];

					if(dt >= layer.transition.duration) {
						layer.scale = [1, 1];
						layer.opacity = 1;
						layer.visible = false;
						that.stopTransition(layerName, callback);
					}
				};

				break;
		}
	}

	Jolt.prototype.stopTransition = function (layerName, callback) {
		delete this.layers[layerName].transition;

		if(typeof callback == 'function'){
			callback();
		}
	}

	Jolt.prototype.destroy = function (layerName) {
		if (layerName) {
			delete this.layers[layerName];
		}
		else {
			this.layers = [];
			this.frameHandlers = [];
			delete this.canvas;
			delete this.ctx;
		}
	}

	Jolt.prototype.dispose = function () {
		cAF(request);
		this.destroy();
	}

	// t: time elapsed, b: start value, c: end value, d: duration
	Jolt.prototype.ease = function (easing, t, b, c, d) {
		return this.easings[easing](null, t, b, c, d);
	}

	Jolt.prototype.easings = {
		easeInQuad: function (x, t, b, c, d) {
			return c*(t/=d)*t + b;
		},
		easeOutQuad: function (x, t, b, c, d) {
			return -c *(t/=d)*(t-2) + b;
		},
		easeInOutQuad: function (x, t, b, c, d) {
			if ((t/=d/2) < 1) return c/2*t*t + b;
			return -c/2 * ((--t)*(t-2) - 1) + b;
		},
		easeInCubic: function (x, t, b, c, d) {
			return c*(t/=d)*t*t + b;
		},
		easeOutCubic: function (x, t, b, c, d) {
			return c*((t=t/d-1)*t*t + 1) + b;
		},
		easeInOutCubic: function (x, t, b, c, d) {
			if ((t/=d/2) < 1) return c/2*t*t*t + b;
			return c/2*((t-=2)*t*t + 2) + b;
		},
		easeInQuart: function (x, t, b, c, d) {
			return c*(t/=d)*t*t*t + b;
		},
		easeOutQuart: function (x, t, b, c, d) {
			return -c * ((t=t/d-1)*t*t*t - 1) + b;
		},
		easeInOutQuart: function (x, t, b, c, d) {
			if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
			return -c/2 * ((t-=2)*t*t*t - 2) + b;
		},
		easeInQuint: function (x, t, b, c, d) {
			return c*(t/=d)*t*t*t*t + b;
		},
		easeOutQuint: function (x, t, b, c, d) {
			return c*((t=t/d-1)*t*t*t*t + 1) + b;
		},
		easeInOutQuint: function (x, t, b, c, d) {
			if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
			return c/2*((t-=2)*t*t*t*t + 2) + b;
		},
		easeInSine: function (x, t, b, c, d) {
			return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
		},
		easeOutSine: function (x, t, b, c, d) {
			return c * Math.sin(t/d * (Math.PI/2)) + b;
		},
		easeInOutSine: function (x, t, b, c, d) {
			return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
		},
		easeInExpo: function (x, t, b, c, d) {
			return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
		},
		easeOutExpo: function (x, t, b, c, d) {
			return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
		},
		easeInOutExpo: function (x, t, b, c, d) {
			if (t==0) return b;
			if (t==d) return b+c;
			if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
			return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
		},
		easeInCirc: function (x, t, b, c, d) {
			return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
		},
		easeOutCirc: function (x, t, b, c, d) {
			return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
		},
		easeInOutCirc: function (x, t, b, c, d) {
			if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
			return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
		},
		easeInElastic: function (x, t, b, c, d) {
			var s=1.70158;var p=0;var a=c;
			if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
			if (a < Math.abs(c)) { a=c; var s=p/4; }
			else var s = p/(2*Math.PI) * Math.asin (c/a);
			return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
		},
		easeOutElastic: function (x, t, b, c, d) {
			var s=1.70158;var p=0;var a=c;
			if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
			if (a < Math.abs(c)) { a=c; var s=p/4; }
			else var s = p/(2*Math.PI) * Math.asin (c/a);
			return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
		},
		easeInOutElastic: function (x, t, b, c, d) {
			var s=1.70158;var p=0;var a=c;
			if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
			if (a < Math.abs(c)) { a=c; var s=p/4; }
			else var s = p/(2*Math.PI) * Math.asin (c/a);
			if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
			return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
		},
		easeInBack: function (x, t, b, c, d, s) {
			if (s == undefined) s = 1.70158;
			return c*(t/=d)*t*((s+1)*t - s) + b;
		},
		easeOutBack: function (x, t, b, c, d, s) {
			if (s == undefined) s = 1.70158;
			return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
		},
		easeInOutBack: function (x, t, b, c, d, s) {
			if (s == undefined) s = 1.70158;
			if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
			return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
		},
		easeInBounce: function (x, t, b, c, d) {
			return c - Jolt.prototype.easings.easeOutBounce (x, d-t, 0, c, d) + b;
		},
		easeOutBounce: function (x, t, b, c, d) {
			if ((t/=d) < (1/2.75)) {
				return c*(7.5625*t*t) + b;
			} else if (t < (2/2.75)) {
				return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
			} else if (t < (2.5/2.75)) {
				return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
			} else {
				return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
			}
		},
		easeInOutBounce: function (x, t, b, c, d) {
			if (t < d/2) return Jolt.prototype.easings.easeInBounce (x, t*2, 0, c, d) * .5 + b;
			return Jolt.prototype.easings.easeOutBounce (x, t*2-d, 0, c, d) * .5 + c*.5 + b;
		}
	}

	/* shim */

	var vendors = ['ms', 'moz', 'webkit', 'o'];
	var scope = self;
	var then = 0;

	var a = 'AnimationFrame';
	var b = 'request' + a;
	var c = 'cancel' + a;

	var rAF = scope[b];
	var cAF = scope[c];

	for (var i = 0; i < vendors.length && !rAF; i++) {
		rAF = scope[vendors[ i ] + 'Request' + a];
		cAF = scope[vendors[ i ] + 'Cancel' + a];
	}

	scope[b] = rAF = rAF || function(callback) {
		var now = +new Date();
		var dt = M.max(0, 16 - (now - then));
		var id = setTimeout(function() {
			callback(now + dt);
		}, dt);

		then = now + dt;
		return id;
	};

	scope[c] = cAF = cAF || function(id) {
		clearTimeout(id);
	};

	/* output */

	return Jolt;
}));