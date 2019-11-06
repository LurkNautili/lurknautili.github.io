var utils = {
  testLineIntersect : function(a1x, a1y, a2x, a2y, b1x, b1y, b2x, b2y) {
    let intersects = false;
    // if (a1x === b1x && a1y === b1y || a2x === b2x && a2y === b2y) {
    //   intersects = true;
    // }
    let s = 0;
    let t = 0;
    // else {
      let va = {
        x: a2x - a1x,
        y: a2y - a1y
      };
      let vb = {
        x: b2x - b1x,
        y: b2y - b1y
      };
      let determinant = vb.x * va.y - va.x * vb.y;
      if (determinant !== 0) {
        let inv_d = 1 / determinant;
        s = inv_d * ((a1x - b1x) * va.y - (a1y - b1y) * va.x);
        t = inv_d * (-(a1x - b1x) * vb.y + (a1y - b1y) * vb.x);
        sim.setDbgTxt("s: " + s + ", t: " + t);
        if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
          intersects = true;
        }
      }
      else {
        sim.setDbgTxt("Determinant 0");
      }
    // }
    return {s, t};
  },

  generateUUID : function() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = (performance && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
}

var SETTINGS = {
  CANVAS : {
    BACKGROUND_COLOR : "#333"//"#253515"
  },
  NODE : {
    RADIUS : 5,
    DEFAULT_COLOR : "#ddd",
    HOVERED_COLOR : "#f88",
    SELECTED_COLOR : "#f00"
  },
  EDGE : {
    THICKNESS : 4,
    DEFAULT_COLOR : "#888"
  }
}

class PriorityQueue {
  constructor(is_min = true) {
    this.min_heap = is_min; // which way are we ordering
    this.heap = [];
    // Thinking of allowing identical priorities by binding them together in arrays
    /* min heap
    [ 
      { priority: 0, elements_with_this_priority: [ payload1, payload2, ... ] },
      { priority: 3, elements_with_this_priority: [ payload3 ] }
    ]
    */
  }

  /*parentIndex(i) {
    return Math.floor((i - 1) / 2);
  }
  // I'll probably just inline these in code
  childIndices(i) {
    return {
      left: 2 * i + 1,
      right: 2 * i + 2
    }
  }*/

  // Return the root / top priority entry without removing it 
  top() {
    return (typeof this.heap[0] === "object" ? this.heap[0].el : null);
  }

  // Return array of elements with shared highest priority (usually just 1), removing it from the queue
  pop() {
    // return top element
    // remove top element
    // move bottom element to top
    // repair the heap (sift-down)
  }

  // Add element to priority queue
  push(el, priority) {
    // Add to the end of the array (bottom of heap/tree)
    // repair the heap (sift-up)
  }

  replace() {

  }
}

