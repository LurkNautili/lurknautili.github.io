class Box {
  constructor(position = new THREE.Vector2(), size = 40, angle = 0, vel = new THREE.Vector2(), color = new THREE.Color()) {
    this.color = color;
    this.fill = false;
    this.width = size;
    this.angle = angle;
    this.center = position;
    this.velocity = vel;
    this.ang_velocity = 0;
    this.mass = 1;
    this.inertial_moment = 1;
    this.force_accumulator = [];
    this.affected_by = []; // force types like "gravity"
    this.resting = false;
  }

  applyForces(dt) {
    //game.setDebugMsg("dt: " + dt);
    if (this.affected_by.length === 0) return;
    let torque = 0;
    let force = new THREE.Vector2();
    for (let f of this.force_accumulator) {
      let contrib = this.calcForceEffect(f.pos, f.dir);
      torque += f.pos.clone().sub(this.center).cross(contrib.tangential);
      force.add(contrib.radial);
    }
    this.force_accumulator = [];
    let acceleration = force.divideScalar(this.mass).multiplyScalar(dt);
    this.velocity.add(acceleration);
    let ang_acceleration = torque / this.inertial_moment * dt;
    this.ang_velocity += ang_acceleration;
  }

  addForce(pos, dir) {
    if (this.affected_by.length === 0) return;
    this.force_accumulator.push({pos: pos, dir : dir});
  }

  calcForceEffect(pos, f) {
    if (this.affected_by.length === 0) return;
    let r = new THREE.Vector2().subVectors(this.center, pos);
    let r_u = r.clone().normalize();
    let f_u = f.clone().normalize();
    let theta = Math.acos(r_u.dot(f_u));
    if (r.length() < 0.001) {
      r_u = f_u;
      theta = Math.PI / 2;
    }
    let tan_dir = new THREE.Vector2(r_u.y, -r_u.x).multiplyScalar(f_u.cross(r_u));
    let tangential = tan_dir.clone().multiplyScalar(f.length() * Math.cos(theta));
    let radial = r_u.clone().multiplyScalar(f.length() * Math.sin(theta));
    return {
      radial : radial,
      tangential : tangential
    };
  }

  step(dt) {
    if (this.affected_by.length === 0) return;
    if (this.velocity.length() < 10) {
      //this.velocity = new THREE.Vector2();
    }
    game.setDebugMsg("Character x-velocity: " + this.velocity.x.toFixed(1));
    this.center.add(this.velocity.clone().multiplyScalar(dt));
    this.angle += this.ang_velocity * dt;
    if (this.center.y < -427 && !this.resting) {
      this.center.y = -428;
      this.resting = true;
      if (typeof this.jumping !== "undefined") {
        this.jumping = false;
      }
      this.velocity.y = 0;
    }
    else if (this.center.y > -427) {
      this.resting = false;
    }
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
    //this.history = [];
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
    //ctx.globalAlpha = 0.6;
    ctx.fillRect(0, 0, 1024, 1024);
    //ctx.globalAlpha = 0.1;
    //for (let h of this.history) {
      //ctx.putImageData(h, 0, 0);
    //}
    //console.log(this.history.length);
    //ctx.globalAlpha = 1;
    //ctx.fillRect(0, 0, 1024, 1024);
    /*ctx.beginPath();
    ctx.moveTo(0, 512);
    ctx.lineTo(1024, 512);
    ctx.moveTo(512, 0);
    ctx.lineTo(512, 1024);
    ctx.stroke();*/
    //*
    for (let b of this.boxes) {
      ctx.globalAlpha = 1;
      ctx.save();
      let p = this.toCanvasCoords(b.center);//new THREE.Vector2(b.center.x - b.width * 0.5, b.center.y - b.width * 0.5));
      ctx.translate(p.x, p.y);
      ctx.rotate(b.angle);
      ctx.strokeStyle = b.color.getStyle();
      ctx.fillStyle = b.color.getStyle();
      ctx.lineWidth = 2.5;
      if (!b.fill) { 
        ctx.strokeRect(-b.width * 0.5, -b.width * 0.5, b.width, b.width);
      }
      else {
        ctx.fillRect(-b.width * 0.5, -b.width * 0.5, b.width, b.width);
      }
      //ctx.beginPath();
      //ctx.ellipse(0, 0, b.width, b.width, 0, 0, 2 * Math.PI);
      //ctx.stroke();
      ctx.restore();
      //ctx.rotate(-b.angle);
      //ctx.translate(-p.x, -p.y);
    }
    //let idata = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    //this.history.push(idata);
    //if (this.history.length > 4) {
    //  this.history.shift();
    //}

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
    this.gravity = 1000 * 80 * 1000;
    this.drag = 1000 * 0.01;
    this.friction = 1000 * 100; // probably beyond the scope of this jam
    this.restitution_coeff = 0.9;
    this.start_time = Date.now();
    this.curr_time = this.start_time;
    this.input_flags = {
      jump : false,
      left : false,
      right : false
    }
  }

  start() {
    setInterval(this.step.bind(this), 1);
  }

  step() {
    let new_time = Date.now();
    // this variable rate thing doesn't seem to work properly for some reason -- maybe because of the Spectre mitigations
    let dt = 0.001;
    //let dt = (new_time - this.curr_time) / 1000;
    // apply forces
    this.applyInputs(dt);
    this.applyGravity(dt);
    this.applyDrag(dt);
    this.applyFriction(dt);
    for (let box of this.boxes) {
      box.applyForces(dt);
    }
    // move objects
    for (let box of this.boxes) {
      box.step(dt);
    }

    /*for (let box of this.boxes) {
      let intersections = box.getIntersections(this.boxes);
      if (intersections.length > 0) {

      }
    }*/
    // check for and resolve intersections/collisions
    // -> walk back along velocity I guess? Do I want to just do the lazy way of pretending it bounced off and reflecting the velocity after projecting it back out of the surface?
    // -> A better way would be to figure out the moments of impact for each detected collision and step backwards to the earliest one and handle the collision properly there
    // -> How do I figure out the exact point of contact if I do things the lazy way?

    // lastly
    this.curr_time = Date.now();
  }

  checkIntersections() {

  }

  applyGravity(dt) {
    for (let box of this.boxes) {
      if (box.affected_by.includes("gravity") && !box.resting) {
        box.addForce(box.center, new THREE.Vector2(0, -this.gravity * dt));
      }
    }
  }

  applyDrag(dt) {
    for (let box of this.boxes) {
      if (box.affected_by.includes("drag")) {
        box.addForce(box.center, box.velocity.clone().multiplyScalar(-1 * this.drag * dt));
      }
    }
  }

  applyInputs(dt) {
    for (let box of this.boxes) {
      if (typeof box.input_state !== "undefined") {
        let pressed = box.input_state;
        //game.setDebugMsg(`Character resting=${box.resting}, jumping=${box.jumping}, space=${pressed.space}`);
        //console.log(this.input_flags);
        if (this.input_flags.jump && pressed.space && box.resting && !box.jumping) {
          this.input_flags.jump = false;
          //game.setDebugMsg("jumping");
          //console.log("jumping");
          if (Math.abs(box.velocity.y) < 1) { // DEBUG, replace with actual contact test
            //game.setDebugMsg("jumped");
            //console.log("jumped");
            box.addForce(box.center, new THREE.Vector2(0, 1000 * 1000 * 6));
            box.jumping = true;
          }
        }
        if (pressed.left) {
          let air_mult = 1;
          if (!box.resting) {
            air_mult = 0.1;
          }
          if (Math.abs(box.velocity.x) < box.max_speed) {
            box.addForce(box.center, new THREE.Vector2(-1000 * 250 * air_mult, 0));
          }
        }
        if (pressed.right) {
          let air_mult = 1;
          if (!box.resting) {
            air_mult = 0.1;
          }
          if (Math.abs(box.velocity.x) < box.max_speed) {
            box.addForce(box.center, new THREE.Vector2(1000 * 250 * air_mult, 0));
          }
        }
      }
    }
  }

  applyFriction(dt) {
    for (let box of this.boxes) {
      if (box.affected_by.includes("friction")) {
        if (box.resting) {
          box.addForce(box.center, new THREE.Vector2(-box.velocity.x * this.friction * dt, 0))
        }
      }
    }
  }

  applyNormalForce(dt) {
    for (let box of this.boxes) {
      if (box.affected_by.includes("normal")) {

      }
    }
  }
}

class Level {
  constructor(name, callback) {
    var req = new XMLHttpRequest();
    req.open("GET", name);
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
    super(position, 35, 0, new THREE.Vector2(0, 1), new THREE.Color(0xffffff));
    this.input_state = {
      left : false,
      right : false,
      up : false,
      down : false,
      space : false
    }
    
    this.fill = true;

    this.jumping = false;

    this.max_speed = 2000;

    this.affected_by = this.affected_by.concat(["gravity", "friction", "drag"]);
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
    if (state) {
      if (map[key] == "space") {
        game.physics.input_flags.jump = true;
      }
      if (map[key] == "left") {
        game.physics.input_flags.left = true;
      }
      if (map[key] == "right") {
        game.physics.input_flags.right = true;
      }
    }
  }
}

class Game {
  constructor() {
    // bind event handlers?
    this.dbg = document.getElementById("debug_text");
    this.dbg_last_update = Date.now();

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
    let dt = Date.now() - this.dbg_last_update;
    if (dt > 100) {
      this.dbg.innerHTML = msg;
      this.dbg_last_update = Date.now();
    }
  }
}

var game = null;
window.addEventListener("load", (e) => {
  game = new Game();
  game.start();
});
