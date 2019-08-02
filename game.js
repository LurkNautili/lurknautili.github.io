/* Very basic 2D vector implemenetation*/
class Vector2 {
	constructor(x=0, y=0) {
  	this.x = x;
    this.y = y;
  }
  
  dot(v) {
  	return this.x * v.x + this.y * v.y;
  }
  
  normalize() {
  	let l = this.length();
    this.x /= l;
    this.y /= l;
  }
  
  length() {
  	return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }
  
  angleTo(v) {
  	let lt = this.length();
    let lv = v.length();
    let dp = this.dot(v);
    let cos_theta = dp / (lt * lv);
    return Math.acos(cos_theta);
  }
  
  /* The only nonstandard function, gets offset from "north" clockwise */
  bearing() {
    // Like your basic unit circle angle from x, y
    // Except clockwise from y-axis instead of anticlockwise from x-axis
    // Simply swap x and y to accomplish that
    // (handedness of coordinate axes and symmetry take care of it)
    let bear = Math.atan2(this.x, this.y);
    if (bear < 0) { bear = Math.PI * 2 + bear}
    return bear;
  }
}

class Game {
  constructor() {
    // bind event handlers?
    this.canvas = document.getElementById("game_canvas");
    this.context = this.canvas.getContext("2d");
    this.dbg = document.getElementById("debug_output");
  }

  start() {
    this.context.fillStyle = '#222222';
    this.context.fillRect(0, 0, 1024, 1024);
    // display splash?
    this.dbg.innerHTML = "test output";
  }
}

window.addEventListener("load", (e) => {
  var game = new Game();
  game.start();
});
