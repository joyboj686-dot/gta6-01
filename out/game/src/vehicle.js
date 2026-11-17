// vehicle.js - a simple top-down car model: position, heading, forward speed
// and steering. Used for the player's driveable cars and for AI traffic and
// police cars alike. Collision against buildings/walls is handled in world.js.

import { CAR_LENGTH, CAR_WIDTH } from './config.js';

export class Vehicle {
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.heading = opts.heading ?? 0; // radians, 0 = facing +x
    this.speed = opts.speed ?? 0;     // signed forward speed
    this.maxSpeed = opts.maxSpeed ?? 12;
    this.accel = opts.accel ?? 15;
    this.turn = opts.turn ?? 3.0;
    this.color = opts.color ?? '#cc2233';
    this.isCop = opts.isCop ?? false;
    this.driven = false; // true when the player occupies it
    this.steer = 0;
    this.rearX = 0;
    this.rearY = 0;
  }

  // Apply throttle [-1..1] and steer [-1..1] over dt seconds.
  drive(throttle, steer, dt) {
    if (throttle > 0) {
      this.speed += this.accel * throttle * dt;
      if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    } else if (throttle < 0) {
      this.speed += this.accel * 0.6 * throttle * dt;
      if (this.speed < -this.maxSpeed * 0.4) this.speed = -this.maxSpeed * 0.4;
    } else {
      // coast down to a stop
      const drag = 9;
      if (this.speed > 0.2) this.speed -= drag * dt;
      else if (this.speed < -0.2) this.speed += drag * dt;
      else this.speed = 0;
    }
    this.heading += steer * this.turn * (this.speed > 0 ? 1 : -1) * dt;
    this.integrate(dt);
  }

  integrate(dt) {
    // Rear-axle point turns; the body is drawn around the centre.
    let rearX = this.x - Math.cos(this.heading) * CAR_LENGTH * 0.3;
    let rearY = this.y - Math.sin(this.heading) * CAR_LENGTH * 0.3;
    rearX += Math.cos(this.heading) * this.speed * dt;
    rearY += Math.sin(this.heading) * this.speed * dt;
    this.x = rearX + Math.cos(this.heading) * CAR_LENGTH * 0.3;
    this.y = rearY + Math.sin(this.heading) * CAR_LENGTH * 0.3;
  }

  brakeForce(dt) {
    if (this.speed > 0.5) this.speed -= 40 * dt;
    else if (this.speed < -0.5) this.speed += 40 * dt;
    else this.speed = 0;
  }
}