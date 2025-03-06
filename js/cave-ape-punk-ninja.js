    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Load the background image
    const backgroundImage = new Image();
    backgroundImage.src = 'img/apekong.webp';

    backgroundImage.onload = () => {
        // Set the canvas size to be 100px smaller on all sides
        canvas.width = backgroundImage.width - 200;  // 100px smaller on both sides
        canvas.height = backgroundImage.height - 200; // 100px smaller on both sides

        // Start the game loop once the image is loaded
        //gameLoop();
    };

    // Update the game loop to check for hearts
    let hearts = []; // Array to store heart objects
    let xchcoins = 0;
	let cats = 0; // Track the number of cats
    let lives = 3;
    let velocityY = 0;
    let gravity = 0.2;
    let jumpPower = 10; // Power for each jump
    let apeY = canvas.height - 150; // Start ape near the bottom
    let gameOver = false;
    let lastObstacleTime = 0; // To track when the last obstacle was created
    let isPaused = false; // Track if the game is paused

    const backgroundSpeed = 1;
    let backgroundX = 0;

    const coins = [];
    const coinWidth = 25;
    const coinHeight = 25;

    const obstacles = [];
    const obstacleWidth = 59;
    const obstacleHeight = 59;

    let obstacleInterval = 6000; // Start with 6 seconds interval for obstacles
    let lastObstacleSpawnTime = Date.now(); // Keep track of when obstacles spawn
    
	let countdownInterval;  // Declare the interval variable globally to clear it when needed
	let isWebviewOpen = false; // Flag to check if webview is open
	let isInInstructions = false; // Instructions


	// Add an input event listener to the nickname input field
	document.getElementById('nickname').addEventListener('input', function(event) {
		// Force the value to uppercase
		event.target.value = event.target.value.toUpperCase();
	});
		
	// Submit Score
    function submitScore() {
        let nickname = document.getElementById('nickname').value.trim();

        // Validate nickname (only uppercase letters, numbers, and max 22 characters)
        if (!/^[A-Z0-9]{1,22}$/.test(nickname)) {
            alert("Nickname should only contain uppercase letters and numbers, and be at most 22 characters long.");
            return;
        }
        // Get leaderboard from localStorage
        let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];

        // Add new score to leaderboard
        leaderboard.push({ nickname, score: xchcoins });

        // Sort leaderboard in descending order by score and keep top 3
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 3); // Keep only top 3 scores

        // Save the updated leaderboard to localStorage
        localStorage.setItem('leaderboard', JSON.stringify(leaderboard));

        // Hide the score form after submitting
        document.getElementById('scoreForm').style.display = 'none';
        alert("Score Submitted!");
    }

    // Open the leaderboard modal
    function openLeaderboard() {
        let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
        let leaderboardList = document.getElementById('leaderboardList');

        // Clear current leaderboard list
        leaderboardList.innerHTML = '';

        // Add top 3 scores to the list
        leaderboard.forEach(entry => {
            let li = document.createElement('li');
            li.textContent = `${entry.nickname}: ${entry.score} XCH`;
            leaderboardList.appendChild(li);
        });

        // Show leaderboard modal
        document.getElementById('leaderboard').style.display = 'block';
		isPaused = true;  // Pause the game
		document.getElementById('pausedMessage').style.display = 'block'; // Show pause message
		document.getElementById('pauseBtn').disabled = true;  // Disable pause button while in instructions
		document.getElementById('instructionsBtn').disabled = true;  // Disable instructions button while in instructions
		document.getElementById('catsBtn').disabled = true;  // Disable Insert CATs button while in instructions
				
    }

    // Close the leaderboard modal
    function closeLeaderboard() {
        document.getElementById('leaderboard').style.display = 'none';
		document.getElementById('pauseBtn').disabled = false;  // Enable pause button again
		document.getElementById('instructionsBtn').disabled = false;  // Enable instructions button again
		document.getElementById('catsBtn').disabled = false;  // Enable Insert CATs button while in instructions
		isPaused = false;  // Resume the game
		document.getElementById('pausedMessage').style.display = 'none'; // Hide pause message
    }

	// Ape object with collision detection feedback
	const apeFaceImage = new Image();
	apeFaceImage.src = 'img/ape_face.svg'; // Path to your ape_face.svg
	
	const ape = {
		x: 100,
		y: apeY,
		width: 50, // Increased width
		height: 60, // Increased height
		armOffset: 0, // To control arm position
		legOffset: 0, // To control leg position
		isColliding: false, // To track if a collision occurs
		draw: function () {
			// Draw the ape head as an image with a size of 36x36 (10px bigger for width and height)
			ctx.drawImage(apeFaceImage, this.x + 5, this.y - 5, 39, 39); // 10px bigger for width and height
			
			// Change the color of the body if a collision is detected (body turns red)
			ctx.fillStyle = this.isColliding ? 'red' : '#C6F403'; // Red for body if colliding, brown otherwise
			ctx.fillRect(this.x + 12, this.y + 36, 26, 18); // Adjusted body position to match new head size

			// Legs - Keep legs regardless of collision
			ctx.fillStyle = '#C6F403';
			ctx.fillRect(this.x + this.legOffset, this.y + 55, 14, 11); // Left leg
			ctx.fillRect(this.x + 36 - this.legOffset, this.y + 55, 14, 11); // Right leg
	
			// Arms - Keep arms regardless of collision
			ctx.fillStyle = '#C6F403';
			ctx.fillRect(this.x - 5, this.y + 30 + this.armOffset, 14, 7); // Left arm
			ctx.fillRect(this.x + 40, this.y + 30 + this.armOffset, 14, 7); // Right arm
		},
		jump: function () {
			velocityY = -jumpPower; // Make the ape jump
		},
		updateJump: function () {
			velocityY += gravity; // Apply gravity to velocity
			apeY += velocityY;
	
			// Arm and leg movement simulation during the jump
			if (velocityY < 0) { // Ape is jumping
				this.armOffset = 7; // Move arms down
				this.legOffset = 7; // Move legs towards the center
			} else if (velocityY > 0) { // Ape is falling
				this.armOffset = 0; // Arms return to default
				this.legOffset = 0; // Legs return to default
			}
	
			if (apeY >= canvas.height - 150) {
				apeY = canvas.height - 150;
				velocityY = 0; // Reset velocity when reaching the ground
				this.armOffset = 0; // Reset arms to default position
				this.legOffset = 0; // Reset legs to default position
			}
		},
		handleCollision: function () {
			// If collision detected, make the body red for 2 seconds
			if (this.isColliding) {
				setTimeout(() => {
					this.isColliding = false; // Reset collision state after 2 seconds
				}, 2000); // 2000ms = 2 seconds
			}
		}
	};


	// The API URL that provides the token details
	const apiUrl = 'https://api.v2.tibetswap.io/token/76f8a24339230dcf8f83d79a6d7823929671f9dcc564583ae17f5aafaeceb68c';

    // Coin object (randomized position)
	function createCoin() {
		const coin = {
			x: Math.random() * (canvas.width - coinWidth) + canvas.width,
			y: Math.random() * (canvas.height - 150 - coinHeight) + 50, // Random Y position
			width: coinWidth,
			height: coinHeight,
			img: new Image(), // Create an Image object
			draw: function () {
				this.img.src = 'img/xch.svg'; // Set the coin image source
				ctx.drawImage(this.img, this.x, this.y, this.width, this.height); // Draw the coin image
			}
		};
		coins.push(coin);
	}

	// Spinning chain of balls obstacle
	function createBallChainObstacle() {
		const ballChain = {
			x: canvas.width,
			y: Math.random() * (canvas.height - 150), // Random height
			numBalls: 5, // Number of balls in the chain
			ballRadius: 30, // Distance from the center
			angle: 0, // Rotation angle for the chain
			speed: 0.02, // Rotation speed
			draw: function () {
				let prevX = this.x;
				let prevY = this.y;
	
				for (let i = 0; i < this.numBalls; i++) {
					const ballAngle = this.angle + i * (Math.PI / this.numBalls); // Spacing balls apart
	
					const ballX = prevX + Math.cos(ballAngle) * this.ballRadius;
					const ballY = prevY + Math.sin(ballAngle) * this.ballRadius;
	
					ctx.beginPath();
					ctx.arc(ballX, ballY, 10, 0, Math.PI * 2); // Draw each ball in the chain
					ctx.fillStyle = 'orange';
					ctx.fill();
					ctx.closePath();
	
					prevX = ballX;
					prevY = ballY;
				}
			},
			update: function () {
				this.x -= 4; // Move obstacle leftward
				this.angle += this.speed; // Rotate the chain
			},
			checkCollision: function () {
				let prevX = this.x;
				let prevY = this.y;
				for (let i = 0; i < this.numBalls; i++) {
					const ballAngle = this.angle + i * (Math.PI / this.numBalls); // Spacing balls apart
					const ballX = prevX + Math.cos(ballAngle) * this.ballRadius;
					const ballY = prevY + Math.sin(ballAngle) * this.ballRadius;
	
					// Check collision with the ape
					if (
						ape.x < ballX + 10 &&
						ape.x + ape.width > ballX - 10 &&
						ape.y < ballY + 10 &&
						ape.y + ape.height > ballY - 10
					) {
						ape.isColliding = true; // Mark collision detected
						setTimeout(() => {
							ape.isColliding = false; // Reset collision after 2 seconds
						}, 2000); // 2 seconds
						return true; // Collision detected
					}
					prevX = ballX;
					prevY = ballY;
				}
				return false; // No collision
			}
		};
		obstacles.push(ballChain);
	}
	
	// Heart object (moves from right to left)
	function createHeart() {
		const heart = {
			x: canvas.width,
			y: Math.random() * (canvas.height - 150), // Random vertical position
			width: 30, // Size of the heart
			height: 30, // Size of the heart
			img: new Image(),
			draw: function () {
				this.img.src = 'img/heart.svg'; // Set the heart SVG image
				ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
			},
			update: function () {
				this.x -= 4; // Move the heart from right to left
			},
			checkCollision: function () {
				if (
					ape.x < this.x + this.width &&
					ape.x + ape.width > this.x &&
					ape.y < this.y + this.height &&
					ape.y + ape.height > this.y
				) {
					return true; // Collision detected
				}
				return false; // No collision
			}
		};
		hearts.push(heart); // Add the heart to the array
	}
    
	// Obstacle object (bombsec or nftball)
	function createObstacle() {
		const obstacleType = Math.random() < 0.5 ? 'bombsec' : 'nftball'; // Randomly choose obstacle type
		const obstacle = {
			x: canvas.width,
			y: Math.random() * (canvas.height - 150), // Place obstacles at random heights
			width: obstacleWidth,
			height: obstacleHeight,
			type: obstacleType,
			nftBallImg: new Image(), // Add image element for the NFT ball
			bombsecImg: new Image(), // Add image element for the bombsec
			draw: function () {
				if (this.type === 'bombsec') {
					// Load and draw the bombsec image (SVG)
					this.bombsecImg.src = 'img/bombsec.svg';
					ctx.drawImage(this.bombsecImg, this.x, this.y, this.width, this.height); // Draw the bombsec image
				} else if (this.type === 'nftball') {
					// Load and draw the NFT ball image (SVG)
					this.nftBallImg.src = 'img/nftbomb.svg';
					ctx.drawImage(this.nftBallImg, this.x, this.y, this.width, this.height); // Draw the NFT ball
				}
			},
			update: function () {
				this.x -= 2; // Move obstacles leftward
			},
			checkCollision: function () {
				// Check collision with the ape
				if (
					ape.x < this.x + this.width &&
					ape.x + ape.width > this.x &&
					ape.y < this.y + this.height &&
					ape.y + ape.height > this.y
				) {
					ape.isColliding = true; // Mark collision detected
					setTimeout(() => {
						ape.isColliding = false; // Reset collision after 2 seconds
					}, 2000); // 2 seconds
					return true; // Collision detected
				}
				return false; // No collision
			}
		};
		obstacles.push(obstacle);
	}

	// Update game elements to show collision feedback
	function update() {
		if (gameOver || isPaused) return;
	
		// Clear canvas and redraw
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	
		// Move the ape
		ape.updateJump();
		ape.y = apeY;
		ape.draw();
	
		// Draw and detect coin collisions
		coins.forEach((coin, index) => {
			coin.x -= 2; // Move coins leftward
			coin.draw();
			if (
				ape.x < coin.x + coin.width &&
				ape.x + ape.width > coin.x &&
				ape.y < coin.y + coin.height &&
				ape.y + ape.height > coin.y
			) {
				coins.splice(index, 1); // Remove coin
				xchcoins++; // Increase xchcoins
				createCoin(); // Create a new coin
				updatexchcoins();
			}
			if (coin.x + coin.width <= 0) {
				coins.splice(index, 1); // Remove off-screen coins
			}
		});
	
		// Draw and detect obstacle collisions
		obstacles.forEach((obstacle, index) => {
			obstacle.update();
			obstacle.draw();
			if (obstacle.checkCollision()) {
				obstacles.splice(index, 1); // Remove obstacle
				lives--; // Lose a life
				updateLives();
				if (lives <= 0) {
					endGame();
				}
			}
			if (obstacle.x + obstacle.width <= 0) {
				obstacles.splice(index, 1); // Remove off-screen obstacles
			}
		});
	
		// Draw and detect heart collisions
		hearts.forEach((heart, index) => {
			heart.update();
			heart.draw();
			if (heart.checkCollision()) {
				hearts.splice(index, 1); // Remove heart
				lives++; // Add one life
				updateLives(); // Update the lives display
			}
			if (heart.x + heart.width <= 0) {
				hearts.splice(index, 1); // Remove off-screen hearts
			}
		});
	
		// Spawn new coins every 2 seconds
		if (Math.random() < 0.02) createCoin();
		if (Math.random() < 0.0001) createHeart(); // 0.0001% chance to spawn a heart
	
		// Create obstacles based on dynamic interval
		if (Date.now() - lastObstacleSpawnTime >= obstacleInterval) {
			// Randomly decide between square, ball, or ball chain
			if (Math.random() < 0.33) {
				createObstacle();
			} else if (Math.random() < 0.66) {
				createBallChainObstacle();
			} else {
				createObstacle();
			}
			lastObstacleSpawnTime = Date.now(); // Update last obstacle spawn time
		}
	
		// Progressive difficulty - decrease the obstacle spawn interval
		if (Date.now() - lastObstacleSpawnTime > 30000) { // After 30 seconds, reduce the interval
			obstacleInterval = 4000; // Spawn obstacles every 4 seconds
		}
	}
	
	// Update XCH coins on screen
	function updatexchcoins() {
		document.getElementById('xchcoins').textContent = `XCH coins: ${xchcoins}`;
	}
	
	// Update lives on screen
	function updateLives() {
		document.getElementById('lives').textContent = `Lives: ${lives}`;
	}
	
	// Game over logic
	function endGame() {
		gameOver = true;
		document.getElementById('gameOver').style.display = 'block'; // Show the game over screen
		document.getElementById('finalScore').textContent = `Your Score: ${xchcoins}`; // Display the player's score
	
		// Check if the score qualifies for the leaderboard
		let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
		if (leaderboard.length < 3 || xchcoins > leaderboard[leaderboard.length - 1].score) {
			document.getElementById('scoreForm').style.display = 'block';  // Show the score submission form
		} else {
			document.getElementById('scoreForm').style.display = 'none';  // Don't show the form if score isn't top 3
		}
	
		document.getElementById('restartBtn').style.display = 'block'; // Show the restart button
	}


    // Restart the game
    function restartGame() {
	    if (cats <= 0) {
        alert("You need to insert CATs first!");
        return; // Prevent the game from starting if cats are 0
    }
    
        cats--; // Deduct 1 credit
		updateCATs(); // Update the cats display
		
		// Reset the game state
        xchcoins = 0;
        lives = 3;
        gameOver = false;
        apeY = canvas.height - 150;
        obstacles.length = 0; // Clear obstacles
        coins.length = 0; // Clear coins
        updatexchcoins();
        updateLives();
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('restartBtn').style.display = 'none';
        isPaused = false; // Unpause the game
        document.getElementById('pausedMessage').style.display = 'none';
    }

    // Toggle pause
    function togglePause() {
        isPaused = !isPaused;
        if (isPaused) {
            document.getElementById('pausedMessage').style.display = 'block';
        } else {
            document.getElementById('pausedMessage').style.display = 'none';
        }
    }

	// Add event listener for click/tap on the canvas
	canvas.addEventListener('click', () => {
		if (!isPaused && !gameOver) {
			ape.jump(); // Make the ape jump when the screen is tapped
		}
	});

    // Key event listeners
    window.addEventListener('keydown', (event) => {
        if (event.key === ' ' && !isPaused && !gameOver) {
            ape.jump(); // Jump on spacebar press
        }
        if (event.key === 'Escape') {
            togglePause(); // Pause on escape key press
        }
    });

	// Add cats function
	function addcats() {
		openWebview(); // Show the webview
		createOffer(); // Call API to create the offer (mocked in this case)
		//cats++; // Increase cats by 1
		//addcatsx();
		//updateCATs(); // Update the cats display
	}
		
	// Function to start the countdown and close the webview after the time runs out
	function startCountdownAndClose() {
		// Clear any existing countdown interval to prevent multiple intervals
		clearInterval(countdownInterval);
		
		let countdown = 9;  // Set the countdown to 9 seconds
		const timerElement = document.getElementById('timer'); // Get the timer display element
		
		// Initialize the countdown timer display to 9 seconds
		timerElement.textContent = countdown;
		
		// Ensure the countdown starts properly
		countdownInterval = setInterval(() => {
			countdown--;  // Decrease the countdown by 1 second
			timerElement.textContent = countdown;  // Update the displayed countdown
			
			if (countdown <= 0) {
				// Clear the interval once the countdown is done
				clearInterval(countdownInterval);
		
				// Close the webview after the countdown
				closeWebview();
			}
		}, 1000); // 1000ms = 1 second
	}
	
	// Function to open the webview
	function openWebview() {
		if (isWebviewOpen) return;  // Prevent opening if the webview is already open
		isWebviewOpen = true;  // Mark webview as open
	
		// Pause the game when the "Insert CATs" button is pressed
		isPaused = true;
		document.getElementById('pausedMessage').style.display = 'block'; // Show pause message

    	const webview = document.getElementById('webview');
		webview.style.display = 'block'; // Display the webview
		fetchTokenDetails(); // Fetch and display the token details dynamically
		startCountdownAndClose(); // Start the countdown and close the webview after the time runs out
	}
		
	// Function to close the webview
	function closeWebview() {
		if (!isWebviewOpen) return;  // Prevent closing if webview is not open
		isWebviewOpen = false;  // Mark webview as closed
	
		const webview = document.getElementById('webview');
		webview.style.display = 'none'; // Hide the webview
	
		// After closing, simulate the purchase process by incrementing CATs
		cats++; // Increment the CATs count
		updateCATs(); // Update the display of CATs
		
		// Resume the game after closing the webview
		isPaused = false;
		document.getElementById('pausedMessage').style.display = 'none'; // Hide pause message
		//isPaused = true;  // Pause the game
		//document.getElementById('pausedMessage').style.display = 'block';
	}

    // Simulate API call to create an offer (this should be replaced with a real API call)
    function createOffer() {
        const apiUrl = 'https://api.v2.tibetswap.io/token/76f8a24339230dcf8f83d79a6d7823929671f9dcc564583ae17f5aafaeceb68c';
        const offerData = {
            offer: "Buy 1 token",
            action: "SWAP",
            total_donation_amount: 0,
            donation_addresses: [],
            donation_weights: []
        };

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(offerData)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Offer created:', data);
            // Simulate a successful offer response and close the webview
            setTimeout(() => closeWebview(), 9000); // Simulate waiting for a response
			// closeInstructions();  // Close instructions if Escape is pressed
        })
        .catch(error => {
            console.error('Error creating offer:', error);
        });
    }
		

	// Fetch the token details dynamically from the API
	function fetchTokenDetails() {
		fetch(apiUrl)
			.then(response => {
				// Log the status code for debugging
				console.log('Response status:', response.status);
	
				// Check if the response is successful
				if (!response.ok) {
					throw new Error(`API request failed with status: ${response.status}`);
				}
	
				return response.json();
			})
			.then(data => {
				console.log('API response:', data);
	
				if (data && data.asset_id && data.name) {
					// Update the DOM with the fetched data
					document.getElementById('assetName').textContent = data.name || 'N/A';
					document.getElementById('shortName').textContent = data.short_name || 'N/A';
					document.getElementById('assetId').textContent = data.asset_id || 'N/A';
					document.getElementById('pairId').textContent = data.pair_id || 'N/A';
					document.getElementById('verified').textContent = data.verified ? 'Yes' : 'No';
	
					// Clear any previous images in the tokenImage container
					const tokenImageContainer = document.getElementById('tokenImage');
					tokenImageContainer.innerHTML = ''; // This will remove any existing images
	
					// Optionally, update the image if it's available
					const imageUrl = data.image_url;
					if (imageUrl) {
						const imgElement = document.createElement('img');
						imgElement.src = imageUrl;
						imgElement.alt = data.name;
						imgElement.style.width = '100px'; // Adjust the size as needed
						imgElement.style.marginTop = '20px';
						tokenImageContainer.appendChild(imgElement); // Append the new image
					}
				} else {
					console.error('Unexpected API response structure:', data);
				}
			})
			.catch(error => {
				console.error('Error fetching token details:', error);
				// Update the message to indicate an error
				document.getElementById('assetName').textContent = 'Error loading data';
				document.getElementById('shortName').textContent = 'Error loading data';
				document.getElementById('assetId').textContent = 'Error loading data';
				document.getElementById('pairId').textContent = 'Error loading data';
				document.getElementById('verified').textContent = 'Error loading data';
			});
	}

	// Open Instructions Webview and Pause the Game
	function openInstructions() {
		if (!isInInstructions) {
			isPaused = true;  // Pause the game
			document.getElementById('pausedMessage').style.display = 'block'; // Show pause message
			document.getElementById('webviewInstructions').style.display = 'block';  // Show instructions
			document.querySelector('.close-instructions').style.display = 'block';
			document.getElementById('pauseBtn').disabled = true;  // Disable pause button while in instructions
			document.getElementById('instructionsBtn').disabled = true;  // Disable instructions button while in instructions
			document.getElementById('catsBtn').disabled = true;  // Disable Insert CATs button while in instructions
			isInInstructions = true;
		}
	}
		
	// Close Instructions Webview and Resume the Game
	function closeInstructions() {
		document.getElementById('webviewInstructions').style.display = 'none';  // Hide instructions
		document.querySelector('.close-instructions').style.display = 'none';
		document.getElementById('pauseBtn').disabled = false;  // Enable pause button again
		document.getElementById('instructionsBtn').disabled = false;  // Enable instructions button again
		document.getElementById('catsBtn').disabled = false;  // Enable Insert CATs button while in instructions
		isInInstructions = false;
		isPaused = false;  // Resume the game
		document.getElementById('pausedMessage').style.display = 'none'; // Hide pause message			
	}
		
	// Listen for Escape key to close instructions and resume the game
	document.addEventListener('keydown', function(event) {
		if (event.key === 'Escape' && isInInstructions) {
			closeInstructions();  // Close instructions if Escape is pressed
		}
	});
	
	// Update the cats display
	function updateCATs() {
		document.getElementById('catsDisplay').textContent = `CATs: ${cats}`;
		document.getElementById('startBtn').disabled = cats <= 0; // Disable Start button if cats are 0
	}
	
	function closeicatsWebview() {
    		let webviewContainer = document.getElementById('webviewContainer');
    		webviewContainer.style.display = 'none'; // Hide the WebView when the close button is clicked
	}
	
	function startGame() {
    		if (cats <= 0) {
        	// Show the WebView container with a message
        	let webviewContainer = document.getElementById('webviewContainer');
        
        	// Display the WebView container
       	 	webviewContainer.style.display = 'flex';
        
        	return; // Prevent the game from starting if cats are 0
    	}
		
		cats--; // Deduct 1 credit
		updateCATs(); // Update the cats display
		document.getElementById('startBtn').style.display = 'none'; // Hide the Start button
		isPaused = false; // Unpause the game
		document.getElementById('pausedMessage').style.display = 'none';
		gameLoop(); // Start the game loop
	}

	// Start the game loop
    function gameLoop() {
        update();
        requestAnimationFrame(gameLoop);
    }