class ViewRect {
  constructor(x = 0, y = 0, width = 100, height = 100) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.center = {
      x: this.x + width * 0.5,
      y: this.y + height * 0.5
    }
    this.zoom = 1;
  }

  onResize(width, height) {
    this.width = width;
    this.height = height;
    this.x = this.center.x - width * 0.5;
    this.y = this.center.y - height * 0.5;
  }

  translate(x, y) {
    this.x += x;
    this.y += y;
    
    document.getElementById("debug_text").innerText = "vo_x: " + this.x + ", vo_y: " + this.y;
  }

  // factor > 1 zooms in, 0 < factor < 1 zooms out
  zoom(factor = 1, center = this.center) {
    if (factor === 1 || factor <= 0) {
      return;
    }

    this.zoom *= factor;
    this.width = this.width / factor;
    this.height = this.height / factor;
    this.x = center.x - 0.5 * this.width;
    this.y = center.y - 0.5 * this.height;
  }

  contains(x, y, margin = 0) {
    return (x + margin >= this.x && x - this.x <= this.width + margin && y + margin >= this.y && y - this.y <= this.height + margin);
  }

  intersectsLine(start, end) {
    let intersects = false;
    let makeCorner = ((i, j) => {
      return {
        x: this.center.x + this.width * 0.5 * i,
        y: this.center.y + this.height * 0.5 * j
      }
    }).bind(this);
    let view_corners = [];
    view_corners.push(makeCorner(-1, -1));
    view_corners.push(makeCorner( 1, -1));
    view_corners.push(makeCorner( 1,  1));
    view_corners.push(makeCorner(-1,  1));
    let view_edges = [];
    for (let i = 0; i < view_corners.length; ++i) {
      view_edges.push({
        start : view_corners[i],
        end : view_corners[(i + 1) % view_corners.length]
      });
    }
    //console.log(view_edges);
    let txt = "\n";
    for (let edge of view_edges) {
      //txt += "Testing [" + start.x + ", " + start.y + "] -> [" + end.x + ", " + end.y + "] vs [" + edge.start.x + ", " + edge.start.y + "] -> [" + edge.end.x + ", " + edge.end.y + "]\n";
      let obj = utils.testLineIntersect(start.x, start.y, end.x, end.y, edge.start.x, edge.start.y, edge.end.x, edge.end.y);
      let t = obj.t;
      let s = obj.s;
      txt += "t: " + t + ", s: " + s + "\n";
      intersects = t >= 0 &&  t <= 1 && s >= 0 && s <= 1;
      if (intersects) {
        break;
      }
    }
    sim.setDbgTxt(txt);
    return intersects;
  }

  toWorldCoords(vx, vy) {
    return {
      x : vx + this.x,
      y : vy + this.y
    };
  }

  toViewCoords(gx, gy) {
    return {
      x : gx - this.x,
      y : gy - this.y
    };
  }
}

class SimObject {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  translate(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  onMouseDown() {
    console.log("onMouseDown() not implemented for " + this.constructor.name);
  }

  onMouseUp() {
    console.log("onMouseUp() not implemented for " + this.constructor.name);
  }

  onMouseMove() {
    console.log("onMouseMove() not implemented for " + this.constructor.name);
  }

  draw() {
    console.log("draw() not implemented for " + this.constructor.name);
  }
}

class Node extends SimObject {
  constructor(x = 0, y = 0) {
    super(x, y);
    this.radius = SETTINGS.NODE.RADIUS;
    this.selected = false;
    this.hovered = false;
    this.color = SETTINGS.NODE.DEFAULT_COLOR;
    this.connections = [];
    this.uuid = utils.generateUUID();
    //sim.setDbgTxt("x: " + x + ", y: " + y);
  }

  draw(ctx, view) {
    let dbg_drawn = false;
    if (view.contains(this.x, this.y, 5)) {
      ctx.beginPath();
      ctx.fillStyle = this.color;
      let center = view.toViewCoords(this.x, this.y);//{ x: this.x+view.x, y: this.y+view.y };
      let radius = { x: this.radius, y: this.radius };
      let rotation = 0;
      let angle = { start: 0, end: 2*Math.PI };
      ctx.ellipse(center.x, center.y, radius.x, radius.y, rotation, angle.start, angle.end);
      ctx.fill();
      //document.getElementById("debug_text").innerText = "true";
      dbg_drawn = true;
    }
    else {
      //document.getElementById("debug_text").innerText = "false";
    }
    return dbg_drawn;
  }

  // Contains all points within twice this node's radius, to prevent overlapping radii
  contains(pt_x, pt_y) {
    return (this.x - pt_x) * (this.x - pt_x) + (this.y - pt_y) * (this.y - pt_y) <= 4 * this.radius * this.radius;
  }

  select() {
    this.selected = true;
    this.color = SETTINGS.NODE.SELECTED_COLOR;
  }

  deselect() {
    this.selected = false;
    this.color = SETTINGS.NODE.DEFAULT_COLOR;
  }

  hover() {
    if (!this.selected && !this.hovered) {
      this.color = SETTINGS.NODE.HOVERED_COLOR;
      this.hovered = true;
    }
  }

  translate(dx, dy) {
    this.x += dx;
    this.y += dy;
    for (let c of this.connections) {
      c.updateLength();
    } 
  }

