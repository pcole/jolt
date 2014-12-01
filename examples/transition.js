
window.jolt = new Jolt({fullscreen: true, autoclear: true});

document.body.appendChild(jolt.canvas);

jolt.create('circle', {visible: false});

jolt.draw('circle', function(ctx){
	ctx.beginPath();
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 10;
	x = jolt.width/2;
	y = jolt.height/2;
	r = Math.min(x, y)/2;
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.stroke()
});

jolt.transition('circle', 'expandIn', function(){
	jolt.transition('circle', 'shrinkOut');
});