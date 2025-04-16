document.addEventListener('DOMContentLoaded', () => {
    // Localization object
    const locales = {
        ru: {
			gameIsLoading: "Игра загружается, пожалуйста, подождите...",
            title: "Глубинный Рейд за Кристаллами",
            start: "Старт",
            skinSettings: "Скины субмарины",
            score: "Очки: ",
            crystals: "💎 ",
            selectSkin: "Выберите скин",
            buy10: "Купить (10💎) / %d",
            buy50: "Купить (50💎) / %d",
            close: "Закрыть",
            notificationSuccess: "Кристаллы успешно куплены!",
            notificationCancel: "Отмена покупки",
            notificationOffline: "Платежи недоступны в оффлайн режиме",
            notificationNotEnough: "Недостаточно кристаллов!",
            gameOver: "ИГРА ОКОНЧЕНА",
            scoreLabel: "Очки: ",
            record: "Рекорд: ",
            playAgain: "ИГРАТЬ СНОВА",
            reviveAd: "Посмотреть рекламу и ожить",
            reviveCrystals: "Ожить за 💎%d",
            skinShop: "Скины субмарины",
            equipped: "Надето",
            equip: "Надеть",
            locked: "🔒",
            tailSkins: "Скины субмарины",
            headSkins: "",
            placeInWorld: "Место в рейтинге: ",
            crystalCollected: "Кристалл!",
            reviveSuccess: "Оживление! Следующее будет стоить 💎%d",
            maxLength: "Максимальная энергия! Очки удваиваются!"
        },
        en: {
			gameIsLoading: "Game loading, please wait...",
            title: "Deep Raid for Crystals",
            start: "Start",
            skinSettings: "Submarine Skins",
            score: "Score: ",
            crystals: "💎 ",
            selectSkin: "Select Skin",
            buy10: "Buy (10💎) / %d",
            buy50: "Buy (50💎) / %d",
            close: "Close",
            notificationSuccess: "Crystals successfully purchased!",
            notificationCancel: "Purchase canceled",
            notificationOffline: "Payments are unavailable in offline mode",
            notificationNotEnough: "Not enough crystals!",
            gameOver: "GAME OVER",
            scoreLabel: "Score: ",
            record: "Record: ",
            playAgain: "PLAY AGAIN",
            reviveAd: "Watch ad to revive",
            reviveCrystals: "Revive for 💎%d",
            skinShop: "Submarine Skins",
            equipped: "Equipped",
            equip: "Equip",
            locked: "🔒",
            tailSkins: "Submarine Skins",
            headSkins: "",
            placeInWorld: "Leaderboard position: ",
            crystalCollected: "Crystal!",
            reviveSuccess: "Revived! Next will cost 💎%d",
            maxLength: "Max energy! Points doubled!"
        }
    };

    let currentLang = 'ru';

    const menu = document.getElementById('menu');
    const startButton = document.getElementById('start-button');
    const pauseButton = document.getElementById('pause-button');
    const gameContainer = document.getElementById('game-container');
    const game = document.getElementById('game');
    const backgroundOverlay = document.getElementById('background-overlay');

    let isIOS = false;
    let animationFrameId;
    let player;
    let yandexSDK;
    let payments;
    let lastAdShownTime = 0;
    let baseSpeed = 2.5;
    let gameStartTime;
    let isUpPressed = false;
    let isDownPressed = false;
    let touchY = 0;
    let isTouching = false;
    let isReady = false;
    let isPaused = true;
    let totalPausedTime = 0;
    let pauseStartTime = 0;
    let reviveCount = 0;
	
    let audioContext;
    let bgMusicBuffer;
    let crystalSoundBuffer;
	let currentPlaybackTime = 0;
	let musicStartTimestamp = 0;

    const submarineSkins = [
        { id: 'default', name: 'Стандарт', type: 'submarine', price: 0, color: 'gray', unlocked: true },
        { id: 'white', name: 'Белый', type: 'submarine', price: 5, color: '#FFFFFF' },
        { id: 'red', name: 'Красный', type: 'submarine', price: 10, color: 'red' },
        { id: 'blue', name: 'Синий', type: 'submarine', price: 10, color: 'blue' },
        { id: 'cyan', name: 'Циановый', type: 'submarine', price: 25, color: 'cyan' },
        { id: 'orange', name: 'Оранжевый', type: 'submarine', price: 25, color: 'orange' },
        { id: 'violet', name: 'Фиолетовый', type: 'submarine', price: 25, color: 'violet' },
        { id: 'stripes', name: 'Золотые полосы', type: 'submarine', price: 100, pattern: 'stripes', stripeColor: 'yellow' },
    ];

    let currentSubmarineSkin = 'default';
    let submarine = { x: 100, y: 300, width: 50, height: 20 };
    let submarineGroup;
    let currentHealth = 3;
    let maxHealth = 10;
    let healthDisplay;

    document.addEventListener('contextmenu', (e) => e.preventDefault());
		
    // Initialize Yandex SDK and determine language
    YaGames.init().then(ysdk => {
		isReady = true;
        yandexSDK = ysdk;
        ysdk.features.LoadingAPI?.ready();
        currentLang = ysdk.environment.i18n?.lang?.startsWith('en') ? 'en' : 'ru';
        isIOS = false;
        updateTexts();
        renderSkinMenu();
        updateUI();

        ysdk.on('game_api_pause', gamePause);
        ysdk.on('game_api_resume', gameUnPause);

        ysdk.getPlayer().then(_player => {
            player = _player;
            loadProgress();
        }).catch(err => {
            console.error('Ошибка при инициализации объекта Player:', err);
        });

        ysdk.getPayments({ signed: true }).then(_payments => {
            payments = _payments;
            payments.getCatalog()
                .then(products => {
                    productsCache = products;
                    updateShopButtons();
                })
                .catch(error => console.error('Ошибка загрузки каталога:', error));
            payments.getPurchases().then(purchases => {
                purchases.forEach(consumePurchase);
            });
        }).catch(error => {
            console.error('Покупки недоступны:', error);
        });

        document.getElementById('buy-gems-button-10').addEventListener('click', async () => {
            try {
                const purchase = await payments.purchase({ id: 'gem10' });
                await payments.consumePurchase(purchase.purchaseToken);
                crystals += 10;
                saveProgress();
                updateUI();
                renderSkinMenu();
                showNotification(locales[currentLang].notificationSuccess);
            } catch (err) {
                showNotification(locales[currentLang].notificationCancel);
            }
        });

        document.getElementById('buy-gems-button-50').addEventListener('click', async () => {
            try {
                const purchase = await payments.purchase({ id: 'gem50' });
                await payments.consumePurchase(purchase.purchaseToken);
                crystals += 50;
                saveProgress();
                updateUI();
                renderSkinMenu();
                showNotification(locales[currentLang].notificationSuccess);
            } catch (err) {
                showNotification(locales[currentLang].notificationCancel);
            }
        });

        showAd();
        initSkins();
    }).catch((error) => {
        console.error("YaGames.init() error: ", error);
        yandexSDK = null;
        updateTexts();
        renderSkinMenu();
        updateUI();
        loadProgress();
        initSkins();
    });

    function updateShopButtons() {
        const gem10Product = productsCache.find(p => p.id === 'gem10');
        const gem50Product = productsCache.find(p => p.id === 'gem50');

        if (gem10Product) {
            const button10 = document.getElementById('buy-gems-button-10');
            button10.innerHTML = `
                ${locales[currentLang].buy10.replace('%d', gem10Product.priceValue)} 
                <img src="${gem10Product.getPriceCurrencyImage()}" alt="${gem10Product.priceCurrencyCode}">
            `;
        }

        if (gem50Product) {
            const button50 = document.getElementById('buy-gems-button-50');
            button50.innerHTML = `
                ${locales[currentLang].buy50.replace('%d', gem50Product.priceValue)} 
                <img src="${gem10Product.getPriceCurrencyImage()}" alt="${gem10Product.priceCurrencyCode}">
            `;
        }
    }

    function consumePurchase(purchase) {
        if (purchase.productID === 'gem10') {
            crystals += 10;
            saveProgress();
            updateUI();
            renderSkinMenu();
        }
        if (purchase.productID === 'gem50') {
            crystals += 50;
            saveProgress();
            updateUI();
            renderSkinMenu();
        }
        payments.consumePurchase(purchase.purchaseToken);
    }

    let bgMusicSource;
    function playBgMusic(startTime = 0) {
		if (isIOS || !audioContext || !bgMusicBuffer) return;
		stopBgMusic();
		
		bgMusicSource = audioContext.createBufferSource();
		bgMusicSource.buffer = bgMusicBuffer;
		bgMusicSource.loop = true;
		bgMusicSource.connect(audioContext.destination);
		
		// Рассчитываем правильное время для зацикливания
		const actualStartTime = startTime % bgMusicBuffer.duration;
		musicStartTimestamp = audioContext.currentTime - actualStartTime;
		
		bgMusicSource.start(0, actualStartTime);
	}

    function stopBgMusic() {
		if (bgMusicSource) {
			currentPlaybackTime = audioContext.currentTime - musicStartTimestamp;
			bgMusicSource.stop();
			bgMusicSource.disconnect();
			bgMusicSource = null;
		}
	}

    function playCrystalSound() {
        if (isIOS) return;
        const source = audioContext.createBufferSource();
        source.buffer = crystalSoundBuffer;
        source.connect(audioContext.destination);
        source.start();
    }

    async function initAudio() {
        if (isIOS) return;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const loadSound = async (url) => {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
        };
        bgMusicBuffer = await loadSound('sounds/background_music.mp3');
        crystalSoundBuffer = await loadSound('sounds/crystal_collect.mp3');
    }

    function updateTexts() {
        document.querySelector('title').textContent = locales[currentLang].title;
        document.querySelector('#menu h1').textContent = locales[currentLang].title;
        document.getElementById('start-button').textContent = locales[currentLang].start;
        document.getElementById('skin-button').textContent = locales[currentLang].skinSettings;
        document.querySelector('#skin-menu h2').textContent = locales[currentLang].selectSkin;
        document.getElementById('buy-gems-button-10').innerHTML = locales[currentLang].buy10 + '<img src="images/yan-coin-icon40.png" alt="YAN" style="height: 20px">';
        document.getElementById('buy-gems-button-50').innerHTML = locales[currentLang].buy50 + '<img src="images/yan-coin-icon40.png" alt="YAN" style="height: 20px">';
        document.querySelector('#skin-menu button[onclick]').textContent = locales[currentLang].close;
    }

    function initSkins() {
        if (typeof skins === 'undefined') {
            skins = {
                submarine: null,
                unlocked: []
            };
        }
        const savedData = skins;
        submarineSkins.forEach(skin => {
            if (skin.price === 0) skin.unlocked = true;
            if (savedData.unlocked?.includes(skin.id)) skin.unlocked = true;
        });
        currentSubmarineSkin = savedData.submarine || 'default';
        if (!submarineSkins.find(s => s.id === currentSubmarineSkin)) currentSubmarineSkin = 'default';
        renderSkinMenu();
    }

    function renderSkinMenu() {
        const container = document.querySelector('.skin-list');
        container.innerHTML = `
            <div class="skin-category">
                <h3>${locales[currentLang].tailSkins}</h3>
                <div class="skin-items-container"></div>
            </div>
        `;
        renderSkinCategory(submarineSkins, container.querySelector('.skin-items-container'), 'submarine');
    }

    function renderSkinCategory(skinsList, container, type) {
        container.innerHTML = '';
        skinsList.forEach(skin => {
            const skinEl = document.createElement('div');
            const isEquipped = currentSubmarineSkin === skin.id;
            skinEl.className = `skin-item${isEquipped ? ' equipped' : ''}`;
            skinEl.setAttribute('data-type', type);
            skinEl.setAttribute('data-pattern', skin.pattern || 'none');
            const styleVars = [];
            if (skin.color) styleVars.push(`--skin-color: ${skin.color}`);
            if (skin.stripeColor) styleVars.push(`--stripe-color: ${skin.stripeColor}`);
            skinEl.innerHTML = `
                <div class="skin-preview" style="${styleVars.join(';')}">
                    ${skin.pattern === 'stripes' ? `
                        <div class="pattern-preview stripes" style="--stripe-color: gold"></div>
                    ` : ''}
                </div>
                ${!skin.unlocked ? `
                    <div class="locked-overlay">${locales[currentLang].locked}</div>
                    <div class="skin-price">💎${skin.price}</div>
                ` : ''}
                <button class="skin-button" 
                    onclick="window.equipSkin('${skin.id}', '${type}')" 
                    ${isEquipped ? 'disabled' : ''}>
                    ${isEquipped ? locales[currentLang].equipped : locales[currentLang].equip}
                </button>
            `;
            if (!skin.unlocked) skinEl.onclick = () => tryBuySkin(skin);
            container.appendChild(skinEl);
        });
    }

    window.tryBuySkin = function(skin) {
        if (crystals >= skin.price) {
            crystals -= skin.price;
            skin.unlocked = true;
            saveSkins();
            saveProgress();
            updateUI();
            renderSkinMenu();
        } else {
            showNotification(locales[currentLang].notificationNotEnough);
        }
    };

    window.equipSkin = function(skinId, type) {
        try {
            if (type === 'submarine') currentSubmarineSkin = skinId;
            saveSkins();
            saveProgress();
            renderSkinMenu();
            const skinConfig = submarineSkins.find(s => s.id === currentSubmarineSkin);
            if (submarineGroup && skinConfig) applySkinToSubmarine(submarineGroup, skinConfig);
            console.log('Скин успешно надет:', skinId);
        } catch (error) {
            console.error('Ошибка при надевании скина:', error);
        }
    };

    function saveSkins() {
        skins = {
            submarine: currentSubmarineSkin,
            unlocked: submarineSkins.filter(s => s.unlocked).map(s => s.id)
        };
    }

    let productsCache = [];
    let obstacles = [];
    let foods = [];
    let crystals = 0;
    let score = 0;
    let maxScore = 0;
    let skins = {
        submarine: null,
        unlocked: []
    };
    let isGameOver = false;
	let isRevived = false;
    let speed = baseSpeed;

    const turnSpeed = 3;
    const scoreDisplay = document.getElementById('score-display');
    const crystalDisplay = document.getElementById('crystal-display');

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    const stripesPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    stripesPattern.setAttribute('id', 'stripes');
    stripesPattern.setAttribute('width', '10');
    stripesPattern.setAttribute('height', '10');
    stripesPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    stripesPattern.setAttribute('patternTransform', 'rotate(45)');
    const stripe = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    stripe.setAttribute('width', '10');
    stripe.setAttribute('height', '3');
    stripe.setAttribute('fill', 'gold');
    stripesPattern.appendChild(stripe);

    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', 'bgPattern');
    pattern.setAttribute('width', '50');
    pattern.setAttribute('height', '50');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    const bubble1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bubble1.setAttribute('cx', '10');
    bubble1.setAttribute('cy', '10');
    bubble1.setAttribute('r', '3');
    bubble1.setAttribute('fill', '#ffffff');
    bubble1.setAttribute('opacity', '0.5');
    pattern.appendChild(bubble1);
    const bubble2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bubble2.setAttribute('cx', '25');
    bubble2.setAttribute('cy', '25');
    bubble2.setAttribute('r', '2');
    bubble2.setAttribute('fill', '#ffffff');
    bubble2.setAttribute('opacity', '0.5');
    pattern.appendChild(bubble2);

    defs.appendChild(stripesPattern);
    defs.appendChild(pattern);
    game.appendChild(defs);

    const movingBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    movingBg.setAttribute('width', '1600');
    movingBg.setAttribute('height', '600');
    movingBg.setAttribute('fill', 'url(#bgPattern)');
    movingBg.setAttribute('x', '0');
    game.appendChild(movingBg);

    pauseButton.addEventListener('click', () => {
        if (!isGameOver) {
            if (isPaused) gameUnPause();
            else gamePause();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !isGameOver) {
            e.preventDefault();
            if (isPaused) gameUnPause();
            else gamePause();
        }
    });

    startButton.addEventListener('click', () => {
		if (!isReady) {
			showNotification(locales[currentLang].gameIsLoading)
			return;
		}
        menu.style.display = 'none';
        initGame();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'ц') isUpPressed = true;
        if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'ы') isDownPressed = true;
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'ц') isUpPressed = false;
        if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'ы') isDownPressed = false;
    });

    document.addEventListener('touchstart', (e) => {
        isTouching = true;
        const rect = game.getBoundingClientRect();
        const scaleY = game.viewBox.baseVal.height / rect.height;
        touchY = (e.touches[0].clientY - rect.top) * scaleY;
        handleTouchMove();
    });

    document.addEventListener('touchmove', (e) => {
        const rect = game.getBoundingClientRect();
        const scaleY = game.viewBox.baseVal.height / rect.height;
        touchY = (e.touches[0].clientY - rect.top) * scaleY;
    });

    document.addEventListener('touchend', () => {
        isTouching = false;
        isUpPressed = false;
        isDownPressed = false;
    });

    function showNotification(message, duration = 2000) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.remove('hidden');
        setTimeout(() => notification.classList.add('hidden'), duration);
    }

    function handleTouchMove() {
        if (!isTouching) return;
        const touchPosition = touchY;
        if (touchPosition < 300) {
            isUpPressed = true;
            isDownPressed = false;
        } else {
            isDownPressed = true;
            isUpPressed = false;
        }
        requestAnimationFrame(handleTouchMove);
    }

    function showAd() {
        if (!yandexSDK) return;
        gamePause();
        yandexSDK.adv.showFullscreenAdv({
            callbacks: {
                onClose: () => {
                    gameUnPause();
                },
                onError: () => {
                    gameUnPause();
                }
            }
        });
        lastAdShownTime = Date.now();
    }

    document.getElementById('skin-button').addEventListener('click', () => {
        document.getElementById('skin-menu').style.display = 'block';
        renderSkinMenu();
    });

    function resizeGame() {
        const containerRatio = gameContainer.clientWidth / gameContainer.clientHeight;
        const gameRatio = 800 / 600;
        if (containerRatio > gameRatio) {
            const gameWidth = gameContainer.clientHeight * gameRatio;
            backgroundOverlay.style.width = `calc(100% - ${gameWidth}px)`;
            backgroundOverlay.style.height = '100%';
            backgroundOverlay.style.left = `${gameWidth}px`;
        } else {
            const gameHeight = gameContainer.clientWidth / gameRatio;
            backgroundOverlay.style.height = `calc(100% - ${gameHeight}px)`;
            backgroundOverlay.style.width = '100%';
            backgroundOverlay.style.top = `${gameHeight}px`;
        }
    }

    window.addEventListener('resize', resizeGame);
    resizeGame();

    function createSubmarineSVG() {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('submarine');

        // Корпус
        const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        body.setAttribute('x', '0');
        body.setAttribute('y', '5');
        body.setAttribute('width', '50');
        body.setAttribute('height', '10');
        body.setAttribute('fill', 'gray');
        group.appendChild(body);

        // Рубка
        const tower = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        tower.setAttribute('x', '10');
        tower.setAttribute('y', '0');
        tower.setAttribute('width', '10');
        tower.setAttribute('height', '5');
        tower.setAttribute('fill', 'gray');
        group.appendChild(tower);

        // Иллюминаторы
        const porthole1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        porthole1.setAttribute('cx', '10');
        porthole1.setAttribute('cy', '10');
        porthole1.setAttribute('r', '2');
        porthole1.setAttribute('fill', 'yellow');
        group.appendChild(porthole1);

        const porthole2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        porthole2.setAttribute('cx', '25');
        porthole2.setAttribute('cy', '10');
        porthole2.setAttribute('r', '2');
        porthole2.setAttribute('fill', 'lightgreen');
        group.appendChild(porthole2);

        const porthole3 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        porthole3.setAttribute('cx', '40');
        porthole3.setAttribute('cy', '10');
        porthole3.setAttribute('r', '2');
        porthole3.setAttribute('fill', 'lightgreen');
        group.appendChild(porthole3);

        return group;
    }

    function createHealthDisplay() {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('health-display');

        // Текст здоровья
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('font-size', '12');
        text.setAttribute('fill', 'white');
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('x', '-10');
        text.setAttribute('y', '0');
        group.appendChild(text);

        // Желтое SVG-сердечко
        const heart = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        heart.setAttribute('d', 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
        heart.setAttribute('fill', 'yellow');
        heart.setAttribute('transform', 'scale(0.5) translate(-12, -24)');
        group.appendChild(heart);

        return group;
    }

    function applySkinToSubmarine(group, skin) {
        const body = group.querySelector('rect:nth-child(1)');
        const tower = group.querySelector('rect:nth-child(2)');
        if (skin.pattern) {
            body.setAttribute('fill', `url(#${skin.pattern})`);
            tower.setAttribute('fill', `url(#${skin.pattern})`);
        } else {
            body.setAttribute('fill', skin.color);
            tower.setAttribute('fill', skin.color);
        }
    }

    function initGame() {
        cancelAnimationFrame(animationFrameId);
        playBgMusic();
        currentHealth = 3;
        submarine = { x: 50 + 350 * (currentHealth - 1) / 14, y: 300, width: 50, height: 15 };
        obstacles = [];
        foods = [];
        score = 0;
        isGameOver = false;
        reviveCount = 0;
        initSkins();
        submarineGroup = createSubmarineSVG();
        healthDisplay = createHealthDisplay();
        const skinConfig = submarineSkins.find(s => s.id === currentSubmarineSkin);
        applySkinToSubmarine(submarineGroup, skinConfig);
        game.appendChild(submarineGroup);
        game.appendChild(healthDisplay);
        updateUI();
        pauseButton.style.display = 'block';
        gameUnPause();
        gameStartTime = Date.now();
        totalPausedTime = 0;
        speed = baseSpeed;
    }

    function generateObstaclesAndFood() {
        if (Math.random() < 0.05) {
			const y = Math.random() * (600 - 30);
			obstacles.push({
				x: 800,
				y: y,
				width: 30,
				height: 30,
				points: generateRockPoints(800 + 15, y + 15)
			});
        }
        if (Math.random() < 0.015) {
            if (Math.random() < 0.04) {
                foods.push({
                    x: 800,
                    y: Math.random() * (600 - 20),
                    isCrystal: true
                });
            } else {
                foods.push({
                    x: 800,
                    y: Math.random() * (600 - 20),
                    isCrystal: false
                });
            }
        }
    }
	
	function generateRockPoints(centerX, centerY) {
		const points = [];
		const numVertices = 5 + Math.floor(Math.random() * 4); // 5-8 вершин
		const radius = 15;
		
		for (let i = 0; i < numVertices; i++) {
			const angle = (i * 2 * Math.PI)/numVertices + (Math.random() - 0.5) * 0.5;
			const r = radius * (0.7 + Math.random() * 0.6);
			const px = centerX + r * Math.cos(angle);
			const py = centerY + r * Math.sin(angle);
			points.push(`${px},${py}`);
		}
		return points.join(' ');
	}

    function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
        function area(x1, y1, x2, y2, x3, y3) {
            return Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2);
        }
        const A = area(x1, y1, x2, y2, x3, y3);
        const A1 = area(px, py, x2, y2, x3, y3);
        const A2 = area(x1, y1, px, py, x3, y3);
        const A3 = area(x1, y1, x2, y2, px, py);
        return Math.abs(A - (A1 + A2 + A3)) < 0.1;
    }

    function checkCollisions() {
        obstacles.forEach((obstacle, index) => {
            // Треугольник скалы: точки (obstacle.x, obstacle.y + 30), (obstacle.x + 15, obstacle.y), (obstacle.x + 30, obstacle.y + 30)
            const triX1 = obstacle.x, triY1 = obstacle.y + 30;
            const triX2 = obstacle.x + 15, triY2 = obstacle.y;
            const triX3 = obstacle.x + 30, triY3 = obstacle.y + 30;

            // Хитбокс лодки: прямоугольник submarine.x, submarine.y, width: 50, height: 15
            const subLeft = submarine.x;
            const subRight = submarine.x + submarine.width;
            const subTop = submarine.y;
            const subBottom = submarine.y + submarine.height;

            // Проверяем пересечение прямоугольника лодки с треугольником
            const subPoints = [
                [subLeft, subTop],
                [subRight, subTop],
                [subLeft, subBottom],
                [subRight, subBottom]
            ];

            let collision = false;
            for (const [px, py] of subPoints) {
                if (pointInTriangle(px, py, triX1, triY1, triX2, triY2, triX3, triY3)) {
                    collision = true;
                    break;
                }
            }

            // Также проверяем, не попали ли вершины треугольника внутрь прямоугольника лодки
            if (!collision) {
                const triPoints = [
                    [triX1, triY1],
                    [triX2, triY2],
                    [triX3, triY3]
                ];
                for (const [tx, ty] of triPoints) {
                    if (
                        tx >= subLeft && tx <= subRight &&
                        ty >= subTop && ty <= subBottom
                    ) {
                        collision = true;
                        break;
                    }
                }
            }

            if (collision) {
                console.log('Collision detected:', { submarine, obstacle });
                currentHealth = Math.max(0, currentHealth - 1);
                submarine.x = 50 + 350 * (currentHealth - 1) / 14;
                obstacles.splice(index, 1);
                if (currentHealth <= 0) {
                    gameOver();
                }
            }
        });

        foods.forEach((food, index) => {
            if (
                submarine.x < food.x + 20 &&
                submarine.x + submarine.width > food.x &&
                submarine.y < food.y + 20 &&
                submarine.y + submarine.height > food.y
            ) {
                if (food.isCrystal) {
                    crystals++;
                    saveProgress();
                    createFirework();
                    playCrystalSound();
                } else {
					const previousHealth = currentHealth;
					currentHealth = Math.min(maxHealth, currentHealth + 1);
					
					if (currentHealth === maxHealth) {
						score += 2;
						if (previousHealth < maxHealth) {
							showNotification(locales[currentLang].maxLength);
						}
					} else {
						score += 1;
					}
					submarine.x = 50 + 350 * (currentHealth - 1) / 14;
				}
                foods.splice(index, 1);
            }
        });
    }

    async function gameOver() {
        gamePause();
        pauseButton.style.display = 'none';
        cancelAnimationFrame(animationFrameId);
        isGameOver = true;
        let leaderboardScore = Math.floor(score);
        if (score > maxScore) {
            maxScore = score;
            saveProgress();
            if (yandexSDK) {
                try {
                    await yandexSDK.getLeaderboards().then(lb => lb.setLeaderboardScore('leaderboardMain', score));
                } catch (e) {
                    console.log('Оффлайн режим, результат не сохранён');
                }
            }
        }

        let leaderboardHTML = '';
        if (yandexSDK) {
            try {
                const lb = await yandexSDK.getLeaderboards();
                const entries = await lb.getLeaderboardEntries('leaderboardMain', { quantityTop: 20, includeUser: true, quantityAround: 10 });
                const playerEntry = entries.entries.find(e => e.player.uniqueID === player.getUniqueID());
                if (playerEntry) {
                    const trophy = playerEntry.rank < 2 ? '!!!🏆!!!' : (playerEntry.rank <= 3 ? '🏆' : '');
                    leaderboardHTML = `<p>${locales[currentLang].placeInWorld}${playerEntry.rank}${trophy}</p>`;
                }
            } catch (error) {
                console.log('Не удалось получить данные лидерборда:', error);
            }
        }

		const reviveCost = reviveCount === 0 ? 0 : reviveCount;
		const hasEnoughCrystals = crystals >= reviveCost;

		menu.innerHTML = `
			<h1>${locales[currentLang].gameOver}</h1>
			<p>${locales[currentLang].scoreLabel}${Math.floor(score)}</p>
			<p>${locales[currentLang].record}${maxScore}</p>
			${leaderboardHTML}
			<button id="restart-button">${locales[currentLang].playAgain}</button>
			<button id="revive-button" ${hasEnoughCrystals ? '' : 'disabled'}>
				${reviveCount === 0 ? locales[currentLang].reviveAd : locales[currentLang].reviveCrystals.replace('%d', reviveCount)}
			</button>
			${!hasEnoughCrystals ? `
				<button id="buy-for-revive" class="buy-gems-mini">
					${locales[currentLang].buy10.replace('%d', '10')}
					<img src="images/yan-coin-icon40.png" alt="YAN" style="height: 16px">
				</button>
			` : ''}
			<button id="skin-shop-button">${locales[currentLang].skinShop}</button>
		`;

		// Добавить обработчик для новой кнопки
		if (!hasEnoughCrystals) {
			document.getElementById('buy-for-revive').addEventListener('click', async () => {
				try {
					const purchase = await payments.purchase({ id: 'gem10' });
					await payments.consumePurchase(purchase.purchaseToken);
					crystals += 10;
					saveProgress();
					updateUI();
					gameOver(); // Перерисовываем меню
					showNotification(locales[currentLang].notificationSuccess);
				} catch (err) {
					showNotification(locales[currentLang].notificationCancel);
				}
			});
		}

        document.getElementById('skin-shop-button').addEventListener('click', () => {
            document.getElementById('skin-menu').style.display = 'block';
            renderSkinMenu();
        });

        const reviveButton = document.getElementById('revive-button');
        reviveButton.addEventListener('click', () => {
            if (reviveCount === 0) {
                if (yandexSDK) {
                    yandexSDK.adv.showRewardedVideo({
                        callbacks: {
                            onOpen: () => {
                                console.log("Rewarded открыт");
                                gamePause();
                            },
                            onClose: () => {
								if (isRevived) {
									performRevive();
									isRevived = false;
								} else {
									gameUnPause();
								}
                                console.log("Rewarded закрыт");
                            },
                            onRewarded: () => {
								isRevived = true;
                            },
                            onError: (error) => {
                                console.error("Ошибка Rewarded:", error);
                            }
                        }
                    });
                }
            } else {
                const cost = reviveCount;
                if (crystals >= cost) {
                    crystals -= cost;
                    saveProgress();
                    updateUI();
                    performRevive();
					gameUnPause();
                } else {
                    showNotification(locales[currentLang].notificationNotEnough);
                }
            }
        });

        document.getElementById('restart-button').addEventListener('click', () => {
            if (Date.now() - lastAdShownTime > 60000 && yandexSDK) showAd();
            menu.style.display = 'none';
            initGame();
        });

        menu.style.display = 'block';
        updateUI();
    }

    function gamePause() {
		game.classList.add('paused');
        isPaused = true;
        pauseStartTime = Date.now();
        stopBgMusic();
		if (audioContext) audioContext.suspend();
        pauseButton.textContent = '>';
        console.log('GAME PAUSED');
    }

    function gameUnPause() {
		game.classList.remove('paused');
        totalPausedTime += Date.now() - pauseStartTime;
        isPaused = false;
		if (audioContext) {
			audioContext.resume().then(() => {
				playBgMusic(currentPlaybackTime);
			});
		}
        pauseButton.textContent = '⏸';
        if (!isGameOver) update();
        console.log('GAME RESUMED');
    }

	function performRevive() {
		pauseButton.style.display = 'block';
		cancelAnimationFrame(animationFrameId);
		currentHealth = maxHealth;
		submarine = { x: 50 + 350 * (currentHealth - 1) / 14, y: 300, width: 50, height: 15 };
		obstacles = [];
		foods = [];
		isGameOver = false;
		reviveCount++;
		gameStartTime = Date.now();
		totalPausedTime = 0;
		speed = baseSpeed;
		document.querySelectorAll('.submarine, .obstacle, .food, .health-display').forEach(el => el.remove());
		submarineGroup = createSubmarineSVG();
		healthDisplay = createHealthDisplay();
		const skinConfig = submarineSkins.find(s => s.id === currentSubmarineSkin);
		applySkinToSubmarine(submarineGroup, skinConfig);
		game.appendChild(submarineGroup);
		game.appendChild(healthDisplay);
		menu.style.display = 'none';
		updateUI();
		gameUnPause();
		showNotification(locales[currentLang].reviveSuccess.replace('%d', reviveCount));
	}

    function updateUI() {
        scoreDisplay.textContent = `${locales[currentLang].score}${Math.floor(score)}`;
        crystalDisplay.textContent = `${locales[currentLang].crystals}${crystals}`;
        crystalDisplay.style.display = 'none';
        crystalDisplay.offsetHeight;
        crystalDisplay.style.display = 'block';
    }

    function update() {
        if (isGameOver || isPaused) return;
        const elapsedTime = (Date.now() - gameStartTime - totalPausedTime) / 1000;
        speed = baseSpeed * (1 + 0.25 * Math.floor(elapsedTime / 10));
        generateObstaclesAndFood();
        if (isUpPressed) submarine.y -= turnSpeed;
        if (isDownPressed) submarine.y += turnSpeed;
        submarine.y = Math.max(0, Math.min(submarine.y, 600 - submarine.height));
        obstacles.forEach(o => o.x -= speed);
        foods.forEach(f => f.x -= speed);
        movingBg.setAttribute('x', (parseFloat(movingBg.getAttribute('x')) + speed / 2) % 100);
        obstacles = obstacles.filter(o => o.x > -50);
        foods = foods.filter(f => f.x > -10);
        drawElements();
        checkCollisions();
        updateUI();
        animationFrameId = requestAnimationFrame(update);
    }

    function drawElements() {
        document.querySelectorAll('.submarine, .obstacle, .food, .health-display').forEach(el => el.remove());
        submarineGroup.setAttribute('transform', `translate(${submarine.x}, ${submarine.y})`);
        game.appendChild(submarineGroup);

        // Отрисовка здоровья
        healthDisplay.setAttribute('transform', `translate(${submarine.x + submarine.width / 2}, ${submarine.y - 5})`);
        const text = healthDisplay.querySelector('text');
        text.textContent = `${currentHealth}/${maxHealth}`;
        game.appendChild(healthDisplay);

        obstacles.forEach(obstacle => {
			const rock = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
			rock.setAttribute('points', obstacle.points);
			rock.setAttribute('fill', '#5a4d41');
			rock.setAttribute('transform', `translate(${obstacle.x - 800}, 0)`);
			rock.classList.add('obstacle');
			game.appendChild(rock);
		});

        foods.forEach(food => {
            const element = food.isCrystal ? createCrystal(food.x, food.y) : createResource(food.x, food.y);
            game.appendChild(element);
        });
    }

    function createResource(x, y) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x + 10);
        circle.setAttribute('cy', y + 10);
        circle.setAttribute('r', '10');
        circle.setAttribute('fill', 'yellow');
        circle.classList.add('food');
        return circle;
    }

    function createCrystal(x, y) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x + 10);
        text.setAttribute('y', y + 25);
        text.setAttribute('font-size', '20');
        text.setAttribute('fill', '#00ffff');
        text.textContent = '💎';
        text.classList.add('food');
        return text;
    }

    function createFirework() {
        const fireworkSVGTemplate = document.getElementById('firework-template');
		const container = document.getElementById('fireworks-container');
		container.innerHTML = '';

		// Создаем основной фейерверк
		const fireworkFragment = document.importNode(fireworkSVGTemplate.content, true);
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
			const particle = document.importNode(fireworkSVGTemplate.content, true);
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
			
        showNotification(locales[currentLang].crystalCollected, 1000);
    }

    async function saveProgress() {
        if (!player) return;
        const data = {
            crystals,
            maxScore,
            skins
        };
        try {
            await player.setData(data, true);
            console.log('saveProgress saved data: ', data);
        } catch (error) {
            console.error('Ошибка сохранения:', error);
        }
    }

    async function loadProgress() {
        if (!player) {
            console.log('loadProgress failed: !player');
            return;
        }
        try {
            const data = await player.getData();
            if (data) {
                console.log('loadProgress loaded data: ', data);
                const saved = data;
                crystals = parseInt(saved.crystals) || 0;
                maxScore = parseInt(saved.maxScore) || 0;
                skins = saved.skins;
                initSkins();
                updateUI();
            }
        } catch (error) {
            console.error('Ошибка загрузки:', error);
        }
    }

    if (!isIOS) initAudio();
    updateUI();
});