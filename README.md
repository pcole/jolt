# jolt

> A small canvas animation utility

## Install

Install using bower: `bower install jolt`
Or just by downloading the [tarball](https://github.com/pcole/jolt/archive/master.zip)

# Usage

```
jolt = new Jolt({fullscreen: true, autoclear: true});

document.body.appendChild(jolt.canvas);

// On every animation frame
jolt.frame(function() {
	this.draw(function (ctx){
		// do some drawing
	});
});

// Create a new layer
jolt.create('circle', {visible: false});

jolt.draw('circle', function(ctx){
	// do some drawing on it
});

// transition your new layer in
jolt.transition('circle', 'expandIn', function(){
	// the circle layer is now visible
});
```

## TODO

- Add more transitions
- Testing

## Changelog

- 0.0.1 - First release
