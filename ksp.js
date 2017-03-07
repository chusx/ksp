/*
    kinetic science project
    a: chris@nibor.cc
    d: 2017-03-04
    (c) kspga.me
    https://www.gnu.org/licenses/gpl-3.0.en.html
*/

function ksp () {

    "use strict"; 
    var pi = Math.PI;

    var Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        World = Matter.World,
        Body = Matter.Body,
        Bodies = Matter.Bodies,
        Common = Matter.Common,
        Events = Matter.Events,
        Composite = Matter.Composite,
        Composites = Matter.Composites,
        Vector = Matter.Vector,
        Vertices = Matter.Vertices,
        Bounds = Matter.Bounds,
        Mouse = Matter.Mouse,
        MouseConstraint = Matter.Constraint;

    var state = {
        debug: false,
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        g: 0.01,
        hud: true,
        tick: 0,
        zoom: 1
    }

    var ship = Bodies.rectangle(state.width / 2, state.height - 310, 30, 5, {
            name: "ad astra",
            maxThrust: 0.000009,  
            thrust: 0, 
            throttle: 0,
            yaw: 0.000007,
            joystick: true,
            joystickThrust: 0.000003,
            frictionAir: 0,
            angle: pi * 3 / 2,
            rcs: false,
            sas: false,
            render: { 
                fillStyle: 'white',
                strokeStyle: 'white'
            } 
    });
    state.where = { x: ship.position.x, y: ship.position.y }; // retain values only

    var launchpad = Bodies.trapezoid(state.width / 2, state.height - 300, 50, 10, 0.2, {
            render: { 
                fillStyle: 'grey',
                strokeStyle: 'grey'
            } 
    });
    var moon = Bodies.circle(state.width / 2, state.height + 100, 400, { 
            angle: 0.1, 
            render: { 
                fillStyle: '#110020',
                strokeStyle: '#110020'
            } 
    });
    var box = Bodies.rectangle(state.width * 0.2, state.height * 0.5, 10, 10);

    var matter = []; // with newtonian gravitation
    matter.push(ship, moon, box, launchpad);

    var engine = Engine.create(), 
        world = engine.world;
    engine.velocityIterations = 5;
    engine.positionIterations = 5;
    world.gravity.y = 0;
    Engine.run(engine);

    var runner = Runner.create();
    Runner.run(runner, engine);

    var render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: state.width,
            height: state.height,
            background: 'black',
            wireframeBackground: 'black',
            hasBounds: true,
            wireframes: false
        }
    });
    Render.run(render);

    World.add(world, matter);

    var keymap = {}; // shift and control
    document.onkeydown = document.onkeyup = function (e) {
        if (e.target.nodeName == 'BODY') {
            e.preventDefault();
            keymap[e.which] = e.type == 'keydown';
            if (e.which == 84 && e.type == 'keydown') { // t
                ship.sas = ship.sas ? false : true;
            }
            if (e.which == 82 && e.type == 'keydown') { // r
                ship.rcs = ship.rcs ? false : true;
            }
        }
    }

    var gui = new dat.GUI();
    gui.add(state, 'debug');
    gui.add(state, 'hud');
    var guiShip = gui.addFolder('ship');
    guiShip.open();
    guiShip.add(ship, 'name');
    guiShip.add(ship, 'joystick');
    guiShip.add(ship, 'maxThrust', 0.000001, 0.00001);
    guiShip.add(ship, 'yaw', 0.000001, 0.00001);

    Events.on(engine, "beforeTick", function (event) {
        for (var i = 0; i < matter.length; i++) {
            for (var j = i + 1; j < matter.length; j++) {
                newtonian(matter[i], matter[j], state.g);
            }
        }

        if (ship.sas) {
            Body.setAngularVelocity(ship, 0);
        }

        if (keymap[81]) { // q
            ship.torque -= ship.yaw;
        } else if (keymap[69]) { // e
            ship.torque += ship.yaw;
        }

        if (keymap[16] && ship.throttle < 100) { // shift
            ship.throttle += 1;
        } else if (keymap[17] && ship.throttle > 0) { // control
            ship.throttle -= 1;
        }

        ship.thrust = ship.throttle * ship.maxThrust / 100;
        Body.applyForce(ship, ship.position, 
                Vector.mult(heading(ship.angle), ship.thrust));

        if (ship.joystick) {
            joystick(ship, keymap);
        }

        render.options.wireframes = render.options.showDebug = render.options.showVelocity =
            render.options.showAngleIndicator = render.options.showCollisions = state.debug ? true : false;
            
        if (state.hud) {
            document.getElementById("hud").innerHTML = '<table class="tt">' +
                '<tr><td>name: </td><td>' + ship.name + '</td></tr>' + 
                '<tr><td>t+ </td><td>' + ~~(state.tick / 1000)  + ' s</td></tr>' + 
                '<tr><td>throttle: </td><td>' + ship.throttle  + ' %</td></tr>' + 
                '<tr><td>speed: </td><td>' + ship.speed.toFixed(2) + '</td></tr>' + 
                '<tr><td>force: </td><td>' + Vector.magnitude(ship.force).toFixed(10) + '</td></tr>' + 
                '<tr><td>heading: </td><td>' + ((ship.angle * 57.3 % 360 + 360) % 360).toFixed(2)  + ' °</td></tr>' +  // degrees
                '<tr><td>rcs: </td><td>' + (ship.rcs ? 'active' : 'off')  + '</td></tr>' + 
                '<tr><td>sas: </td><td>' + (ship.sas ? 'active' : 'off')  + '</td></tr>' +  
                '</table>';
        } else {
            document.getElementById("hud").innerHTML = '';
        }

        state.tick = engine.timing.timestamp;

        Bounds.translate(render.bounds, Vector.sub(ship.position, state.where)); // viewport on ship
        state.where = { x: ship.position.x, y: ship.position.y }; 
    });

    function heading (angle) {
        return { x: Math.cos(angle), y: Math.sin(angle) };
    }

    function joystick (ship, keymap) {
        if (keymap[87]) { // w
            Body.applyForce(ship, ship.position, 
                    Vector.mult(heading(pi * 1.5), ship.joystickThrust));
        } else if (keymap[83]) { // s
            Body.applyForce(ship, ship.position, 
                    Vector.mult(heading(pi * 0.5), ship.joystickThrust));
        }
        if (keymap[65]) { // a
            Body.applyForce(ship, ship.position, 
                    Vector.mult(heading(pi * 1), ship.joystickThrust));
        } else if (keymap[68]) { // d
            Body.applyForce(ship, ship.position, 
                    Vector.mult(heading(0), ship.joystickThrust));
        }
    }

    function newtonian (m1, m2, G) {
        // f = G * mass1 * mass2 / radius ^ 2
        var d = Vector.sub(m2.position, m1.position);
        var f = Vector.mult(Vector.normalise(d), 
                    G * m1.mass * m2.mass / Vector.magnitudeSquared(d));
        Vector.mult(f, engine.timing.timestamp - state.tick); // scale to delta
        Body.applyForce(m1, m1.position, f);
        Body.applyForce(m2, m2.position, Vector.neg(f));
    }
}

function visible () {
    var text = document.getElementById('helptext');
    var toggle = document.getElementById('helptoggle');
    if (text.style.display == 'block') {
        text.style.display = 'none';
        toggle.innerHTML = '[show help]';
    } else {
        text.style.display = 'block';
        toggle.innerHTML = '[hide help]';
    }
}
