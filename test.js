const commands = {
    '/bike': 'Bike_keys.json',
    '/cube': 'Cube_keys.json',
    '/clone': 'Clone_keys.json',
    '/train': 'Train_keys.json',
    '/merge': 'Merge_keys.json',
    '/twerk': 'Twerk_keys.json'
};

Object.entries(commands).forEach(([game, file]) => {
    let command = `/generate${game.replace('/', '').charAt(0).toUpperCase() + game.slice(2)}keys`;
    console.log(command);
});