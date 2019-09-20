/*
	Game: Candy Crush clone (simple) made in 2 days with Javascript, html/css (dom), Jquery & HammerJS
	Author: Didier Chartrain <copycut.design@gmail.com> <http://github.com/copycut>
	Date: 14 March 2014
	Update: small debug @ 16 March 2014 - Combo updating
*/

/*
TASKS
//spd - zapewne szybkość
- 5 rows, columns
- dragright, dragleft źle działa na granicach
*/


var newGame;

var Game = function () {
	this.init = function (size, base, ui) {
		this.base = base;
		this.ui = ui;
		this.originalSize = size;
		this.size = this.originalSize * this.originalSize;
		this.caseHeight = base.height() / this.originalSize;
		this.level = [];
		this.typesOfGems = 5;
		this.fillEnd = true;
		this.switchEnd = true;
		this.playerCanControl = false;

		this.score = 0;
		this.combo = 0;
		this.bestCombo = 0;

		this.isHit = false;
		this.gPosition = 0;
		this.gDirection = '';
		this.scoreToNextLevel = 600;
		this.levelRequirements = [0, 600, 1200, 2000, 10000];
		this.currentLevel = 1;
		this.hasGameEnded = false;
		this.time = 60;

		this.scoreUpdate(0);
		this.populateLevel();
		this.drawNewLevel();
		// $('#progressScore').on('mouseenter', this.drawScoreOnBar.bind(this))
		setTimeout($.proxy(this.checkLines, this), 200); //test was 1000
	};

	this.releaseGameControl = function (play) {
		if (play) {
			this.playerCanControl = true;
			if (!this.isHit) {
				this.testMove(this.gPosition, this.gDirection);
				this.isHit = 1;
				this.playerCanControl = false;
			}
		} else {
			this.playerCanControl = false;
		}
	};

	this.bindDraggableEvent = function () {
		var that = this;
		var position;

		this.base.hammer().on('dragleft dragright dragup dragdown', '.row', function (event) {
			event.gesture.preventDefault();

			position = +$(this).attr('data-id');

			if (position !== undefined) {
				that.testMove(position, event.type);
				event.gesture.stopDetect();
				return;
			}
		});
	};

	this.testMove = function (position, direction) {
		if (this.hasGameEnded) return;
		this.gPosition = position;
		switch (direction) {
			case "dragleft":
				if (position % this.originalSize !== 0) {
					this.isHit = 0;
					this.gDirection = 'dragright';
					this.swipeGems(this.base.find('.row[data-id=' + position + ']'), position, this.base.find('.row[data-id=' + (position - 1) + ']'), position - 1);
				}
				break;

			case "dragright":
				if (position % this.originalSize !== this.originalSize - 1) {
					this.isHit = 0;
					this.gDirection = 'dragleft';
					this.swipeGems(this.base.find('.row[data-id=' + position + ']'), position, this.base.find('.row[data-id=' + (position + 1) + ']'), position + 1);
				}
				break;

			case "dragup":
				this.isHit = 0;
				this.gDirection = 'dragdown';
				this.swipeGems(this.base.find('.row[data-id=' + position + ']'), position, this.base.find('.row[data-id=' + (position - this.originalSize) + ']'), position - this.originalSize);
				break;

			case "dragdown":
				this.isHit = 0;
				this.gDirection = 'dragup';
				this.swipeGems(this.base.find('.row[data-id=' + position + ']'), position, this.base.find('.row[data-id=' + (position + this.originalSize) + ']'), position + this.originalSize);
				break;
		}
	};

	this.swipeGems = function (a, aID, b, bID) {
		if (this.hasGameEnded) return;

		if (this.switchEnd && a !== undefined && b !== undefined && aID >= 0 && bID >= 0 && aID <= this.size && bID <= this.size) {
			var that = this;
			var aTop = a.css('top');
			var aLeft = a.css('left');
			var bTop = b.css('top');
			var bLeft = b.css('left');
			var aType = this.level[aID];
			var bType = this.level[bID];

			this.switchEnd = false;

			this.level[aID] = bType;
			this.level[bID] = aType;

			this.comboUpdate(0);

			a.attr('data-id', bID).animate({
				top: bTop,
				left: bLeft
			}, 250);

			b.attr('data-id', aID).animate({
				top: aTop,
				left: aLeft
			}, 250, function () {
				that.switchEnd = true;
				return that.checkLines(); //test
			});
		}
	};

	this.populateLevel = function () {
		if (this.hasGameEnded) return;
		var i;
		for (i = 0; i < this.size; i++) {
			this.level[i] = Math.round(Math.random() * this.typesOfGems + 1);
		}
	};

	this.drawNewLevel = function () {
		if (this.hasGameEnded) return;
		var i;
		var row = $(document.createElement('div'));
		var lines = -1;

		$('.row').remove();

		for (i = 0; i < this.size; i++) {

			if (i % this.originalSize === 0) {
				lines++;
			}
			row.css({
				top: lines * this.caseHeight,
				left: i % this.originalSize * this.caseHeight,
				height: this.caseHeight,
				width: this.caseHeight,
			}).attr({
				"class": 'type-' + this.level[i] + ' row level' + this.currentLevel,
				"data-id": i
			});

			this.base.append(row.clone());
		}

		this.lines = lines + 1;
		this.itemByLine = this.size / this.lines;

		this.bindDraggableEvent();
		this.releaseGameControl(true);
	};

	this.checkLines = function () {
		if (this.hasGameEnded) return;
		var k;
		var counter = 0;


		//reset
		this.base.find('.row').removeClass('.glow');

		for (k = 0; k < this.size; k++) {
			counter = counter + this.checkGemAround(this.level[k], k);
		}

		if (counter === this.size) {
			this.releaseGameControl(true);
			return true;
		} else {
			this.releaseGameControl(false);
			return false;
		}
	};

	this.checkGemAround = function (gemType, position) {
		if (this.hasGameEnded) return;
		var flag = false;

		//5 gems horizontaly
		if (this.level[position - 1] === gemType && this.level[position + 1] === gemType && this.level[position + 2] === gemType && this.level[position + 3] === gemType && position % this.lines && (position + 1) % this.lines !== 0 && (position + 2) % this.lines !== 0 && (position + 3) % this.lines !== 0 && (position) % this.lines !== 0) {
			this.removeClearedGemToLevel([position - 1, position, position + 1, position + 2, position + 3]);
			this.isHit = 1;
		} else {
			flag = true;
		}

		//4 gems horizontaly
		if (this.level[position - 1] === gemType && this.level[position + 1] === gemType && this.level[position + 2] === gemType && (position + 2) % this.lines !== 0 && (position + 1) % this.lines !== 0 && position % this.lines) {
			this.removeClearedGemToLevel([position, position - 1, position + 1, position + 2]);

			this.isHit = 1;
		} else {
			flag = true;
		}

		//3gems horizontaly
		if (this.level[position - 1] === gemType && this.level[position + 1] === gemType && (position + 1) % this.lines !== 0 && position % this.lines) {
			this.removeClearedGemToLevel([position, position - 1, position + 1]);
			this.isHit = 1;
		} else {
			flag = true;
		}

		//5gems verticaly
		if (this.level[position - this.itemByLine] === gemType && this.level[position + this.itemByLine] === gemType && this.level[position + this.itemByLine * 2] === gemType && this.level[position + this.itemByLine * 3] === gemType) {
			this.removeClearedGemToLevel([position - this.itemByLine, position, position + this.itemByLine, position + this.itemByLine * 2, position + this.itemByLine * 3]);
			this.isHit = 1;
		} else {
			flag = true;
		}

		//4gems verticaly
		if (this.level[position - this.itemByLine] === gemType && this.level[position + this.itemByLine] === gemType && this.level[position + this.itemByLine * 2] === gemType) {
			this.removeClearedGemToLevel([position - this.itemByLine, position, position + this.itemByLine, position + this.itemByLine * 2, position - this.itemByLine * 2]);
			this.isHit = 1;
		} else {
			flag = true;
		}

		//3gems verticaly
		if (this.level[position - this.itemByLine] === gemType && this.level[position + this.itemByLine] === gemType) {
			this.removeClearedGemToLevel([position - this.itemByLine, position, position + this.itemByLine]);
			this.isHit = 1;
		} else {
			flag = true;
		}


		if (flag) {
			return 1;
		} else {
			return 0;
		}
	};

	this.removeClearedGemToLevel = function (gemsToRemove) {
		var i;
		for (i = 0; i < gemsToRemove.length; i++) {
			this.level[gemsToRemove[i]] = 0;
			this.animateRemoveGems(gemsToRemove[i]);
		}
	};

	this.animateRemoveGems = function (position) {
		var that = this;

		var difference = this.caseHeight / 2;

		this.base.find('.row[data-id=' + position + ']')
			.attr('data-id', false)
			.addClass('glow').animate({
				marginTop: difference,
				marginLeft: difference,
				height: 0,
				width: 0
			}, 500, function () {
				$(this).remove();
				that.scoreUpdate(100);
			});

		if (that.fillEnd) {
			that.comboUpdate(1);
			that.fillHoles();
		}
	};

	this.moveGems = function (position, line, colPosition, destination) {
		if (this.hasGameEnded) return;
		var that = this;

		this.base.find('.row[data-id=' + position + ']').animate({
			top: Math.abs(line * that.caseHeight)
		}, 100, "swing").attr('data-id', destination);

		this.level[destination] = this.level[position];
		this.level[position] = 0;

		if (line === 1) {
			this.createNewRandomGem(colPosition);
		}
	};

	this.createNewRandomGem = function (colPosition) {
		if (this.hasGameEnded) return;
		var gem = $(document.createElement('div'));

		this.level[colPosition] = Math.round(Math.random() * this.typesOfGems + 1);
		gem.addClass('type-' + this.level[colPosition] + ' row level' + this.currentLevel).css({
			top: -this.caseHeight,
			left: colPosition * this.caseHeight,
			height: this.caseHeight,
			width: this.caseHeight,
			opacity: 0
		}).attr({
			"data-id": colPosition
		});

		gem.appendTo(this.base);

		gem.animate({
			top: 0,
			opacity: 1
		}, 50);

		this.bindDraggableEvent();
	};

	this.fillHoles = function () {
		if (this.hasGameEnded) return;

		var i;
		var counter = 0;

		this.releaseGameControl(false);

		this.fillEnd = false;

		for (i = 0; i < this.level.length; i++) {

			var under = i + this.originalSize;
			var lignePosition = Math.floor(under / this.originalSize);
			var colPosition = under - Math.floor(lignePosition * this.originalSize);

			if (this.level[under] === 0 && this.level[i] !== 0) {

				if (this.level[under] === 0 && this.level[under] !== undefined) {
					this.moveGems(i, lignePosition, colPosition, under);
				}

				break;

			} else if (this.level[i] === 0) {
				this.createNewRandomGem(colPosition);
			} else if (this.level[i] !== 0) {
				counter++;
			}
		}

		if (this.level.length === counter) {
			this.fillEnd = true;
			return setTimeout($.proxy(this.checkLines, this), 50); //spd
		} else {
			return setTimeout($.proxy(this.fillHoles, this), 50);
		}
	};


	this.scoreUpdate = function (score) {
		if (this.hasGameEnded) return;
		this.score = Math.floor(this.score + score / 3, 10);
		this.ui.find('.score').text(this.score);
		var pointsInPercent = (this.score) * 100 / (this.scoreToNextLevel);

		$('#progressBar').css("flex-basis", pointsInPercent + "%")

		if (this.currentLevel === 4) {
			$('#progressScore').text(this.score);
		} else {
			$('#progressScore').text(this.score + '/' + this.scoreToNextLevel)
		}


		if (this.score >= (this.levelRequirements[this.currentLevel])) {
			this.moveNextLevel(this.score)
		}
	};

	this.moveNextLevel = function (score) {
		if (this.hasGameEnded) return;
		this.currentLevel += 1;

		if (this.currentLevel === 4) {
			document.querySelector('#progressBar').className = 'level' + this.currentLevel;
			return;
		}

		const arrOfRows = document.querySelectorAll(`.row`);

		document.body.className = 'level' + this.currentLevel;
		document.querySelector('#map').className = 'level' + this.currentLevel;
		document.querySelector('#progressBar').className = 'level' + this.currentLevel;

		for (var i = 0; i < arrOfRows.length; i++) {
			arrOfRows[i].classList.add('level' + this.currentLevel);
		}

		this.scoreToNextLevel = this.levelRequirements[this.currentLevel];
		var pointsInPercent = score * 100 / (this.scoreToNextLevel);

		$('#progressScore').text(this.score + '/' + this.scoreToNextLevel)
		$('#progressBar').css("flex-basis", pointsInPercent + "%")
	}

	this.comboUpdate = function (combo) {

		if (combo > 0) {
			this.combo = this.combo + combo;
			this.ui.find('.combo').text(this.combo);
		} else {
			this.combo = 0;
		}

		if (this.combo >= this.bestCombo) {
			this.bestCombo = this.combo;
			this.ui.find('.bestCombo').text(this.bestCombo);
		}
	};

	this.end = function () {
		this.hasGameEnded = true;
	}
};


