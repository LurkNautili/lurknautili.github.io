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
  // x + w * 0.5 = nx   -y + h * 0.5 = ny
  // x = nx - w * 0.5   y = h * 0.5 - nx
  toGameCoords(pos) {
    return new THREE.Vector2(pos.x - this.canvas.width * 0.5, this.canvas.height * 0.5 - pos.y);
  }

  start() {
    window.requestAnimationFrame(this.draw.bind(this));
  }

  draw(t) {
    this.raf = null; // for pausing the rendering if necessary
    let ctx = this.context;
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, 1024, 1024);
    /*ctx.beginPath();
    ctx.moveTo(0, 512);
    ctx.lineTo(1024, 512);
    ctx.moveTo(512, 0);
    ctx.lineTo(512, 1024);
    ctx.stroke();*/
    //*
    for (let b of this.boxes) {
      ctx.save();
      let p = this.toCanvasCoords(b.center);//new THREE.Vector2(b.center.x - b.width * 0.5, b.center.y - b.width * 0.5));
      ctx.translate(p.x, p.y);
      ctx.rotate(b.angle);
      ctx.strokeStyle = b.color.getStyle();
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-b.width * 0.5, -b.width * 0.5, b.width, b.width);
      //ctx.beginPath();
      //ctx.ellipse(0, 0, b.width, b.width, 0, 0, 2 * Math.PI);
      //ctx.stroke();
      ctx.restore();
      //ctx.rotate(-b.angle);
      //ctx.translate(-p.x, -p.y);
    }
    //*/
    /*
    ctx.save();
    ctx.strokeStyle = "#808080";
    ctx.translate(512 - 50, 512 - 50);
    ctx.strokeRect(0, 0, 100, 100);
    ctx.restore();
    //*/
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
    this.force_types = ["gravity", "normal", "input"];
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
    // -> walk back along velocity I guess? Do I want to just do the lazy way of pretending it bounced off and reflecting the velocity after projecting it back out of the surface?
    // -> A better way would be to figure out the moments of impact for each detected collision and step backwards to the earliest one and handle the collision properly there
    // -> How do I figure out the exact point of contact if I do things the lazy way?

    // lastly
    this.curr_time = Date.now();
  }

  checkIntersections() {

  }

  // alternative to separate types but might be problematic for forces that are context-dependent/situational like normal/contact forces and friction
  applyForces() {
    for (let type of force_types) {
      for (let box of boxes) {
        if (box.affected_by.includes(type)) {

        }
      }
    }
  }

  applyGravity() {
    for (let box of boxes) {
      if (box.affected_by.includes("gravity")) {

      }
    }
  }

  applyDrag() {
    for (let box of boxes) {
      if (box.affected_by.includes("drag")) {

      }
    }
  }

  applyFriction() {
    for (let box of boxes) {
      if (box.affected_by.includes("friction")) {

      }
    }
  }

  applyNormalForce() {
    for (let box of boxes) {
      if (box.affected_by.includes("normal")) {

      }
    }
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
      let x = typeof s.position.x === "undefined" ? 0 : s.position.x;
      let y = typeof s.position.y === "undefined" ? 0 : s.position.y;
      let size = typeof s.size === "undefined" ? 20 : s.size;
      let angle = typeof s.angle === "undefined" ? 0 : s.angle;
      let color = typeof s.color === "undefined" ? 0x808080 : s.color;
      game.boxes.push(new Box(new THREE.Vector2(x, y), size, angle, new THREE.Vector2(), new THREE.Color(color)));
    }
  }
}

class Character extends Box {
  constructor(position) {
    super(position, 35, 0, new THREE.Vector2(), new THREE.Color(0xffffff));
    this.input_state = {
      left : false,
      right : false,
      up : false,
      down : false,
      space : false
    }

    this.affected_by.concat(["gravity", "friction", "drag"]);
  }

  onKeyEvent(key, state) {
    let map = {
      "w" : "up",
      "a" : "left",
      "s" : "down",
      "d" : "right",
      "ArrowUp" : "up",
      "ArrowLeft" : "left",
      "ArrowDown" : "down",
      "ArrowRight" : "right",
      " " : "space"
    }
    this.input_state[map[key]] = state;
    console.log(this.input_state);
  }
}

class Game {
  constructor() {
    // bind event handlers?
    this.dbg = document.getElementById("debug_text");

    this.boxes = [];
    
    this.physics = new Physics(this.boxes);
    this.renderer = new Renderer(this.boxes);

    this.character = new Character(new THREE.Vector2(0, -420));
    this.boxes.push(this.character);

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

      this.registerListeners();
    }
    this.level = new Level("level_one.json", loadedCallback);
  }

  onKeyEvent(key, down) {
    let character_keys = ["w", "a", "s", "d", " ", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"];
    if (character_keys.includes(key)) {
      this.character.onKeyEvent(key, down);
    }
  }

  registerListeners() {
    window.addEventListener("keydown", (e) => {if (e.repeat) return; else this.onKeyEvent(e.key, true);});
    window.addEventListener("keyup", (e) => {if (e.repeat) return; else this.onKeyEvent(e.key, false);});
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
