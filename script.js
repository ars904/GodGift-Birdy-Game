window.onload = function () {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const bgVideo = document.getElementById("bgVideo");
    const nftCanvas = document.getElementById("nftCanvas");
    const nctx = nftCanvas.getContext("2d");

    canvas.width = 400;
    canvas.height = 400;
    nftCanvas.width = 400;
    nftCanvas.height = 400;

    const gameFont = "'MyGameFont', 'Comic Sans MS', cursive";

    let animationId;
    let previousScreen = "main";
    let shakeTimer = 0;
    let lastTouch = 0;

    const bgMusic = new Audio("music.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.5;

    const sounds = {
        flap: new Audio("flap.mp3"),
        coin: new Audio("coin.mp3"),
        collision: new Audio("collision.mp3"),
        enabled: false
    };

    const enableAudio = () => {
        sounds.enabled = true;
        if (bgVideo) bgVideo.play().catch(() => {});
        bgMusic.play().catch(() => {});
        if (navigator.vibrate) navigator.vibrate(10);
    };
    document.addEventListener("click", enableAudio, { once: true });
    document.addEventListener("touchstart", enableAudio, { once: true });

    let coins = parseFloat(localStorage.getItem("coins")) || 0;
    let coinValue = parseFloat(localStorage.getItem("coinValue")) || 0.00000001;
    let lives = 5;

    function saveData() {
        localStorage.setItem("coins", coins);
        localStorage.setItem("coinValue", coinValue);
    }

    const game = {
        bird: { x: 50, y: 150, width: 34, height: 24, velocity: 0, frame: 0, frameCount: 0, falling: false, rotation: 0 },
        gravity: 0.4,
        jump: -6,
        obstacles: [],
        coinsOnScreen: [],
        effects: [],
        frames: 0,
        running: false,
        paused: false,
        screen: "main",
        gameOver: false
    };

    const images = {
        background: new Image(),
        bird: new Image(),
        obstacle1: new Image(),
        obstacle2: new Image(),
        obstacle3: new Image(),
        coin: new Image(),
        coin2: new Image()
    };
    images.background.src = "background.png";
    images.bird.src = "sprite_sheet.png";
    images.obstacle1.src = "obstacle1.png";
    images.obstacle2.src = "obstacle2.png";
    images.obstacle3.src = "obstacle3.png";
    images.coin.src = "coin.png";
    images.coin2.src = "coin2.png";

    const canvasButtons = [
        { text: "Start", action: startOrFly },
        { text: "NFT Shop", action: openShop },
        { text: "My NFTs", action: openCollection }
    ];

    function handleCanvasClick(e) {
        if (e.type === "touchstart") {
            e.preventDefault();
            lastTouch = Date.now();
        } else if (Date.now() - lastTouch < 500) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        if (game.gameOver) {
            const centerX = canvas.width / 2 - 90;
            const playY = 220;
            if (x >= centerX && x <= centerX + 180 && y >= playY && y <= playY + 50) {
                restartGame();
                return;
            }
            const menuY = 290;
            if (x >= centerX && x <= centerX + 180 && y >= menuY && y <= menuY + 50) {
                goToMainMenu();
                return;
            }
            return;
        }

        let menuButtonClicked = false;

        const activeButtons = (game.screen === "game") ? [canvasButtons[0]] : canvasButtons;
        activeButtons.forEach((btn) => {
            if (btn._drawX !== undefined && btn._drawY !== undefined) {
                const btnX = btn._drawX - 80;
                const btnY = btn._drawY - 20;
                if (x >= btnX && x <= btnX + 160 && y >= btnY && y <= btnY + 40) {
                    btn.action();
                    menuButtonClicked = true;
                }
            }
        });

        if (game.running && !game.paused && !menuButtonClicked && !game.bird.falling) fly();
    }

    canvas.addEventListener("mousedown", handleCanvasClick);
    canvas.addEventListener("touchstart", handleCanvasClick, { passive: false });

    function openShop() { showComingSoon("NFT SHOP"); }
    function openCollection() { showComingSoon("MY NFTs"); }

    function showComingSoon(title) {
        previousScreen = game.screen;
        game.paused = true;
        if (bgVideo) bgVideo.pause();
        bgMusic.pause();
        game.screen = "nft";
        canvas.style.display = "none";
        nftCanvas.style.display = "block";
        drawComingSoonScreen(title);
    }

    function drawComingSoonScreen(title) {
        nctx.fillStyle = "#1a1a1a";
        nctx.fillRect(0, 0, nftCanvas.width, nftCanvas.height);
        nctx.fillStyle = "#6eff69";
        nctx.font = "bold 28px " + gameFont;
        nctx.textAlign = "center";
        nctx.fillText(title, nftCanvas.width / 2, 80);
        nctx.fillStyle = "white";
        nctx.font = "bold 22px " + gameFont;
        nctx.fillText("COMING SOON!", nftCanvas.width / 2, nftCanvas.height / 2);
        nctx.fillStyle = "#6978ff";
        nctx.fillRect(nftCanvas.width / 2 - 60, nftCanvas.height - 80, 120, 40);
        nctx.fillStyle = "white";
        nctx.font = "bold 16px " + gameFont;
        nctx.fillText("CLOSE", nftCanvas.width / 2, nftCanvas.height - 55);
    }

    nftCanvas.onclick = function(e) {
        const rect = nftCanvas.getBoundingClientRect();
        const scaleX = nftCanvas.width / rect.width;
        const scaleY = nftCanvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        if (x >= 140 && x <= 260 && y >= 320 && y <= 360) {
            nftCanvas.style.display = "none";
            canvas.style.display = "block";
            game.screen = previousScreen;
            if (game.screen === "game" && bgVideo && !game.bird.falling) {
                bgVideo.play().catch(() => {});
                if (sounds.enabled) bgMusic.play().catch(() => {});
            }
        }
    };

    function drawUI() {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(10, 10, 380, 35);
        ctx.fillStyle = "white";
        ctx.font = "bold 15px " + gameFont;
        ctx.textAlign = "center";
        ctx.fillText(`Coins: ${coins.toFixed(8)}    Lives: ${lives}`, canvas.width / 2, 33);
    }

    function drawCanvasButtons() {
        ctx.globalAlpha = 1.0;

        const buttonsToDraw = (game.gameOver) ? [] :
            (game.screen === "game") ? [canvasButtons[0]] : canvasButtons;

        buttonsToDraw.forEach((btn, index) => {
            const x = canvas.width / 2;
            const y = (game.screen === "main") ? 200 + index * 50 : canvas.height - 25;
            btn._drawX = x;
            btn._drawY = y;

            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(x - 80, y - 20, 160, 40);

            ctx.fillStyle = "white";
            ctx.font = "bold 16px " + gameFont;
            ctx.textAlign = "center";
            ctx.fillText(btn.text, x, y + 5);
        });
    }

    function drawEffects() {
        for (let i = game.effects.length - 1; i >= 0; i--) {
            let e = game.effects[i];
            e.y -= 1;
            e.alpha -= 0.02;
            ctx.save();
            ctx.globalAlpha = Math.max(0, e.alpha);
            ctx.fillStyle = "yellow";
            ctx.font = "bold 18px " + gameFont;
            ctx.textAlign = "center";
            ctx.fillText(e.text, e.x, e.y);
            ctx.restore();
            if (e.alpha <= 0) game.effects.splice(i, 1);
        }
    }

    function drawGameOver() {
        if (!game.gameOver) return;

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = "center";

        // Title
        ctx.fillStyle = "#ff4444";
        ctx.font = "bold 48px " + gameFont;
        ctx.fillText("GAME OVER", canvas.width / 2, 130);

        // Coins
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px " + gameFont;
        ctx.fillText(`Coins Collected: ${coins.toFixed(6)}`, canvas.width / 2, 180);

        // Buttons same as start screen
        const buttonWidth = 180;
        const buttonHeight = 50;
        const btnX = canvas.width / 2 - buttonWidth / 2;

        const playY = 220;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(btnX, playY, buttonWidth, buttonHeight);
        ctx.fillStyle = "white";
        ctx.font = "bold 16px " + gameFont;
        ctx.fillText("Play Again", canvas.width / 2, playY + 32);

        const menuY = 290;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(btnX, menuY, buttonWidth, buttonHeight);
        ctx.fillStyle = "white";
        ctx.font = "bold 16px " + gameFont;
        ctx.fillText("Main Menu", canvas.width / 2, menuY + 32);

        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "14px " + gameFont;
        ctx.fillText("Tap a button to continue", canvas.width / 2, canvas.height - 20);
    }

    function update() {
        if (!game.running || game.paused || game.gameOver) return;
        game.frames++;
        game.bird.velocity += game.gravity;
        game.bird.y += game.bird.velocity;

        if (game.bird.falling) {
            game.bird.rotation += 0.3;
            if (game.bird.y > canvas.height) {
                if (lives <= 0) game.gameOver = true;
                else game.paused = true;
            }
            return;
        }

        if (game.frames % 90 === 0) {
            game.obstacles.push({
                x: canvas.width,
                y: Math.random() * (canvas.height - 100) + 20,
                w: 40,
                h: 40,
                type: "obstacle" + (Math.floor(Math.random() * 3) + 1)
            });
            game.coinsOnScreen.push({ x: canvas.width + 40, y: Math.random() * (canvas.height - 50), type: "normal" });
            if (Math.random() < 0.1) {
                game.coinsOnScreen.push({ x: canvas.width + 100, y: Math.random() * (canvas.height - 50), type: "big" });
            }
        }

        for (let i = game.obstacles.length - 1; i >= 0; i--) {
            let o = game.obstacles[i];
            o.x -= 2.5;
            if (images[o.type] && game.bird.x < o.x + o.w && game.bird.x + game.bird.width > o.x &&
                game.bird.y < o.y + o.h && game.bird.y + game.bird.height > o.y) hitObstacle();
            if (o.x < -50) game.obstacles.splice(i, 1);
        }

        for (let i = game.coinsOnScreen.length - 1; i >= 0; i--) {
            let c = game.coinsOnScreen[i];
            c.x -= 2;
            let size = c.type === "big" ? 40 : 25;
            if (game.bird.x < c.x + size && game.bird.x + game.bird.width > c.x &&
                game.bird.y < c.y + size && game.bird.y + game.bird.height > c.y) {

                let val = c.type === "big" ? coinValue * 100 : coinValue;
                coins = parseFloat((coins + val).toFixed(8));
                saveData();

                if (sounds.enabled) { sounds.coin.pause(); sounds.coin.currentTime = 0; sounds.coin.play(); }
                game.effects.push({ x: c.x, y: c.y, alpha: 1, text: c.type === "big" ? "+100" : "+1" });
                game.coinsOnScreen.splice(i, 1);

                if (navigator.vibrate) navigator.vibrate(c.type === "big" ? 50 : 20);
            } else if (c.x < -100) game.coinsOnScreen.splice(i, 1);
        }
        if (game.bird.y > canvas.height || game.bird.y < 0) hitObstacle();
    }

    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        if (shakeTimer > 0) {
            ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5);
            shakeTimer--;
        }
        if (game.screen === "game" && bgVideo && bgVideo.readyState >= 2) ctx.drawImage(bgVideo, 0, 0, canvas.width, canvas.height);
        else if (images.background.complete) ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);

        if (game.screen === "game" || game.screen === "main") {
            game.obstacles.forEach(o => {
                if (images[o.type] && images[o.type].complete) {
                    ctx.drawImage(images[o.type], o.x, o.y, o.w, o.h);
                }
            });

            game.coinsOnScreen.forEach(c => {
                let img = c.type === "big" ? images.coin2 : images.coin;
                let size = c.type === "big" ? 40 : 25;
                if (img.complete) ctx.drawImage(img, c.x, c.y, size, size);
            });

            let b = game.bird; b.frameCount++;
            if (b.frameCount >= 5) { b.frame = (b.frame + 1) % 20; b.frameCount = 0; }
            if (images.bird.complete) {
                ctx.save();
                ctx.translate(b.x + b.width / 2, b.y + b.height / 2);
                ctx.rotate(b.falling ? b.rotation : b.velocity * 0.05);
                ctx.drawImage(images.bird, (b.frame % 5) * 100, Math.floor(b.frame / 5) * 100, 100, 100, -b.width / 2, -b.height / 2, b.width, b.height);
                ctx.restore();
            }
            drawEffects();
        }
        ctx.restore();
        drawUI();
        drawCanvasButtons();
        drawGameOver();
        update();
        animationId = requestAnimationFrame(loop);
    }

    function hitObstacle() {
        if (game.bird.falling || game.gameOver) return;
        if (sounds.enabled) { sounds.collision.pause(); sounds.collision.currentTime = 0; sounds.collision.play(); }
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        lives--;
        if (lives <= 0) {
            game.gameOver = true;
            return;
        }

        shakeTimer = 15;
        game.bird.falling = true;
        game.bird.velocity = -4;
        bgMusic.pause();
    }

    function fly() {
        if (game.running && !game.paused && !game.gameOver && !game.bird.falling) {
            game.bird.velocity = game.jump;
            if (sounds.enabled) { sounds.flap.pause(); sounds.flap.currentTime = 0; sounds.flap.play(); }
        }
    }

    function startOrFly() {
        if (!game.running || game.gameOver) restartGame();
        else if (game.paused) {
            game.paused = false;
            game.obstacles = [];
            game.coinsOnScreen = [];
            game.bird.y = 150;
            game.bird.velocity = 0;
            game.bird.falling = false;
            if (bgVideo) bgVideo.play().catch(() => {});
            if (sounds.enabled) bgMusic.play().catch(() => {});
        } else fly();
    }

    function restartGame() {
        lives = 5;
        game.bird.y = 150; game.bird.velocity = 0; game.bird.falling = false; game.bird.rotation = 0;
        game.obstacles = []; game.coinsOnScreen = []; game.effects = []; game.frames = 0;
        game.running = true; game.paused = false; game.gameOver = false; game.screen = "game";
        canvas.style.display = "block"; nftCanvas.style.display = "none";
        if (bgVideo) { bgVideo.currentTime = 0; bgVideo.play().catch(() => {}); }
        if (sounds.enabled) { bgMusic.currentTime = 0; bgMusic.play().catch(() => {}); }
        if (navigator.vibrate) navigator.vibrate(50);
    }

    function goToMainMenu() {
        game.running = false;
        game.paused = false;
        game.gameOver = false;
        game.screen = "main";
        game.obstacles = [];
        game.coinsOnScreen = [];
        game.effects = [];
        game.bird.y = 150;
        game.bird.velocity = 0;
        game.bird.falling = false;
        game.bird.rotation = 0;
        canvas.style.display = "block";
        nftCanvas.style.display = "none";
        if (bgVideo) bgVideo.pause();
        bgMusic.pause();
    }

    document.addEventListener("keydown", e => { if (e.code === "Space") startOrFly(); });
    document.fonts.ready.then(() => { loop(); });
};
