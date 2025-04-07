document.addEventListener('DOMContentLoaded', () => {
    const game = document.getElementById('game');
    const menu = document.getElementById('menu');
    const startButton = document.getElementById('start-button');
    const skinButton = document.getElementById('skin-button');
    const pauseButton = document.getElementById('pause-button');
    const scoreDisplay = document.getElementById('score-display');
    const crystalDisplay = document.getElementById('crystal-display');
    const fuelDisplay = document.getElementById('fuel-display');
    const buyFuelButton = document.getElementById('buy-fuel-button');
    const notification = document.getElementById('notification');

    let yandexSDK;
    let player;
    let isPaused = false;
    let isGameOver = false;
    let reviveCount = 0;
    let fuel = 100;
    let score = 0;
    let crystals = 0;
    let maxScore = 0;
    let currentSkin = 'default';
    let submarine = {
        x: 400,
        y: 300,
        width: 50,
        height: 20,
        velocityY: 0,
        weight: 1,
		inventory: { resources: 0, gems: 0 }
    };
    let resources = [];
    let gems = [];
    let warehouse = {
        x: 375,
        y: 0,
        width: 50,
        height: 50,
    };
    let isLeftPressed = false;
    let isRightPressed = false;
    let touchX = 0;
    let isTouching = false;

    const submarineSkins = [
        { id: 'default', name: 'Стандарт', price: 0, color: '#555', unlocked: true },
        { id: 'blue', name: 'Синий', price: 10, color: '#0000FF', unlocked: false },
        { id: 'red', name: 'Красный', price: 15, color: '#FF0000', unlocked: false },
    ];

    const upgrades = [
        { id: 'weight1', name: 'Уменьшение веса 10%', price: 20, weightReduction: 0.1 },
        { id: 'fuel1', name: 'Эффективность топлива +20%', price: 25, fuelEfficiency: 0.2 },
    ];

    let appliedUpgrades = [];

    // Инициализация Yandex SDK
    YaGames.init().then(ysdk => {
        yandexSDK = ysdk;
        ysdk.getPlayer().then(_player => {
            player = _player;
            loadProgress();
        });
        ysdk.features.LoadingAPI?.ready();
    });

    // Обработчики событий
    startButton.addEventListener('click', () => {
        menu.style.display = 'none';
        initGame();
    });

    skinButton.addEventListener('click', () => {
        document.getElementById('skin-menu').style.display = 'block';
        renderSkinMenu();
    });

    pauseButton.addEventListener('click', () => {
        if (!isGameOver) {
            if (isPaused) gameUnPause();
            else gamePause();
        }
    });

    buyFuelButton.addEventListener('click', () => {
        if (crystals >= 10) {
            crystals -= 10;
            fuel += 50;
            if (fuel > 100) fuel = 100;
            updateUI();
            saveProgress();
        } else {
            showNotification('Недостаточно кристаллов!');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') isLeftPressed = true;
        if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') isRightPressed = true;
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') isLeftPressed = false;
        if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') isRightPressed = false;
    });

    document.addEventListener('touchstart', (e) => {
        isTouching = true;
        const rect = game.getBoundingClientRect();
        const scaleX = game.viewBox.baseVal.width / rect.width;
        touchX = (e.touches[0].clientX - rect.left) * scaleX;
    });

    document.addEventListener('touchmove', (e) => {
        const rect = game.getBoundingClientRect();
        const scaleX = game.viewBox.baseVal.width / rect.width;
        touchX = (e.touches[0].clientX - rect.left) * scaleX;
    });

    document.addEventListener('touchend', () => {
        isTouching = false;
        isLeftPressed = false;
        isRightPressed = false;
    });

    // Функции игры
    function initGame() {
		submarine = { 
			x: 400, 
			y: 300, 
			width: 50, 
			height: 20, 
			velocityY: 0, 
			weight: 1, 
			inventory: { resources: 0, gems: 0 }
		};
        resources = [];
        gems = [];
        fuel = 100;
        score = 0;
        isGameOver = false;
        reviveCount = 0;
        pauseButton.style.display = 'block';
        gameUnPause();
    }

    function gamePause() {
        isPaused = true;
        pauseButton.textContent = '>';
    }

    function gameUnPause() {
        isPaused = false;
        pauseButton.textContent = '⏸';
        update();
    }

    function update() {
		if (isGameOver || isPaused) return;

		// Добавляем гравитацию
		submarine.velocityY += 0.1;

		// Движение субмарины
		if (isLeftPressed || (isTouching && touchX < 400)) {
			submarine.x -= 5; // Движение влево
			submarine.velocityY -= 0.3; // Подъем вверх
		}
		if (isRightPressed || (isTouching && touchX >= 400)) {
			submarine.x += 5; // Движение вправо
			submarine.velocityY -= 0.3; // Подъем вверх
		}

		// Применяем вес с учетом апгрейдов
		submarine.velocityY += 0.1 * (submarine.weight - appliedUpgrades.reduce((sum, u) => sum + (upgrades.find(up => up.id === u)?.weightReduction || 0), 0));
		
		// Обновляем позицию по Y
		submarine.y += submarine.velocityY;

		// Ограничение по горизонтали
		submarine.x = Math.max(0, Math.min(submarine.x, 800 - submarine.width));

		// Ограничение по вертикали с обнулением скорости
		if (submarine.y >= 600 - submarine.height) {
			submarine.y = 600 - submarine.height; // Упирается в пол
			submarine.velocityY = 0; // Сбрасываем скорость
		} else if (submarine.y <= 0) {
			submarine.y = 0; // Упирается в потолок
			submarine.velocityY = 0; // Сбрасываем скорость
		}

        // Расход топлива
        if (isLeftPressed || isRightPressed || isTouching) { // Топливо тратится только при движении
			const fuelEfficiency = appliedUpgrades.reduce((sum, u) => sum + (upgrades.find(up => up.id === u)?.fuelEfficiency || 0), 0);
			fuel -= 0.1 * (1 - fuelEfficiency); // Уменьшаем топливо
			if (fuel <= 0) gameOver(); // Проверка на окончание топлива
		}

        // Спавн ресурсов и кристаллов
		if (Math.random() < 0.005) { // Ресурсы появляются реже
			const meatEmojis = ['🍖', '🥩', '🍗'];
			const randomEmoji = meatEmojis[Math.floor(Math.random() * meatEmojis.length)];
			resources.push({ x: Math.random() * 800, y: 580, type: 'resource', timer: 10000, emoji: randomEmoji });
		}
		if (Math.random() < 0.002) { // Кристаллы появляются реже
			gems.push({ x: Math.random() * 800, y: 580, type: 'gem', timer: 15000 });
		}

        // Обновление таймеров
        resources.forEach(r => r.timer -= 16);
        gems.forEach(g => g.timer -= 16);
        resources = resources.filter(r => r.timer > 0);
        gems = gems.filter(g => g.timer > 0);

		resources.forEach(r => {
			r.y -= 1; // Движение вверх со скоростью 1 пиксель за кадр
			if (r.y < 0) { // Удаляем, если достигли верха
				resources = resources.filter(res => res !== r);
			}
		});
		
        // Проверка столкновений
        checkCollisions();

        // Отрисовка
        drawElements();

        // Обновление UI
        updateUI();

        requestAnimationFrame(update);
    }

    function checkCollisions() {
		// Проверка столкновений с ресурсами
		resources.forEach((r, index) => {
			if (submarine.x < r.x + 20 && submarine.x + submarine.width > r.x &&
				submarine.y < r.y + 20 && submarine.y + submarine.height > r.y) {
				resources.splice(index, 1);
				submarine.inventory.resources += 1; // Добавляем ресурс в инвентарь
			}
		});

		// Проверка столкновений с кристаллами
		gems.forEach((g, index) => {
			if (submarine.x < g.x + 20 && submarine.x + submarine.width > g.x &&
				submarine.y < g.y + 20 && submarine.y + submarine.height > g.y) {
				gems.splice(index, 1);
				submarine.inventory.gems += 1; // Добавляем кристалл в инвентарь
				createFirework(g.x, g.y); // Эффект фейерверка
			}
		});

		// Проверка доставки на базу
		if (submarine.x < warehouse.x + warehouse.width &&
			submarine.x + submarine.width > warehouse.x &&
			submarine.y < warehouse.y + warehouse.height &&
			submarine.y + submarine.height > warehouse.y &&
			(submarine.inventory.resources > 0 || submarine.inventory.gems)) {
			// Сохраняем значения инвентаря до сброса
			const deliveredResources = submarine.inventory.resources;
			const deliveredGems = submarine.inventory.gems;
			
			showNotification(`Доставлено 🍖${deliveredResources} и 💎${deliveredGems}`);

			// Сбрасываем инвентарь СРАЗУ после сохранения значений
			submarine.inventory = { resources: 0, gems: 0 };

			// Начисляем очки и кристаллы
			score += deliveredResources * 10;
			crystals += deliveredGems;

			// Выводим уведомление
			submarine.weight = 1;
		}
	}

    function drawElements() {
        document.querySelectorAll('.submarine, .resource, .gem, .warehouse').forEach(el => el.remove());

		const sub = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		sub.setAttribute('x', submarine.x);
		sub.setAttribute('y', submarine.y);
		sub.setAttribute('width', submarine.width);
		sub.setAttribute('height', submarine.height);
		sub.setAttribute('fill', submarineSkins.find(s => s.id === currentSkin).color);
		sub.classList.add('submarine');
		game.appendChild(sub);

		resources.forEach(r => {
			const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			text.setAttribute('x', r.x);
			text.setAttribute('y', r.y);
			text.setAttribute('font-size', '20');
			text.textContent = r.emoji; // Используем эмодзи из объекта ресурса
			text.classList.add('resource');
			game.appendChild(text);
		});

        gems.forEach(g => {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', g.x);
            text.setAttribute('y', g.y);
            text.setAttribute('font-size', '20');
            text.textContent = '💎';
            text.classList.add('gem');
            game.appendChild(text);
        });

        const ware = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        ware.setAttribute('x', warehouse.x);
        ware.setAttribute('y', warehouse.y);
        ware.setAttribute('width', warehouse.width);
        ware.setAttribute('height', warehouse.height);
        ware.setAttribute('fill', 'green');
        ware.classList.add('warehouse');
        game.appendChild(ware);
    }

    function updateUI() {
        scoreDisplay.textContent = `Очки: ${score}`;
        crystalDisplay.textContent = `💎 ${crystals}`;
        fuelDisplay.textContent = `⛽: ${Math.floor(fuel)}`;
		document.getElementById('inventory-display').textContent = `🎒 🍖x${submarine.inventory.resources} 💎x${submarine.inventory.gems}`;
    }

    function gameOver() {
        isGameOver = true;
        pauseButton.style.display = 'none';
        menu.innerHTML = `
            <h1>Игра окончена</h1>
            <p>Очки: ${score}</p>
            <p>Рекорд: ${maxScore}</p>
            <button id="restart-button">Играть снова</button>
            <button id="revive-button">${reviveCount === 0 ? 'Посмотреть рекламу и ожить' : `Ожить за 💎${reviveCount}`}</button>
            <button id="skin-shop-button">Настройка внешности</button>
        `;
        menu.style.display = 'block';

        document.getElementById('revive-button').addEventListener('click', () => {
            if (reviveCount === 0) {
                if (yandexSDK) {
                    yandexSDK.adv.showRewardedVideo({
                        callbacks: {
                            onRewarded: () => {
                                performRevive();
                            }
                        }
                    });
                }
            } else {
                if (crystals >= reviveCount) {
                    crystals -= reviveCount;
                    performRevive();
                } else {
                    showNotification('Недостаточно кристаллов!');
                }
            }
        });

        document.getElementById('restart-button').addEventListener('click', () => {
			menu.style.display = 'none';
            initGame();
        });

        document.getElementById('skin-shop-button').addEventListener('click', () => {
            document.getElementById('skin-menu').style.display = 'block';
            renderSkinMenu();
        });

        if (score > maxScore) {
            maxScore = score;
            saveProgress();
            if (yandexSDK) {
                yandexSDK.getLeaderboards().then(lb => lb.setLeaderboardScore('leaderboardMain', score));
            }
        }
    }

    function performRevive() {
        reviveCount++;
        fuel = 100;
        isGameOver = false;
        menu.style.display = 'none';
        update();
    }

    function renderSkinMenu() {
        const skinList = document.querySelector('.skin-list');
        skinList.innerHTML = '';
        submarineSkins.concat(upgrades).forEach(item => {
            const isSkin = 'color' in item;
            const isEquipped = isSkin && currentSkin === item.id;
            const isApplied = !isSkin && appliedUpgrades.includes(item.id);
            const skinEl = document.createElement('div');
            skinEl.className = `skin-item${isEquipped || isApplied ? ' equipped' : ''}`;
            skinEl.innerHTML = `
                <div class="skin-preview" style="background: ${item.color || '#ccc'}"></div>
                ${!item.unlocked && !isApplied ? `<div class="locked-overlay">🔒</div><div class="skin-price">💎${item.price}</div>` : ''}
                <button class="skin-button" onclick="${isSkin ? `equipSkin('${item.id}')` : `applyUpgrade('${item.id}')`}">
                    ${isEquipped || isApplied ? 'Надето' : 'Надеть'}
                </button>
            `;
            if (!item.unlocked && !isApplied) {
                skinEl.onclick = () => tryBuyItem(item);
            }
            skinList.appendChild(skinEl);
        });
    }

    window.equipSkin = function(skinId) {
        currentSkin = skinId;
        saveProgress();
        renderSkinMenu();
    };

    window.applyUpgrade = function(upgradeId) {
        if (!appliedUpgrades.includes(upgradeId)) {
            appliedUpgrades.push(upgradeId);
            saveProgress();
            renderSkinMenu();
        }
    };

    function tryBuyItem(item) {
        if (crystals >= item.price) {
            crystals -= item.price;
            item.unlocked = true;
            saveProgress();
            renderSkinMenu();
        } else {
            showNotification('Недостаточно кристаллов!');
        }
    }

    function createFirework(x, y) {
        const fireworkTemplate = document.getElementById('firework-template');
        const container = document.getElementById('fireworks-container');
		container.innerHTML = '';

		// Создаем основной фейерверк
		const fireworkFragment = document.importNode(fireworkTemplate.content, true);
		const fireworkElement = fireworkFragment.firstElementChild;
		
		// Настройка стилей
		fireworkElement.style.position = 'fixed';
		fireworkElement.style.top = '50%';
		fireworkElement.style.left = '50%';
		fireworkElement.style.width = '150px';
		fireworkElement.style.height = '150px';
		fireworkElement.style.animation = 'explode 1s ease-out';

		// Добавляем частицы
		for(let i = 0; i < 8; i++) {
			const particle = document.importNode(fireworkTemplate.content, true);
			const pElement = particle.firstElementChild;
			
			pElement.style.position = 'fixed';
			pElement.style.top = '50%';
			pElement.style.left = '50%';
			pElement.style.width = '80px';
			pElement.style.height = '80px';
			pElement.style.animation = `explode-particle ${1}s ease-out`;
			pElement.style.setProperty('--angle', `${i * 45}deg`);
			
			container.appendChild(pElement);
		}

		container.appendChild(fireworkElement);
		
		setTimeout(() => container.innerHTML = '', 1000);
    }

    function showNotification(message, duration = 2000) {
        notification.textContent = message;
        notification.classList.remove('hidden');
        setTimeout(() => notification.classList.add('hidden'), duration);
    }

    async function saveProgress() {
        if (!player) return;
        const data = {
            crystals,
            maxScore,
            skins: submarineSkins.map(s => ({ id: s.id, unlocked: s.unlocked })),
            currentSkin,
            appliedUpgrades
        };
        try {
            await player.setData(data, true);
        } catch (error) {
            console.error('Ошибка сохранения:', error);
        }
    }

    async function loadProgress() {
        if (!player) return;
        try {
            const data = await player.getData();
            if (data) {
                crystals = data.crystals || 0;
                maxScore = data.maxScore || 0;
                submarineSkins.forEach(s => {
                    const savedSkin = data.skins.find(ss => ss.id === s.id);
                    if (savedSkin) s.unlocked = savedSkin.unlocked;
                });
                currentSkin = data.currentSkin || 'default';
                appliedUpgrades = data.appliedUpgrades || [];
                updateUI();
                renderSkinMenu();
            }
        } catch (error) {
            console.error('Ошибка загрузки:', error);
        }
    }

    updateUI();
});