  unhover() {
    if (!this.selected && this.hovered) {
      this.color = SETTINGS.NODE.DEFAULT_COLOR;
      this.hovered = false;
    }
  }
}

class Edge extends SimObject {
  constructor(from, to) {
    super();
    this.from = from;
    this.to = to;
    this.length_sq = (from.x - to.x) * (from.x - to.x) + (from.y - to.y) * (from.y - to.y);
    this.color = SETTINGS.EDGE.DEFAULT_COLOR;
  }

  draw(ctx, view) {
    //let pt1 = view.toViewCoords(this.from.x, this.from.y);
    //let pt2 = view.toViewCoords(this.to.x, this.to.y);
    let drawn = false;
    if (
      //view.intersectsLine(pt1, pt2)
      view.contains(this.from.x, this.from.y) || view.contains(this.to.x, this.to.y) // TODO:   this is kind of broken but it's less broken than my first attempt at replacing it
      ) {
      ctx.beginPath();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = SETTINGS.EDGE.THICKNESS;
      let p1_view = view.toViewCoords(this.from.x, this.from.y);
      let p2_view = view.toViewCoords(this.to.x, this.to.y);
      ctx.moveTo(p1_view.x, p1_view.y);
      ctx.lineTo(p2_view.x, p2_view.y);
      ctx.stroke();
      drawn = true;
    }
    return drawn;
  }

  other(node) {
    if (node === this.from) {
      return this.to;
    }
    else if (node === this.to) {
      return this.from;
    }
    else {
      return null;
    }
  }

  updateLength() {
    let a = this.from;
    let b = this.to;
    this.length_sq = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
  }
}

class Path extends SimObject {
  constructor() {
    super();
    this.edges = [];
    this.nodes = [];
  }


  paintEdges(color) {
    for (let e of this.edges) {
      e.color = color;
    }
  }

  paintNodes(color) {
    for(let n of this.nodes) {
      n.color = color;
    }
  }

  length() {
    let len_accumulator = 0;
    for (let e of this.edges) {
      len_accumulator += Math.sqrt(e.length_sq);
    }
    return len_accumulator;
  }
}

class Graph extends SimObject {
  constructor(x = 0, y = 0) {
    super();
    this.nodes = [];
    this.edges = [];
    this.root = new Node(x, y);
    this.active_node = this.root;
    this.dragging_node = true;
    this.nodes.push(this.root);
  }

  addNode(x, y) {
    if (this.active_node) {
      let node = new Node(x, y);
      this.addEdge(this.active_node, node);
      this.setActive(node);
      this.nodes.push(node);
    }
  }
  
  addEdge(node_a, node_b) {
    let edge = new Edge(node_a, node_b);
    node_a.connections.push(edge);
    node_b.connections.push(edge);
    this.edges.push(edge);
  }

  setActive(node) {
    if (this.active_node) {
      this.active_node.deselect();
    }
    node.select();
    this.active_node = node;
  }

  deleteActive() {
    for (let c of this.active_node.connections) {
      let other = c.other(this.active_node);
      /*if (c.from !== this.active_node) {
        other = c.from;
      }
      else if (c.to !== this.active_node) {
        other = c.to;
      }*/
      if (other === null) {
        continue;
      }
      let ind = other.connections.indexOf(c);
      if (ind >= 0) {
        other.connections.splice(ind, 1);
        //c.to = null is superfluous because c should be garbage collected next once it's removed from this.edges
      }
      let edge_ind = this.edges.indexOf(c);
      if (edge_ind >= 0) {
        this.edges.splice(edge_ind, 1);
      }
    }
    let node_ind = this.nodes.indexOf(this.active_node);
    if (node_ind >= 0) {
      this.nodes.splice(node_ind, 1);
    }
    if (this.active_node === this.root) {
      if (this.nodes.length > 0) {
        this.root = this.nodes[0];
      }
    }
    this.active_node = null;
  }

  draw(ctx, view) {
    let edgecount = 0;
    let nodecount = 0;
    for (let e of this.edges) {
      let drawn = e.draw(ctx, view);
      if (drawn) edgecount++;
    }
    for (let n of this.nodes) {
      let drawn = n.draw(ctx, view);
      if (drawn) nodecount++;
    }
    //sim.setDbgTxt("Drawing " + nodecount + " nodes and " + edgecount + " edges");
  }

