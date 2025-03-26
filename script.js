// script.js
document.addEventListener('DOMContentLoaded', () => {
    const game = document.getElementById('game');
    const submarine = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    let yPos = 300;
    let xPos = 400;
    let velocity = { x: 0, y: 0 };
    let fuel = 100;
    let crystals = 0;
    let weight = 0;
    let upgrades = { fuel: 100, thrust: 1 };
    let gameRunning = false;
    
    // Инициализация Яндекс SDK
    YaGames.init().then(ysdk => {
        window.ysdk = ysdk;
        ysdk.features.LoadingAPI?.ready();
    });

    // Создание субмарины
    submarine.setAttribute('class', 'submarine');
    submarine.setAttribute('width', '60');
    submarine.setAttribute('height', '30');
    submarine.setAttribute('rx', '8');
    game.appendChild(submarine);

    // Обработчики управления
    document.addEventListener('keydown', (e) => {
        if(!gameRunning) return;
        const speed = 4;
        if(e.key === 'ArrowLeft' || e.key === 'a') {
            velocity.x = -speed;
            velocity.y = -speed * 0.7;
        }
        if(e.key === 'ArrowRight' || e.key === 'd') {
            velocity.x = speed;
            velocity.y = -speed * 0.7;
        }
    });

    document.addEventListener('keyup', () => {
        velocity.x = 0;
        velocity.y = 0;
    });

    // Старт игры
    document.getElementById('start').addEventListener('click', () => {
        gameRunning = true;
        document.getElementById('menu').classList.add('hidden');
        fuel = upgrades.fuel;
        updateHUD();
    });

    // Игровой цикл
    function update() {
        if(!gameRunning) return;
        
        // Движение
        xPos += velocity.x;
        yPos += velocity.y + 0.5 + weight * 0.1;
        
        // Границы
        xPos = Math.max(30, Math.min(xPos, 770));
        yPos = Math.max(30, Math.min(yPos, 570));
        
        // Обновление позиции
        submarine.setAttribute('x', xPos - 30);
        submarine.setAttribute('y', yPos - 15);
        
        // Расход топлива
        if(velocity.x !== 0) {
            fuel = Math.max(0, fuel - 0.2);
            updateHUD();
        }
        
        // Проверка дна
        if(yPos >= 570 && fuel <= 0) showReviveMenu();
        
        // Проверка ресурсов
        checkCollisions();
        
        requestAnimationFrame(update);
    }

    // Сбор ресурсов
    function checkCollisions() {
        document.querySelectorAll('.resource').forEach(res => {
            const rect = res.getBoundingClientRect();
            if(Math.abs(xPos - (rect.x + 12)) < 40 && 
               Math.abs(yPos - (rect.y + 12)) < 30) {
                crystals += res.textContent === '💎' ? 1 : 0;
                fuel += res.textContent === '🔋' ? 20 : 0;
                fuel = Math.min(fuel, upgrades.fuel);
                res.remove();
                updateHUD();
            }
        });
    }

    // Спавн ресурсов
    function spawnResource() {
        const types = ['💎', '🔋', '⚡'];
        const res = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        res.textContent = types[Math.floor(Math.random() * types.length)];
        res.setAttribute('x', Math.random() * 700 + 50);
        res.setAttribute('y', 580);
        res.setAttribute('class', 'resource');
        game.appendChild(res);
        
        setTimeout(() => res.remove(), 5000);
    }

    // Обновление интерфейса
    function updateHUD() {
        document.getElementById('fuel').querySelector('.value').textContent = Math.floor(fuel);
        document.getElementById('crystals').querySelector('.value').textContent = crystals;
    }

    // Меню возрождения
    function showReviveMenu() {
        gameRunning = false;
        document.getElementById('revive-menu').classList.remove('hidden');
    }

    // Запуск игры
    setInterval(spawnResource, 2000);
    setInterval(() => {
        if(gameRunning && fuel > 0) fuel = Math.max(0, fuel - 0.1);
    }, 1000);
    update();
});