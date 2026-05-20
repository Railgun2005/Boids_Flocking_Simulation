const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const boids = [];

const BOID_COUNT = 200;

const MAX_SPEED = 3;
const MAX_FORCE = 0.05;

const VIEW_RADIUS = 50;
const VIEW_RADIUS_SQ =
    VIEW_RADIUS * VIEW_RADIUS;

const SEPARATION_RADIUS = 25;
const SEPARATION_RADIUS_SQ =
    SEPARATION_RADIUS * SEPARATION_RADIUS;

const WALL_PADDING = 1;

function resizeCanvas() {

    canvas.width = window.innerWidth;

    canvas.height = window.innerHeight;
}

resizeCanvas();

window.addEventListener(
    "resize",
    () => {

        resizeCanvas();

        for (const boid of boids) {

            boid.position.x =
                Math.max(
                    0,
                    Math.min(
                        boid.position.x,
                        canvas.width
                    )
                );

            boid.position.y =
                Math.max(
                    0,
                    Math.min(
                        boid.position.y,
                        canvas.height
                    )
                );
        }
    }
);

class Vector {

    constructor(x = 0, y = 0) {

        this.x = x;
        this.y = y;
    }

    add(v) {

        this.x += v.x;
        this.y += v.y;

        return this;
    }

    sub(v) {

        this.x -= v.x;
        this.y -= v.y;

        return this;
    }

    mult(n) {

        this.x *= n;
        this.y *= n;

        return this;
    }

    div(n) {

        this.x /= n;
        this.y /= n;

        return this;
    }

    mag() {
        return Math.sqrt(
            this.x * this.x +
            this.y * this.y
        );
    }

    normalize() {

        const magSq =
            this.x * this.x +
            this.y * this.y;

        if (magSq > 0) {

            const mag =
                Math.sqrt(magSq);

            this.x /= mag;
            this.y /= mag;
        }

        return this;
    }

    // OPTIMIZED LIMIT
    limit(max) {

        const magSq =
            this.x * this.x +
            this.y * this.y;

        if (magSq > max * max) {

            const mag =
                Math.sqrt(magSq);

            this.x =
                (this.x / mag) * max;

            this.y =
                (this.y / mag) * max;
        }

        return this;
    }

    copy() {

        return new Vector(
            this.x,
            this.y
        );
    }
}

class Boid {

    constructor() {

        this.position = new Vector(
            Math.random() * canvas.width,
            Math.random() * canvas.height
        );

        // Stable velocity init
        const angle =
            Math.random() *
            Math.PI *
            2;

        this.velocity =
            new Vector(
                Math.cos(angle),
                Math.sin(angle)
            );

        this.velocity.mult(
            MAX_SPEED
        );

        this.acceleration =
            new Vector();
    }

    edges() {

        if (
            this.position.x >
            canvas.width
        ) {

            this.position.x =
                canvas.width -
                WALL_PADDING;

            this.velocity.x *= -1;
        }

        else if (
            this.position.x < 0
        ) {

            this.position.x =
                WALL_PADDING;

            this.velocity.x *= -1;
        }

        if (
            this.position.y >
            canvas.height
        ) {

            this.position.y =
                canvas.height -
                WALL_PADDING;

            this.velocity.y *= -1;
        }

        else if (
            this.position.y < 0
        ) {

            this.position.y =
                WALL_PADDING;

            this.velocity.y *= -1;
        }
    }

    align(boids) {

        let steering =
            new Vector();

        let total = 0;

        for (const other of boids) {

            if (other === this)
                continue;

            // OPTIMIZED:
            // No temporary vectors
            const dx =
                other.position.x -
                this.position.x;

            const dy =
                other.position.y -
                this.position.y;

            const distSq =
                dx * dx + dy * dy;

            if (
                distSq <
                VIEW_RADIUS_SQ
            ) {

                steering.add(
                    other.velocity
                );

                total++;
            }
        }

        if (total > 0) {

            steering.div(total);

            steering.normalize();

            steering.mult(
                MAX_SPEED
            );

            steering.sub(
                this.velocity
            );

            steering.limit(
                MAX_FORCE
            );
        }

        return steering;
    }

    cohesion(boids) {

        let steering =
            new Vector();

        let total = 0;

        for (const other of boids) {

            if (other === this)
                continue;

            const dx =
                other.position.x -
                this.position.x;

            const dy =
                other.position.y -
                this.position.y;

            const distSq =
                dx * dx + dy * dy;

            if (
                distSq <
                VIEW_RADIUS_SQ
            ) {

                steering.add(
                    other.position
                );

                total++;
            }
        }

        if (total > 0) {

            steering.div(total);

            steering.sub(
                this.position
            );

            steering.normalize();

            steering.mult(
                MAX_SPEED
            );

            steering.sub(
                this.velocity
            );

            steering.limit(
                MAX_FORCE
            );
        }

        return steering;
    }

    separation(boids) {

        let steering =
            new Vector();

        let total = 0;

        for (const other of boids) {

            if (other === this)
                continue;

            const dx =
                this.position.x -
                other.position.x;

            const dy =
                this.position.y -
                other.position.y;

            const distSq =
                dx * dx + dy * dy;

            if (
                distSq <
                SEPARATION_RADIUS_SQ &&
                distSq > 0
            ) {

                // OPTIMIZED:
                // No Vector allocations
                steering.x +=
                    dx / distSq;

                steering.y +=
                    dy / distSq;

                total++;
            }
        }

        if (total > 0) {

            steering.div(total);

            steering.normalize();

            steering.mult(
                MAX_SPEED
            );

            steering.sub(
                this.velocity
            );

            steering.limit(
                MAX_FORCE
            );
        }

        return steering;
    }

    flock(boids) {

        const alignment =
            this.align(boids);

        const cohesion =
            this.cohesion(boids);

        const separation =
            this.separation(boids);

        separation.mult(1.2);

        this.acceleration.add(
            alignment
        );

        this.acceleration.add(
            cohesion
        );

        this.acceleration.add(
            separation
        );
    }

    update() {

        this.velocity.add(
            this.acceleration
        );

        this.velocity.limit(
            MAX_SPEED
        );

        this.position.add(
            this.velocity
        );

        this.acceleration.mult(0);
    }

    draw() {

        const angle =
            Math.atan2(
                this.velocity.y,
                this.velocity.x
            );

        ctx.save();

        ctx.translate(
            this.position.x,
            this.position.y
        );

        ctx.rotate(angle);

        ctx.beginPath();

        ctx.moveTo(10, 0);

        ctx.lineTo(-10, 5);

        ctx.lineTo(-10, -5);

        ctx.closePath();

        ctx.fillStyle =
            "white";

        ctx.fill();

        ctx.restore();
    }
}

for (
    let i = 0;
    i < BOID_COUNT;
    i++
) {

    boids.push(
        new Boid()
    );
}

function animate() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    for (const boid of boids) {

        boid.edges();

        boid.flock(boids);

        boid.update();

        boid.draw();
    }

    requestAnimationFrame(
        animate
    );
}

animate();