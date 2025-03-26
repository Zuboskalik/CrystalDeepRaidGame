document.addEventListener('DOMContentLoaded', () => {
    let yandexGames;
    let player;
    let leaderboard;

    YaGames.init().then(ysdk => {
        yandexGames = ysdk;
        ysdk.features.LoadingAPI?.ready();
        ysdk.getPlayer().then(_player => {
            player = _player;
            loadGameData();
        }).catch(error => {
            console.error('Failed to get player:', error);
        });
        ysdk.getLeaderboards().then(lb => {
            leaderboard = lb;
        }).catch(error => {
            console.error('Failed to get leaderboards:', error);
        });
    }).catch(error => {
        console.error('Yandex SDK initialization failed:', error);
    });

    let gameState = {
        running: false,
        paused: false,
        fuel: 100,
        crystals: 0,
        position: { x: 400, y: 300 },
        velocity: { x: 0, y: 0 },
        weight: 1,
        cargo: 0,
        capacity: 3,
        reviveCost: 1,
        reviveCount: 0,
        subColor: '#00ffff'
    };

    // Элементы игры
    const sub = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    sub.setAttribute('class', 'submarine');
    sub.setAttribute('width', '60');
    sub.setAttribute('height', '30');
    sub.setAttribute('rx', '8');
    sub.setAttribute('fill', gameState.subColor);
    document.getElementById('game').appendChild(sub);

    let resources = [];
    const resourceTypes = ['🔋', '💎'];
    const RESOURCE_LIFETIME = 5000;
    const SPAWN_INTERVAL = 3000;

    // Генерация ресурсов
    function spawnResource() {
        if (!gameState.running || gameState.paused) return;
        
        const type = Math.random() > 0.7 ? resourceTypes[1] : resourceTypes[0];
        const elem = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        
        elem.setAttribute('x', Math.random() * 750 + 25);
        elem.setAttribute('y', '570');
        elem.textContent = type;
        
        const resource = {
            elem,
            type,
            born: Date.now(),
            collected: false
        };
        
        document.getElementById('game').appendChild(elem);
        resources.push(resource);
        
        setTimeout(() => {
            if (!resource.collected) {
                resource.elem.remove();
                resources = resources.filter(r => r !== resource);
            }
        }, RESOURCE_LIFETIME);
    }

    // Проверка столкновений
    function checkCollisions() {
        resources.forEach((resource, index) => {
            const rect = resource.elem.getBoundingClientRect();
            const subRect = sub.getBoundingClientRect();
            
            if (
                rect.left < subRect.right &&
                rect.right > subRect.left &&
                rect.top < subRect.bottom &&
                rect.bottom > subRect.top
            ) {
                resource.collected = true;
                resource.elem.remove();
                resources = resources.filter(r => r !== resource);
                
                if (resource.type === '💎') {
                    if (gameState.cargo < gameState.capacity) {
                        gameState.cargo++;
                        gameState.weight += 0.2;
                    }
                } else if (resource.type === '🔋') {
                    gameState.fuel = Math.min(100, gameState.fuel + 10);
                }
            }
        });
    }

    // Обновление топлива
    function updateFuel() {
        gameState.fuel = Math.max(0, gameState.fuel - 0.02);
        document.querySelector('#fuel .value').textContent = Math.floor(gameState.fuel);
        
        if (gameState.fuel <= 0) {
            gameState.running = false;
            document.getElementById('gameover-overlay').classList.remove('hidden');
            document.getElementById('revive-cost').textContent = gameState.reviveCost;
        }
    }

    // Игровой цикл
    const gameLoop = () => {
        if (!gameState.running || gameState.paused) return;

        // Погружение без нажатий
        gameState.velocity.y += 0.1 * gameState.weight;

        gameState.position.x += gameState.velocity.x;
        gameState.position.y += gameState.velocity.y;
        
        // Границы
        gameState.position.x = Math.max(30, Math.min(gameState.position.x, 770));
        gameState.position.y = Math.max(30, Math.min(gameState.position.y, 560));

        // Обновление позиции
        sub.setAttribute('x', gameState.position.x - 30);
        sub.setAttribute('y', gameState.position.y - 15);

        // Проверка склада
        if (Math.abs(gameState.position.x - 400) < 50 && gameState.position.y < 100) {
            gameState.crystals += gameState.cargo;
            gameState.cargo = 0;
            gameState.weight = 1;
            document.querySelector('#crystals .value').textContent = gameState.crystals;
            document.getElementById('fuel-shop').classList.remove('hidden');
        } else {
            document.getElementById('fuel-shop').classList.add('hidden');
        }

        checkCollisions();
        updateFuel();
        requestAnimationFrame(gameLoop);
    };

    // Обработчики ввода
    const handleInput = (e) => {
        if (!gameState.running || gameState.paused) return;
        
        const speed = 5;
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            gameState.velocity.x = -speed;
            gameState.velocity.y = -speed * 0.6;
        }
        if (e.key === 'ArrowRight' || e.key === 'd') {
            gameState.velocity.x = speed;
            gameState.velocity.y = -speed * 0.6;
        }
        if (e.code === 'Space') togglePause();
    };

    // Запуск игры
    document.getElementById('start-btn').addEventListener('click', () => {
        gameState.running = true;
        document.getElementById('main-menu').classList.add('hidden');
        setInterval(spawnResource, SPAWN_INTERVAL);
        gameLoop();
        spawnResource();
    });

    // Магазин
    document.getElementById('shop-btn').addEventListener('click', () => {
        document.getElementById('shop-menu').classList.remove('hidden');
    });

    document.getElementById('close-shop').addEventListener('click', () => {
        document.getElementById('shop-menu').classList.add('hidden');
    });

    // Покупка улучшений
    document.querySelectorAll('.buy-upgrade').forEach(button => {
        button.addEventListener('click', () => {
            const type = button.getAttribute('data-type');
            if (type === 'capacity' && gameState.crystals >= 5) {
                gameState.capacity += 1;
                gameState.crystals -= 5;
            } else if (type === 'fuel' && gameState.crystals >= 1) {
                gameState.fuel = 100;
                gameState.crystals -= 1;
            } else if (type === 'color' && gameState.crystals >= 3) {
                gameState.subColor = gameState.subColor === '#00ffff' ? '#ff00ff' : '#00ffff';
                sub.setAttribute('fill', gameState.subColor);
                gameState.crystals -= 3;
            }
            document.querySelector('#crystals .value').textContent = gameState.crystals;
        });
    });

    // Покупка топлива около склада
    document.getElementById('buy-fuel').addEventListener('click', () => {
        if (gameState.crystals >= 1) {
            gameState.fuel = 100;
            gameState.crystals -= 1;
            document.querySelector('#crystals .value').textContent = gameState.crystals;
        }
    });

    // Возрождение
    document.getElementById('revive-ad').addEventListener('click', () => {
        if (!yandexGames) return;
        
        yandexGames.adv.showFullscreenAdv({
            callbacks: {
                onClose: (wasShown) => {
                    if (wasShown) {
                        gameState.fuel = 100;
                        document.getElementById('gameover-overlay').classList.add('hidden');
                        gameState.running = true;
                        gameLoop();
                    }
                }
            }
        });
    });

    document.getElementById('revive-crystals').addEventListener('click', () => {
        if (gameState.crystals >= gameState.reviveCost) {
            gameState.crystals -= gameState.reviveCost;
            gameState.reviveCount++;
            gameState.reviveCost = gameState.reviveCount + 1;
            gameState.fuel = 100;
            document.getElementById('gameover-overlay').classList.add('hidden');
            document.querySelector('#crystals .value').textContent = gameState.crystals;
            gameState.running = true;
            gameLoop();
        }
    });

    // Облачные сохранения
    function saveGameData() {
        if (player) {
            player.setData({
                crystals: gameState.crystals,
                capacity: gameState.capacity,
                subColor: gameState.subColor
            });
        }
    }

    function loadGameData() {
        if (player) {
            player.getData().then(data => {
                if (data) {
                    gameState.crystals = data.crystals || 0;
                    gameState.capacity = data.capacity || 3;
                    gameState.subColor = data.subColor || '#00ffff';
                    sub.setAttribute('fill', gameState.subColor);
                    document.querySelector('#crystals .value').textContent = gameState.crystals;
                }
            });
        }
    }

    // Лидерборд
    function updateLeaderboard() {
        if (leaderboard) {
            leaderboard.setLeaderboardScore('crystals', gameState.crystals);
        }
    }

    // Инициализация
    document.addEventListener('keydown', handleInput);
    document.addEventListener('keyup', () => {
        gameState.velocity.x = 0;
    });

    window.togglePause = () => {
        gameState.paused = !gameState.paused;
        document.getElementById('pause-overlay').style.display = 
            gameState.paused ? 'block' : 'none';
        if (!gameState.paused) gameLoop();
    };

    // Периодическое сохранение и обновление лидерборда
    setInterval(() => {
        saveGameData();
        updateLeaderboard();
    }, 60000); // Каждую минуту
});