$(document).ready(function () {
	var $game = $('#game');
	var $ui = $('#ui');
	var time = 60;
	var timeSpan = document.querySelector('.time');
	var counter;
	var highscore = [2056, 1900, 1450, 1200, 900, 120];
	scoreboardPopulate();


	$('#buttonStart').on('click', function (event) {
		event.preventDefault();
		$('.message').hide();
		newGame = new Game();
		newGame.init(8, $game, $ui);
		counter = setInterval(updateTime, 1000);
	});

	$('#buttonAgain').on('click', function (event) {
		event.preventDefault();
		$('.message').hide();
		newGame.init(8, $game, $ui);
		time = 60;
		counter = setInterval(updateTime, 1000);
	});

	$('#showMap').on('click', function () {
		$("#map").toggleClass("hide");
		$("#showMap").toggleClass("active");
	})

	$('#showScores').on('click', function () {
		$("#scoreboard").toggleClass("hide");
		$("#showScores").toggleClass("active");
	})

	function updateTime() {
		time--;
		minutes = Math.floor(time / 60);
		seconds = time % 60;
		timeSpan.textContent = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`; //A bit of ES6
		if (time <= 0) {
			endGame()
		};
	}

	function scoreboardPopulate(myscore) {
		$('.myscore').removeClass('myscore');
		var starsNumber = `<i class="fa fa-star" aria-hidden="true"></i>`;
		for (var i = 1; i <= 5; i++) {
			var li = document.querySelector('ol li:nth-child(' + i + ')');
			var rating = 1;
			var score = highscore[i - 1];
			if (score >= 1000 && score < 2000) rating = 2;
			else if (score >= 2000) rating = 3;

			li.innerHTML = `<div>
					<div><i class="fa fa-pencil-square-o" aria-hidden="true"></i>` + score + `</div>
					` + starsNumber + (rating >= 2 ? starsNumber : '') + (rating >= 3 ? starsNumber : '') + `</div>`;
			if (score === myscore) li.classList.add('myscore');
		}
	}

	function endGame() {
		var score = newGame.score;
		clearInterval(counter);
		highscore.push(Number(score));
		highscore.sort(function (a, b) {
			return b - a
		});

		newGame.end();

		scoreboardPopulate(score);

		$("#game div").fadeOut(1000, function () {
			$('#game div').remove();
			$('.messageEnd').show();
		});

		$('.messageEnd .score').text(score)
	}

});