  onMouseDown(e) {
    let pt = sim.view.toWorldCoords(e.x, e.y);
    let intersected_node = null;
    for (let o of this.nodes) { // TODO: replace array with spatial index
      if (o.contains(pt.x, pt.y)) {
        intersected_node = o;
        break;
      }
    }
    if (intersected_node == null) {
      if (this.active_node) {
        //this.objects.push(new Node(pt.x, pt.y));
        this.addNode(pt.x, pt.y);
        this.dragging_node = true;
      }
    }
    else {
      if (this.active_node) {
        if (e.ctrlKey) {
          this.addEdge(this.active_node, intersected_node);
          this.setActive(intersected_node);
        }
        else if (e.shiftKey) {
          let path = this.findPath(this.active_node, intersected_node);
          path.paintEdges("#6a3");
          console.log(path.length());
          setTimeout(path.paintEdges.bind(path), 2000, SETTINGS.EDGE.DEFAULT_COLOR);
          this.active_node.deselect();
        }
        else {
          this.active_node.deselect();
        }
      }
      intersected_node.select();
      this.active_node = intersected_node;
      this.dragging_node = true;
    }
  }

  onMouseUp(e) {
    this.dragging_node = false;
  }

  onMouseMove(e) {
    if (this.dragging_node) {
      this.active_node.translate(e.movementX, e.movementY);
      let txt = "Edge lengths (squared):\n";
      for (let e of this.edges) {
        txt += e.length_sq + "\n";
      }
      sim.setDbgTxt(txt);
    }
    else {
      for (let n of this.nodes) {
        let pt = sim.view.toWorldCoords(e.x, e.y);
        if (n.contains(pt.x, pt.y)) {
          n.hover();
        }
        else {
          n.unhover();
        }
      }
    }
  }

  findPath(start, end) {
    let distanceSq = (a, b) => {
      return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
    };
    let fringe = [];
    // let start_node_wrapper = {
    //   node : start,
    //   prev : null
    // };
    let g_score = new Map();
    let f_score = new Map();
    let came_from = new Map();
    g_score[start.uuid] = 0;
    f_score[start.uuid] = distanceSq(start, end);
    fringe.push(start);
    while (fringe.length > 0) {
      let curr = null;
      let hiscore = Infinity;
      for (let f of fringe) {
        if (f_score[f.uuid] < hiscore) {
          hiscore = f_score[f.uuid];
          curr = f;
        }
      }
      if (curr === end) {
        // done, make path
        let path = new Path();
        let trace = curr;
        while (typeof came_from[trace.uuid] !== "undefined") {
          path.nodes.push(trace);
          let common_edge = null;
          let next = came_from[trace.uuid];
          for (let c1 of trace.connections) {
            for (let c2 of next.connections) {
              if (c1 === c2) {
                common_edge = c1;
                break;
              }
            }
          }
          if (common_edge !== null ) {
            path.edges.push(common_edge);
          }
          trace = next;
        }
        return path;
      }
      else {
        fringe.splice(fringe.indexOf(curr), 1);
        for (let c of curr.connections) {
          let neighbor = c.other(curr);
          let new_g_score = g_score[curr.uuid] + c.length_sq;
          let neighbor_gscore = typeof g_score[neighbor.uuid] !== "undefined" ? g_score[neighbor.uuid] : Infinity;
          if (new_g_score < neighbor_gscore) {
            came_from[neighbor.uuid] = curr;
            g_score[neighbor.uuid] = new_g_score;
            f_score[neighbor.uuid] = g_score[neighbor.uuid] + distanceSq(neighbor, end);
            if (!fringe.includes(neighbor)) {
              fringe.push(neighbor);
            } 
          }
        }
      }
    }
    return null;
  }
}

class Agent extends SimObject {
  constructor() {
    super();
  }
}

// class KeyFlags {
//   constructor(/*name = "DEFAULTKEY", props = {}*/) {
//     //this.name = 
//     this.pressed = false;
//     this.
//   }
// }

class Simulation {
  constructor() {
    this.aspect_ratio = 1.777;
    this.canvas = null;
    this.context = null;
    this.framespin = 0;
    this.view = null;
    this.dbg_txt = null;
    this.objects = [];
    this.graph = null;
    this.keys = {
      "leftmouse" : {
        dragging : false
      },
      "middlemouse" : {
        dragging : false
      },
      "rightmouse" : {
        dragging : false
      }
    };
  }

