class Box {
  constructor(position = new THREE.Vector2(), size = 40, angle = 0, vel = new THREE.Vector2(), color = new THREE.Color()) {
    this.color = color;
    this.width = size;
    this.angle = angle;
    this.center = position;
    this.velocity = vel;
    this.ang_velocity = 0;
    this.mass = 1;
    this.inertial_moment = 1;
    this.force_accumulator = [];
    this.affected_by = []; // force types like "gravity"
  }

  applyForces(dt) {
    let torque = 0;
    let force = new THREE.Vector2();
    for (let f of force_accumulator) {
      let contrib = this.calcForceEffect(f.pos, f.dir);
      torque += f.pos.clone().sub(this.center).cross(contrib.tangential);
      force.add(contrib.radial);
    }
    let acceleration = force.divideScalar(this.mass).multiplyScalar(dt);
    this.velocity.add(acceleration);
    let ang_acceleration = torque / this.inertial_moment * dt;
    this.ang_velocity += ang_acceleration;
  }

  addForce(pos, dir) {
    this.force_accumulator.push({pos: pos, dir : dir});
  }

  calcForceEffect(pos, f) {
    let r = new THREE.Vector2().subVectors(this.center, pos);
    let r_u = r.clone().normalize();
    let f_u = f.clone().normalize();
    let theta = Math.acos(r_u.dot(f_u));
    let tan_dir = new THREE.Vector2(r_u.y, -r_u.x).multiplyScalar(f_u.cross(r_u));
    let tangential = tan_dir.clone().multiplyScalar(f.length() * Math.cos(theta));
    let radial = r_u.clone().multiplyScalar(f.length() * Math.sin(theta));
    return {
      radial : radial,
      tangential : tangential
    };
  }

  step(dt) {
    this.center.add(this.velocity.clone().multiplyScalar(dt));
    this.angle += this.ang_velocity * dt;
  }
}

class Renderer {
  constructor(boxes) {
    this.boxes = boxes;
    this.canvas = document.getElementById("game_canvas");
    this.context = this.canvas.getContext("2d");
    this.raf = null;
    this.time = 0;
    this.fps = 0;
    this.fps_display_unflickerer = 0;
  }

  toCanvasCoords(pos) {
    return new THREE.Vector2(pos.x + this.canvas.width * 0.5, -pos.y + this.canvas.height * 0.5);
  }

  start() {
    window.requestAnimationFrame(this.draw.bind(this));
  }

  draw(t) {
    this.raf = null; // for pausing the rendering if necessary
    let ctx = this.context;
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, 1024, 1024);
    for (let b of this.boxes) {
      let p = this.toCanvasCoords(b.center);
      ctx.translate(p.x, p.y);
      ctx.rotate(b.angle);
      ctx.strokeStyle = b.color.getStyle();
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-b.width * 0.5, -b.width * 0.5, b.width * 0.5, b.width * 0.5);
      ctx.rotate(-b.angle);
      ctx.translate(-p.x, -p.y);
    }
    let frametime = t - this.time;
    this.time = t;
    this.drawFrameCounter(frametime, this.fps_display_unflickerer === 0);
    this.fps_display_unflickerer = (this.fps_display_unflickerer + 1) % 20;
    if (this.raf !== null) {
      return;
    }
    this.raf = window.requestAnimationFrame(this.draw.bind(this));
  }

  drawFrameCounter(frametime, update) {
    if (update) {
      this.fps = Math.floor(1000/frametime);
    }
    let ctx = this.context;
    ctx.fillStyle = 'green';
    ctx.font = '24px sans-serif';
    ctx.fillText(this.fps, 0, 25);
  }
}

class Physics {
  constructor(boxes) {
    this.boxes = boxes;
    this.force_types = ["gravity", "contact", "input"];
    this.drag = 0.1;
    this.friction = 0.1; // probably beyond the scope of this jam
    this.restitution_coeff = 0.9;
    this.start_time = Date.now();
    this.curr_time = this.start_time;
  }

  start() {
    setInterval(this.step, 1);
  }

  step() {
    let new_time = Date.now();
    let dt = new_time - this.curr_time;
    // apply forces
    // move objects
    // check for and resolve intersections/collisions

    // lastly
    this.curr_time = Date.now();
  }

  checkIntersections() {

  }

  applyGravity() {

  }

  applyDrag() {

  }

  applyFriction() {

  }
}

class Level {
  constructor(name, callback) {
    var req = new XMLHttpRequest();
    req.open("GET", "/" + name);
    req.onreadystatechange = () => {
      if (req.readyState == 4) {
        if (req.status == 200) {
          this.loadLevel(JSON.parse(req.responseText));
          callback();
        }
        else {
          game.setDebugMsg("Failed to load level \"" + name + "\"")
        }
      }
    }
    req.send();
  }

  loadLevel(obj) {
    console.log(obj);
    for (let s of obj.static_geometry) {
      game.boxes.push(new Box(new THREE.Vector2(s.position.x, s.position.y), s.size, s.angle, new THREE.Vector2(), new THREE.Color(0x20aa00)));
    }
  }
}

class Game {
  constructor() {
    // bind event handlers?
    this.dbg = document.getElementById("debug_text");

    this.boxes = [];
    
    this.physics = new Physics(this.boxes);
    this.renderer = new Renderer(this.boxes);
    this.level = null; // do I need this?
  }

  start() {
    // display splash?

    // wait for input?

    // load level?
    let loadedCallback = () => {
      this.setDebugMsg("Nothing to report");
      this.physics.start();
      this.renderer.start();
      // All of the below seems kind of pointless (it's a toggle for pausing the game when not hovering mouse over canvas)
      // Could be used for a better pause function later though
      {
      /*
      this.renderer.canvas.addEventListener('mouseover', (function(e) {
        if (this.renderer.raf !== null) {
          return;
        }
        this.renderer.raf = window.requestAnimationFrame(this.renderer.draw.bind(this.renderer));
        this.setDebugMsg("Game running");
      }).bind(this));
      let pause_game = (function(e) {
        if (this.renderer.raf == null) {
          return;
        }
        window.cancelAnimationFrame(this.renderer.raf);
        this.renderer.raf = null;
        this.setDebugMsg("Game paused");
      }).bind(this);
      this.renderer.canvas.addEventListener('mouseout', pause_game);
      window.addEventListener('mousemove', (e) => {
        let element = document.elementFromPoint(e.clientX, e.clientY);
        if (element != this.renderer.canvas) {
          pause_game();
        }
      });
      */
      }
    }
    this.level = new Level("level_one.json", loadedCallback);
  }

  step() {

  }

  setDebugMsg(msg) {
    this.dbg.innerHTML = msg;
  }
}

var game = null;
window.addEventListener("load", (e) => {
  game = new Game();
  game.start();
});
