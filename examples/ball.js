
// initialise
jolt = new Jolt({fullscreen: true, autoclear: true});

// append to the document
document.body.appendChild(jolt.canvas)

// ball update & drawing code (not specific to jolt)
ball = {
	x: jolt.width/2,
	y: jolt.height/2,
	vx: 5,
	vy: 5,
	update: function() {
		if((this.x >= jolt.width) || (this.x <= 0))
			this.vx = - this.vx;

		if((this.y >= jolt.height) || (this.y <= 0))
			this.vy = - this.vy;

		this.x += this.vx;
		this.y += this.vy;
	},
	draw: function(ctx) {
		ctx.beginPath();
		ctx.fillStyle = '#ffffff';
		ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
		ctx.fill()
	}
}

// On every frame
jolt.onFrame(function (){
	ball.update()
	this.draw(function (ctx){
		ball.draw(ctx);
	});
});