  setDbgTxt(txt) {
    this.dbg_text.innerText = txt;
  }

  start() {
    this.canvas = document.getElementById("canvas");
    this.context = this.canvas.getContext("2d");
    this.dbg_text = document.getElementById("debug_text");

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerWidth / this.aspect_ratio;
    let txt = "Canvas width: " + this.canvas.width + ", height: " + this.canvas.height;
    txt += "\nContext width: " + this.context.canvas.width + ", height: " + this.context.canvas.height;
    txt += "\n Aspect ratio: " + this.aspect_ratio;
    this.canvas.style.width = this.canvas.width + "px";
    this.canvas.style.height = this.canvas.height + "px";
    this.setDbgTxt(txt);

    this.view = new ViewRect(0, 0, this.canvas.width, this.canvas.height);

    window.addEventListener("resize", (() => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerWidth / this.aspect_ratio;
      this.view.onResize(this.canvas.width, this.canvas.height);
      let txt = "Canvas width: " + this.canvas.width + ", height: " + this.canvas.height;
      txt += "\nContext width: " + this.context.canvas.width + ", height: " + this.context.canvas.height;
      txt += "\n Aspect ratio: " + this.aspect_ratio;
      this.setDbgTxt(txt);
      this.canvas.style.width = this.canvas.width + "px";
      this.canvas.style.height = this.canvas.height + "px";
    }).bind(this), false);

    // register input event handlers
    window.addEventListener("keydown", (e) => {if (e.repeat) return; else this.onKeyEvent(e.key, true);});
    window.addEventListener("keyup", (e) => {if (e.repeat) return; else this.onKeyEvent(e.key, false);});
    this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
    this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
  

    window.requestAnimationFrame(this.render.bind(this));
  }

  onKeyEvent(key, down) {
    this.setDbgTxt(key);
    if (down && key === "w") {
      //
    }
    if (down && (key === "Delete" || key === "x")) {
      if (this.graph) {
        this.graph.deleteActive();
      }
    }
  }

  onMouseDown(e) {
    switch (e.button) {
      case 0:
        //this.setDbgTxt("mouse1");
        if (this.graph) {
          this.graph.onMouseDown(e);
        }
        else {
          let pt = this.view.toWorldCoords(e.x, e.y);
          this.graph = new Graph(pt.x, pt.y);
        }
        this.keys["leftmouse"].dragging = true;
        break;
      case 1:
        //this.setDbgTxt("mouse3");
        this.keys["middlemouse"].dragging = true;
        break;
      case 2:
        //this.setDbgTxt("mouse2");
        break;
    }
  }

  onMouseUp(e) {
    switch (e.button) {
      case 0:
        if (this.graph) {
          this.graph.onMouseUp(e);
        }
        this.keys["leftmouse"].dragging = false;
        break;
      case 1:
        this.keys["middlemouse"].dragging = false;
        break;
      case 2:
        break;
    }
  }

  onMouseMove(e) {
    if (this.keys["middlemouse"].dragging) {
      this.view.translate(-e.movementX, -e.movementY);
      
      //this.setDbgTxt("vx: " + this.view.x + ", vy: " + this.view.y);
    }
    if (this.keys["leftmouse"].dragging) {

    }
    if (this.graph) {
      this.graph.onMouseMove(e);
    }
  }

  render() {
    // drawing goes here

    // draw background
    this.framespin = (this.framespin + 1) % 165;
    let ctx = this.context;
    ctx.fillStyle = SETTINGS.CANVAS.BACKGROUND_COLOR;//this.framespin > 83 ? "#907070" : "#707090";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // draw objects
    if (this.graph) {
      this.graph.draw(ctx, this.view);
    }
    // 
    window.requestAnimationFrame(this.render.bind(this));
  }
}

var sim = null;
window.addEventListener("load", (e) => {
  sim = new Simulation();
  sim.start();
});
