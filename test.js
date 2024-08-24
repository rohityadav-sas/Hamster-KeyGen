async function count(loop) {
    let count = 0;
    console.log(`running count with loop ${loop}`);
    for (let i = 0; i <= loop; i++) {
        console.log(count);
        count++;
        await sleep(0.5);
    }
    console.log('\x1b[32m%s\x1b[0m', `count done with loop ${loop}`);
}

class TrackedPromise {
    constructor(promise) {
        this.state = 'pending';
        this.promise = promise.then(value => {
            this.state = 'fulfilled';
            return value;
        }).catch(error => {
            this.state = 'rejected';
            throw error;
        });
    }
    isPending() {
        return this.state === 'pending';
    }
}

async function sleep(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, time * 1000);
    })
}

let tasks = [
    () => new TrackedPromise(count(4)),
    () => new TrackedPromise(count(8)),
    () => new TrackedPromise(count(12)),
    () => new TrackedPromise(count(16))
];

async function runBatch() {
    let batchSize = 2;
    let activeTasks = [];
    let index = 0;
    while (index < tasks.length) {
        if (activeTasks.length < batchSize) {
            activeTasks.push(tasks[index]());
            index++;
        }
        else {
            await Promise.race(activeTasks.map(task => task.promise));
            activeTasks = activeTasks.filter(task => task.isPending());
        }
    }
}

runBatch();
