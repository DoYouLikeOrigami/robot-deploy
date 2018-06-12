function CellType (data) {
	if (!data)
		data = {};

	this.collision = (data.collision) ? data.collision  : false;
	this.type = (data.type) ? data.type : 'GROUND';

	if (!!data.img) {
		this.img = data.img;

		if (!this.img)
			console.error('No img found by name ' + data.img);
	}
}

CellType.prototype = {
	getImg: function () {
		if (this.img && this.img.src) {
			return this.img;
		}
		else
			return false;
	},

	isColliding: function () {
		return this.collision;
	},

	activate: function () {
		return false;
	},

	react: function () {
		return false;
	},

	isTarget: function () {
		return false;
	},

	getType: function () {
		return this.type;
	}
}

function ObjectCell (data) {
	CellType.apply(this, arguments);

	this.x = data.x || -1;
	this.y = data.y || -1;
	this.game = data.game || false;
	this.map = data.map || false;
	this.destroyOnActivate = data.destroyOnActivate || false;
	this.destroyOnReact = data.destroyOnReact || false;
	this.target = (!!data.isTarget) ? data.isTarget : false;
	this.id = (!!data.id || data.id === 0) ? data.id : false;
}

ObjectCell.prototype = Object.create(CellType.prototype);
ObjectCell.prototype.constructor = ObjectCell;

ObjectCell.prototype.isTarget = function () {
	return this.target;
}

ObjectCell.prototype.getX = function () {
	return parseInt(this.x);
}

ObjectCell.prototype.getY = function () {
	return parseInt(this.y);
}

ObjectCell.prototype.getId = function () {
	return (this.id !== false) ? this.id : -1;
}

ObjectCell.prototype.destroy = function () {
	this.collision = false;

	this.x = -1;
	this.y = -1;

	this.target = false;
	this.game = false;
	this.map = false;
}

function TargetCell (data) {
	ObjectCell.apply(this, arguments);

	this.target = true;
	this.img = Loader.getImage('target');
	this.destroyOnActivate = true;
	this.type = 'TARGET';
}

TargetCell.prototype = Object.create(ObjectCell.prototype);
TargetCell.prototype.constructor = TargetCell;

TargetCell.prototype.activate = function() {
	if (this.game) {
		this.game.targets--;
		this.destroy();
	}
}

function FlagCell (data) {
	ObjectCell.apply(this, arguments);

	this.target = true;
	this.img = Loader.getImage('flag');
	this.destroyOnActivate = true;
	this.type = 'TARGET';
}

FlagCell.prototype = Object.create(ObjectCell.prototype);
FlagCell.prototype.constructor = FlagCell;

FlagCell.prototype.activate = function() {
	if (this.game) {
		this.game.targets--;
		this.destroy();
	}
}

FlagCell.prototype.react = function() {
	if (this.game) {
		this.game.targets--;
		this.destroy();
	}
}

function DangerCell (data) {
	ObjectCell.apply(this, arguments);

	this.img = Loader.getImage('danger');
	this.type = 'DANGER';
}

DangerCell.prototype = Object.create(ObjectCell.prototype);
DangerCell.prototype.constructor = DangerCell;

DangerCell.prototype.react = function() {
	if (this.game) {
		this.game.robot.destroy('Робот взорвался!');
	}
}

function TeleportCell (data) {
	ObjectCell.apply(this, arguments);

	this.img = Loader.getImage('teleport');
	this.to_x = (!!data.to_x || data.to_x === 0) ? data.to_x : 0;
	this.to_y = (!!data.to_y || data.to_y === 0) ? data.to_y : 0;

	this.type = 'TELEPORT';
}

TeleportCell.prototype = Object.create(ObjectCell.prototype);
TeleportCell.prototype.constructor = TeleportCell;

TeleportCell.prototype.react = function() {
	if (this.game) {
		this.game.robot.move(this.to_x, this.to_y);
	}
}

function Game (level_id) {
	this.level_id = level_id;
	this.isRunning = false;
	this.interval = false;

	this._loadData();
}

Game.prototype = {
	_loadData: function () {
		fetch('/level/' + this.level_id + '/data')
		  .then(function(response) {
		    return response.json()
		  })
		  .then(function(json) {
		    this.SETTINGS = json.SETTINGS;
				this.map = json.MAP;
				this.objects = json.Objects;
				this._load();
		  }.bind(this))
		  .catch(function(ex) {
		    console.log('parsing failed', ex)
		  })
	},

	_load: function () {
		this.canvas = document.getElementById(this.SETTINGS.CANVAS_ID);

		this.ctx = this.canvas.getContext("2d");

		let dataMap = {
			game: this,
			width: this.SETTINGS.WIDTH,
			height: this.SETTINGS.HEIGHT,
			map: this.map,
			blockSize: this.SETTINGS.BLOCK_SIZE,
			objects: this.objects
		};

		this.map = new Map(dataMap);

		let imgReady = this._loadImages();

		Promise.all(imgReady).then(function (loaded) {
			this._init();
		}.bind(this));
	},

	_loadImages: function () {
		return [
			Loader.loadImage('target', '/Template/img/target.svg'),
			Loader.loadImage('danger', '/Template/img/danger.svg'),
			Loader.loadImage('teleport', '/Template/img/teleport.svg'),
			Loader.loadImage('block', '/Template/img/block.jpg'),
			Loader.loadImage('tileset', '/Template/img/tileset2.png'),
			Loader.loadImage('robot', '/Template/img/robot2.svg'),
			Loader.loadImage('flag', '/Template/img/flag.svg')
		]
	},

	_init: function () {
		this.targets = this.SETTINGS.TARGETS;
		this.map.init();
		this.ctx.font = this.SETTINGS.FONT || '18px Arial';
		this.info = [];

		var dataRobot = {
			game: this,
			x: this.SETTINGS.ROBOT_X,
			y: this.SETTINGS.ROBOT_Y,
			dir: this.SETTINGS.ROBOT_DIR,
			energy: this.SETTINGS.ROBOT_ENERGY
		};
		this.robot = new Robot(dataRobot);

		this.IM = new Info(this);
		this.IM.update();
		this.SM = new StackMachine(this.map, this.robot);
	},

	_update: function () {
		if (this.isRunning) {
			if (!this.robot.fall()) this.SM.run(); // если робот не падает, запускаем машину стеков
			this.map.react(this.robot.x, this.robot.y);

			this.map.update(); // отрисовка карты
			this.robot.update(); // отрисовка робота
			this.IM.update();

			if (this.robot.checkDeath()) this.gameOver();
			if (this.targets < 1) this.gameWin();
		}
		else {
			clearInterval(this.interval);
		}
	},

	showMsg: function (data) {
		if (arguments.length) {
			Popup.info(data);
			return true;
		}
		else {
			console.error('no argument passed to showMsg function in Game object');
			return false;
		}
	},

	restart: function () {
		if (this.isRunning)
			return false;

		this.targets = this.SETTINGS.TARGETS;
		this.map.restart();
		this.robot.restart();
		this.IM.update();
	},

	gameOver: function () {
		this.isRunning = false;
	},

	gameWin: function () {
		this.isRunning = false;

		let data = {
			title: 'Поздравляем!',
			text: 'Робот выполнил задание!',
			btnText1: 'Перейти к следующему',
			btnText2: 'Улучшить алгоритм',
			btnHref1: this.level_id + 1,
			btnStyle1: 'AKCENT'
		};

		Popup.ask(data);
	},

	run: function (bytecode) {
		if (!!bytecode)
			this.SM.update(bytecode);

		this.restart();
		this.isRunning = true;
		this.interval = setInterval(this._update.bind(this), 750);
	}
}

function Info (game) {
	this.game = game;

	this.RESTART_BTN_SELECTOR = '.js--info-restart';
	this.WRITE_TARGETS_SELECTOR = '.js--info-write-targets';
	this.WRITE_ENERGY_SELECTOR = '.js--info-write-energy';

	this.writeTargets = document.querySelector(this.WRITE_TARGETS_SELECTOR);
	this.writeEnergy = document.querySelector(this.WRITE_ENERGY_SELECTOR);

	this._init();
}

Info.prototype = {
	_init: function () {
		this._bindRestart();
	},

	_bindRestart: function () {
		let btns = document.querySelectorAll(this.RESTART_BTN_SELECTOR);

		for (let i = 0; i < btns.length; i++) {
			btns[i].addEventListener('click', this.game.restart.bind(this.game));
		}
	},

	_writeInfo: function () {
		(this.game.info && this.game.info.hasOwnProperty('targets')) ?
			this.writeTargets.textContent = this.game.info.targets :
			this.writeTargets.textContent = '-';

		(this.game.info && this.game.info.hasOwnProperty('energy')) ?
			this.writeEnergy.textContent = this.game.info.energy :
			this.writeEnergy.textContent = '-';
	},

	update: function () {
		this.game.info.targets = (this.game.targets > -1) ? this.game.targets : 0;
		this._writeInfo();
	}
}

let Loader = {
	images: {}
};

Loader.loadImage = function (key, src) {
	let img = new Image();

	let d = new Promise(function (resolve, reject) {
		img.onload = function () {
			this.images[key] = img;
			resolve(img);
		}.bind(this);

		img.onerror = function () {
			reject('Could not load image: ' + src);
		};
	}.bind(this));

	img.src = src;
	return d;
};

Loader.getImage = function (key) {
	return (key in this.images) ? this.images[key] : null;
};

function Map (data) {
	this.game = data.game;
	this.width = data.width;
	this.height = data.height;
	this.map = data.map;
	this.blockSize = data.blockSize;
	this.objects = data.objects;
}

Map.prototype = {
	init: function () {
		this.game.ctx.canvas.width	= this.blockSize * this.width;
		this.game.ctx.canvas.height = this.blockSize * this.height;

		this.cellTypes = [];
		this.cellTypes['Block'] = new CellType({collision: true, img: Loader.getImage('tileset')});
		this.cellTypes['Empty'] = new CellType({collision: false, type: 'EMPTY'});

		this._initObjects();
		this._build();
	},

	_initObjects: function () {
		this.objectsOnMap = [];
		this.targetsCount = 0;
		this.objectId = 0;

		for (var i in this.objects) {
			var data = {
				name : this.objects[i].name,
				x : this.objects[i].x,
				y : this.objects[i].y,
				game : this.game,
				id : this.objectId++
			};

			if (data.name === 'Target') {
				this.targetsCount++;
				var newObject = new TargetCell(data);
			}

			if (data.name === 'Flag') {
				this.targetsCount++;
				var newObject = new FlagCell(data);
			}

			if (data.name === 'Danger') {
				var newObject = new DangerCell(data);
			}

			if (data.name === 'Teleport') {
				data.to_x = this.objects[i].to_x;
				data.to_y = this.objects[i].to_y;
				var newObject = new TeleportCell(data);
			}

			this.objectsOnMap.push(newObject);
		}

		if (this.targetsCount < this.game.targets)
			this.game.targets = this.targetsCount;
	},

	_build: function () {
		for (var i = 0; i < this.height; i++) {
			for (var j = 0; j < this.width; j++) {
				var index = this.width * i + j;

				if (!!this.map[index])
					this.game.ctx.drawImage(
						Loader.getImage('tileset'), // image
						(this.map[index] - 1) * this.blockSize, // source x
						0, // source y
						this.blockSize, // source width
						this.blockSize, // source height
						j * this.blockSize,	// target x
						i * this.blockSize, // target y
						this.blockSize, // target width
						this.blockSize // target height
					);
			}
		}

		for (var i in this.objectsOnMap) {
			this.game.ctx.drawImage(
				this.objectsOnMap[i].getImg(),
				this.objectsOnMap[i].getX() * this.blockSize,
				this.objectsOnMap[i].getY() * this.blockSize,
				this.blockSize,
				this.blockSize
			);
		}
	},

	_get: function (x, y) {
		x = parseInt(x);
		y = parseInt(y);

		let index = y * this.width + x,
				content = [];

		if (x >= this.width || x < 0 || y >= this.height || y < 0)
			return [this.cellTypes['Empty']];

		if (!!this.map[index])
			content.push(this.cellTypes['Block']);

		for (var i in this.objectsOnMap) {
			if (this.objectsOnMap[i].getX() === x &&
					this.objectsOnMap[i].getY() === y)
				content.push(this.objectsOnMap[i]);
		}

		return content;
	},

	_deleteObject: function (id) {
		delete this.objectsOnMap[id];
	},

	activate: function (x, y, target) {
		let content = this._get(x, y);

		if (!content.length)
			return false;

		if (!!target) {
			for (i in content) {
				if (content[i].getType() === target) {
					content[i].activate();
					if (content[i].destroyOnActivate)
						this._deleteObject(content[i].getId());
				}
			}
		}

		else {
			for (var i in content) {
				content[i].activate();

				if (content[i].destroyOnActivate)
						this._deleteObject(content[i].getId());
			}
		}
	},

	react: function (x, y) {
		var content = this._get(x, y);

		if (!content.length)
			return false;

		for (var i in content) {
			content[i].react();

			if (content[i].destroyOnReact)
				this._deleteObject(content[i].getId());
		}
	},

	isTarget: function (x, y) {
		var content = this._get(x, y),
				result = false;

		if (!content.length)
			return false;

		for (var i in content) {
			result += content[i].isTarget();
		}

		return result;
	},

	checkCellType: function (x, y, content) {
		let fullContent = this._get(x, y);

		if (!fullContent.length)
			return content === 'EMPTY';

		for (let i in fullContent) {
			if (fullContent[i].getType() === content)
				return true;
		}

		return false;
	},

	isColliding: function (x, y) {
		var content = this._get(x, y),
				result = false;

		if (!content.length)
			return false;

		for (var i in content) {
			result += content[i].isColliding();
		}

		return result;
	},

	update: function () {
		this.game.ctx.clearRect(0, 0, this.game.ctx.canvas.width, this.game.ctx.canvas.height);
		this._build();
	},

	restart: function () {
		this.game.ctx.clearRect(0, 0, this.game.ctx.canvas.width, this.game.ctx.canvas.height);
		this._initObjects();
		this._build();
	}
}

function Robot (data) {
	this.game = data.game;
	this.x = data.x;
	this.y = data.y;
	this.direction = (data.dir) ? data.dir : 1;
	this.energy = (data.energy) ? data.energy : 3;

	this._init();
}

Robot.prototype = {
	_init: function () {
		this.isAlive = true;
		this.isFlying = false;

		this.lastStepsX = [];
		this.lastStepsY = [];

		this.originX = this.x;
		this.originY = this.y;
		this.originEnergy = this.energy;

		this.img = Loader.getImage('robot');

		this.actions = [];
		this.actions['MOVE'] = this.actionMove.bind(this);
		this.actions['ACTIVATE'] = this.actionActivate.bind(this);
		this.actions['FLY'] = this.actionFly.bind(this);

		this._draw();
		this._updateInfo();
	},

	_draw: function () {
		var x = this.x * this.game.map.blockSize,
				y = this.y * this.game.map.blockSize;

		this.game.ctx.drawImage(this.img, x, y, this.game.map.blockSize, this.game.map.blockSize);
	},

	_updateInfo: function () {
		this.game.info.energy = this.energy;
	},

	checkDeath: function () {
		if (this.game.map.isColliding(this.x, this.y)) {
			this.destroy('Робот оказался внутри чего-то твёрдого!');
			return;
		}
		if (this._isOutOfMap()) {
			this.destroy('Робот вышел за границы карты!');
			return;
		}
		if (this._isStuck()) {
			this.destroy('Робот застрял!');
			return;
		}
	},

	_updateLastSteps: function () {
		if (this.lastStepsX.length < 3) {
			this.lastStepsX.push(this.x);
		}
		else {
			this.lastStepsX.splice(0, 1);
			this.lastStepsX.push(this.x);
		}

		if (this.lastStepsY.length < 3) {
			this.lastStepsY.push(this.y);
		}
		else {
			this.lastStepsY.splice(0, 1);
			this.lastStepsY.push(this.y);
		}
	},

	_isOutOfMap: function () {
		if (this.x < 0 ||
				this.x >= this.game.map.width ||
				this.y < 0 ||
				this.y >= this.game.map.height) {
			return true;
		}
		else {
			return false;
		}
	},

	_isStuck: function () {
		if (this.lastStepsX[0] === this.lastStepsX[1] &&
				this.lastStepsX[1] === this.lastStepsX[2] &&
				this.lastStepsY[0] === this.lastStepsY[1] &&
				this.lastStepsY[1] ===  this.lastStepsY[2] &&
				!!this.lastStepsX[2]) {
			return true;
		}
		else {
			return false;
		}
	},

	changeDirection: function (direction) {
		if (direction) {
			if (direction > 0) {
				this.direction = 1;
			}
			else {
				this.direction = -1;
			}
		}
		else {
			this.direction = this.direction * -1;
		}
	},

	destroy: function (_msg, hide) {
		this.isAlive = false;

		if (hide === true) {
			this.x = -1;
			this.y = -1;
		}

		let msg = (_msg) ? _msg : 'Робот уничтожен!';

		this.game.showMsg({
					text: msg,
					style: 'DANGER'
				});
		this.game.gameOver();
	},

	restart: function () {
		this.isAlive = true;
		this.x = this.originX;
		this.y = this.originY;
		this.energy = this.originEnergy;
		this._draw();
	},

	_getValue: function (v, index) {
		if (!v && v !== 0)
			return false;

		if (typeof(v) === 'string') {
			if (v[0] === '+') {
				return this[index] + parseInt(v.substring(1));
			}
			else if (v[0] === '-') {
				return this[index] - parseInt(v.substring(1));
			}
		}

		return parseInt(v);
	},

	move: function (_x, _y) {
		_x = this._getValue(_x, 'x');
		_y = this._getValue(_y, 'y');

		this.x = (_x || _x === 0) ? _x : (this.x + this.direction);
		this.y = (_y || _x === 0) ? _y : this.y;
	},

	fall: function () {
		if (!this.isFlying &&
				!this.game.map.isColliding(this.x, this.y + 1)) {
			this.move('+0', '+1');
			return true;
		}
		return false;
	},

	update: function () {
		if (this.isFlying)
			this.energy--;

		if (this.isFlying && this.energy < 1) {
			this.actionFly(false);
		}

		this._updateInfo();
		this._updateLastSteps();
		this._draw();
	},

	getX: function () {
		return parseInt(this.x);
	},

	getY: function () {
		return parseInt(this.y);
	},

	executeAction: function (action, target) {
		if (this.actions.hasOwnProperty(action))
			(target) ? this.actions[action](target)
							 : this.actions[action]();

		return true;
	},

	actionMove: function () {
		if (!this.game.map.isColliding(this.x + 1, this.y))
			this.move();
	},

	actionActivate: function (target) {
		(!!target) ? this.game.map.activate(this.x, this.y, target)
							 : this.game.map.activate(this.x, this.y);
	},

	actionFly: function (v) {
		if (v === false) {
			this.isFlying = false;
			return true;
		}

		if (v === true || !this.isFlying) {
			if (this.game.map.isColliding(this.x, this.y - 1)) {
				this.game.showMsg({
					text: 'Не хватает пространства для полёта!',
					style: 'INFO'
				});
				return false;
			}
			else if (this.energy < 1) {
				this.game.showMsg({
					text: 'Не хватает энергии для полёта!',
					style: 'INFO'
				});
				return false;
			}
			else {
				this.isFlying = true;
				this.y--;
				return true;
			}
		}
		else {
			this.isFlying = false;
			return true;
		}
	}
}

function StackMachine (map, robot) {
	this.bytecode = false;
	this.map = map;
	this.robot = robot;
	this.MAX_LENGTH = 128;
}

StackMachine.prototype = {
	run: function () {
		if (!this.bytecode.length)
			return;

		let curr = 0,
				action_done = false,
				stack = [],
				a = b = false;

		while (curr < this.bytecode.length && !action_done) {

			// Пока стоит невыполнение условия, пропускаем все инструкции
			// до первого IF_STOP, который снимает заглушку
			// TODO: Это явно можно сделать лучше, не вынося за switch
			if (stack[stack.length - 1] === 'IF_STOP') {
				if (this.bytecode[curr] === 'END_IF_STATEMENT')
					stack.pop();
			}

			else {
				switch(this.bytecode[curr]) {
					case 'LITERAL':
						// Добавить обработку ошибок
						if (stack.length < this.MAX_LENGTH)
							stack.push(this.bytecode[++curr]);
						break;

					case 'IF_STATEMENT':
						b = stack.pop();
						a = stack.pop();

						(this._checkIF(a, b)) ? stack.push('IF_GO') : stack.push('IF_STOP');

						a = b = false;
						break;

					case 'END_IF_STATEMENT':
						a = stack.pop();

						// TODO: Добавить обработку этой ошибки
						if (a !== 'IF_GO' && a !== 'IF_STOP')
							stack.push(a);

						a = false;
						break;

					case 'EXECUTE_ACTION':
						a = stack.pop();
						if (a === 'ACTIVATE')
							b = stack.pop();

						this._activateRobot(a, b);
						action_done = true;

						a = b = false;
						break;
				}
			}

			curr++;
		}
	},

	update: function (bytecode) {
		this.bytecode = bytecode;
	},

	_checkIF: function (place, content) {
		let x = this.robot.getX(),
				y = this.robot.getY();

		switch(place) {
			case 'FORWARD':
				x++;
				(content === 'GROUND' || content === 'EMPTY') ? y++ : false;
				break;

			case 'BACKWARD':
				x--;
				(content === 'GROUND' || content === 'EMPTY') ? y++ : false;
				break;

			case 'TOP':
				y--;
				break;

			case 'BOTTOM':
				y++;
				break;

			case 'HERE':
				break;
		}

		// Пока что препятствием считается только земля
		// TODO: обдумать твёрдые объекты
		(content === 'OBSTACLE') ? content = 'GROUND' : false;

		return this.map.checkCellType(x, y, content);
	},

	_activateRobot: function (action, target) {
		(target) ? this.robot.executeAction(action, target)
						 : this.robot.executeAction(action);

		return true;
	}
}

let Compiler = (function () {

	const
				CONSTRUCTOR_SELECTOR = '.constructor',
				CONSTRUCTOR = document.querySelector(CONSTRUCTOR_SELECTOR),
				C_BLOCK_SELECTOR = '.constructor-item__block',
				C_INPUT_SELECTOR = '.constructor-item__input',

				RUN_BTN_SELECTOR = '.js--run-btn';


	let init = (game) => {
		_addListeners(game);
	};


	let _addListeners = (game) => {
		_bindRunBtn(game);
	};


	let _bindRunBtn = (game) => {
		let runBtns  = document.querySelectorAll(RUN_BTN_SELECTOR);

		for (let i = 0; i < runBtns.length; i++) {
			runBtns[i].addEventListener('click', function(e) {
				e.preventDefault();
				let byteCode = _collectByteCode();
				game.run(byteCode);
			});
		}
	};


	let _collectByteCode = function () {
		let blocks = CONSTRUCTOR.querySelectorAll(C_BLOCK_SELECTOR),
				byteCode = [];

		for (let i = 0; i < blocks.length; i++) {
			let inputs = blocks[i].querySelectorAll(C_INPUT_SELECTOR);

			for (let j = 0; j < inputs.length; j++) {
				let value = inputs[j].value.split(' ');

				// В некоторых input могут быть значения типа ACTIVATE TARGET
				// Для правильной работы стека нужно заносить их в обратном порядке
				for (let k = value.length - 1; k >= 0; k--) {
					byteCode.push('LITERAL');
					byteCode.push(value[k]);
				}
			}

			byteCode.push(blocks[i].dataset.bytecode);
		}

		return byteCode;
	};


	return {
		init: init
	};

})();

let Constructor = (function () {

	const
				CONSTRUCTOR_SELECTOR = '.constructor',
				CONSTRUCTOR = document.querySelector(CONSTRUCTOR_SELECTOR),

				C_ITEM_SELECTOR = '.constructor-item',
				C_ROW_SELECTOR = '.constructor-item__row',
				DELETE_BTN_SELECTOR  = '.constructor-item__btn--delete',
				ADD_BTN_SELECTOR  = '.constructor-item__btn--add',
				CLEAR_BTN_SELECTOR = '.js--constructor-clear',

				POPUP_SELECTOR = '.popup',
				POPUP_ACTIVE_CLASS = 'popup--active',
				POPUP_BTNS_SELECTOR = '.popup__block-btn',
				OVERLAY_SELECTOR = '.overlay',
				OVERLAY_ACTIVE_CLASS = 'overlay--active';

	let addBtn = false,
			blockList = [];


	let init = () => {
		_runDefault();
		_addListeners();
	};

	let _runDefault = () => {
		blockList['ROBOT']  = _createRobotActionBlock();
		blockList['IF']  = _createIfBlock();
		blockList['ROW']  = _createItemRow();
	};


	let _addListeners = () => {
		_bindDeleteBtns(CONSTRUCTOR);
		_bindAddBtns(CONSTRUCTOR);
		_bindPopupBtns();
		_bindClearBtns();

		document.querySelector(OVERLAY_SELECTOR).addEventListener('click', function (e) {
			e.preventDefault();
			_hidePopup();
			Popup.close();
		});
	};


	let _bindDeleteBtns = (element) => {
		let deleteBtns  = element.querySelectorAll(DELETE_BTN_SELECTOR);

		for (let i = 0; i < deleteBtns.length; i++) {
			deleteBtns[i].addEventListener('click', function(e) {
				e.preventDefault();
				_deleteParentBlock(deleteBtns[i]);
			});
		}
	};


	let _bindClearBtns = () => {
		let clearBtns  = document.querySelectorAll(CLEAR_BTN_SELECTOR);

		for (let i = 0; i < clearBtns.length; i++) {
			clearBtns[i].addEventListener('click', function(e) {
				e.preventDefault();

				let data = {
					title: 'Подтвердите удаление алгоритма',
					btnText1: 'Подтверждаю',
					btnText2: 'Отмена',
					btnStyle1: 'DANGER',
					btnFunc1: _clearConstructor.bind(this)
				};

				Popup.ask(data);
			});
		}
	};


	let _clearConstructor = () => {
		let blockToDelete = CONSTRUCTOR.querySelector(C_ITEM_SELECTOR);

		while (blockToDelete) {
			blockToDelete.remove();
			blockToDelete = CONSTRUCTOR.querySelector(C_ITEM_SELECTOR);
		}
	};


	let _deleteParentBlock = (btn) => {
		let parent = _findParentByClass(btn, C_ITEM_SELECTOR.slice(1)),
				parentRow = _findParentByClass(parent, C_ROW_SELECTOR.slice(1)),
				rowParent = _findParentByClass(parentRow, C_ITEM_SELECTOR.slice(1));

		if (parent)
			parent.remove();

		if (parentRow && rowParent.children.length > 3)
			parentRow.remove();
	};


	let _bindAddBtns = (element) => {
		let addBtns  = element.querySelectorAll(ADD_BTN_SELECTOR);

		for (let i = 0; i < addBtns.length; i++) {
			addBtns[i].addEventListener('click', function(e) {
				e.preventDefault();

				// TODO оптимизировать
				addBtn = addBtns[i];
				_showPopup(addBtns[i]);
			});
		}
	};


	let _addNewBlock = function (btn, type) {

		if (!btn || !type || !blockList[type])
			return false;

		let newBlock = blockList[type].cloneNode(true),
				parent   = _findParentByClass(btn, C_ITEM_SELECTOR.slice(1));

		_bindDeleteBtns(newBlock);
		_bindAddBtns(newBlock);

		if (!parent)
			return CONSTRUCTOR.insertBefore(newBlock, CONSTRUCTOR.lastChild);

		let rows = parent.querySelectorAll(C_ROW_SELECTOR);

		if (rows[rows.length - 2].innerHTML == '') {
			rows[rows.length - 2].appendChild(newBlock);
		}
		else {
			let newRow = blockList['ROW'].cloneNode(true);

			newRow.appendChild(newBlock);
			parent.insertBefore(newRow, rows[rows.length - 1]);
		}
	};


	let _findParentByClass = function (item, className) {
		let parent = item.parentElement;

		if (!parent) {
			return false;
		}

		if (parent.classList.contains(className)) {
			return parent;
		}
		else {
			return _findParentByClass(parent, className);
		}
	};


	function _createRobotActionBlock () {
		let block = document.createElement('div');

		block.className = "constructor-item constructor-item--action";
		block.innerHTML =
								`<div class="constructor-item__row">
									<form class="constructor-item__block" data-bytecode="EXECUTE_ACTION">
										<span>РОБОТ</span>
										<select class="constructor-item__input">
											<option value="MOVE">двигается вперед</option>
											<option value="ACTIVATE TARGET">активирует цель</option>
											<option value="ACTIVATE OBJECT">активирует объект</option>
											<option value="FLY">взлетает</option>
										</select>
									</form>

									<a href="#" class="constructor-item__btn constructor-item__btn--delete"><span>–</span></a>
								</div>`;

		return block;
	};


	function _createIfBlock () {
		let block = document.createElement('div');

		block.className = "constructor-item constructor-item--condition";
		block.innerHTML =
								`<div class="constructor-item__row">
									<form class="constructor-item__block" data-bytecode="IF_STATEMENT">
										<span>ЕСЛИ</span>
										<select class="constructor-item__input">
											<option value="FORWARD">впереди</option>
											<option value="BACKWARD">позади</option>
											<option value="TOP">наверху</option>
											<option value="BOTTOM">внизу</option>
											<option value="HERE">здесь</option>
										</select>
										<select class="constructor-item__input">
											<option value="GROUND">земля</option>
											<option value="TARGET">цель</option>
											<option value="DANGER">опасность</option>
											<option value="OBSTACLE">препятствие</option>
											<option value="EMPTY">пустота</option>
										</select>
									</form>

									<a href="#" class="constructor-item__btn constructor-item__btn--delete"><span>–</span></a>
								</div>

								<div class="constructor-item__row"></div>

								<div class="constructor-item__row">
									<div class="constructor-item__block" data-bytecode="END_IF_STATEMENT"></div>

									<a href="#" class="constructor-item__btn constructor-item__btn--add">
										<span>+</span></a>
								</div>`;

		return block;
	};


	function _createItemRow () {
		let row = document.createElement('div');
		row.className = "constructor-item__row";

		return row;
	};


	function _showPopup () {
		let popup = document.querySelector(POPUP_SELECTOR),
				overlay = document.querySelector(OVERLAY_SELECTOR);

		popup.classList.add(POPUP_ACTIVE_CLASS);
		overlay.classList.add(OVERLAY_ACTIVE_CLASS);
	};


	function _hidePopup () {
		let popup = document.querySelector(POPUP_SELECTOR),
				overlay = document.querySelector(OVERLAY_SELECTOR);

		popup.classList.remove(POPUP_ACTIVE_CLASS);
		overlay.classList.remove(OVERLAY_ACTIVE_CLASS);
	};


	function _bindPopupBtns () {
		let popup = document.querySelector(POPUP_SELECTOR),
				btns = popup.querySelectorAll(POPUP_BTNS_SELECTOR);

		for (let i = 0; i < btns.length; i++) {
			btns[i].addEventListener('click', function (e) {
				e.preventDefault();

				if (!addBtn)
					return false;

				let blockType = btns[i].dataset.type;

				_addNewBlock(addBtn, blockType);
				_hidePopup();
			});
		}
	};


	return {
		init: init
	};

})();

Constructor.init();









const Popup = (function () {
	const
				POPUP_SELECTOR = '.info-popup',
				POPUP_ACTIVE_CLASS = 'info-popup--active',
				POPUP_TITLE_SELECTOR = '.info-popup__title',
				POPUP_TEXT_SELECTOR = '.info-popup__text',
				POPUP_BTNS_SELECTOR = '.info-popup__btns .btn',

				ASK_POPUP_SELECTOR = '.js--popup-ask',
				INFO_POPUP_SELECTOR = '.js--popup-info',

				OVERLAY_SELECTOR = '.overlay',
				OVERLAY_ACTIVE_CLASS = 'overlay--active',

				CLOSE_BTN_SELECTOR = '.js--popup-close';


	let	BTN_CLASSES = [];
	BTN_CLASSES['DANGER'] = 'btn--danger';
	BTN_CLASSES['AKCENT'] = 'btn--akcent';

	let	POPUP_CLASSES = [];
	POPUP_CLASSES['DANGER'] = 'info-popup--danger';
	POPUP_CLASSES['AKCENT'] = 'info-popup--akcent';
	POPUP_CLASSES['INFO'] = 'info-popup--info';


	const init = () => {
		let closeBtns = document.querySelectorAll(CLOSE_BTN_SELECTOR);

		for (let i = 0; i < closeBtns.length; i++) {
			closeBtns[i].addEventListener('click', function (e) {
				e.preventDefault();
				closePopups();
			});
		}
	};


	const ask = (info) => {
		let popup = document.querySelector(ASK_POPUP_SELECTOR),
				title = popup.querySelector(POPUP_TITLE_SELECTOR),
				text = popup.querySelector(POPUP_TEXT_SELECTOR),
				btns = popup.querySelectorAll(POPUP_BTNS_SELECTOR),
				new_btn,
				overlay = document.querySelector(OVERLAY_SELECTOR);

		if (info.hasOwnProperty('title')) {
			title.style.display = ''; // устанавливает дефолтное значение
			title.textContent = info.title;
		}
		else {
			title.style.display = 'none';
		}

		if (info.hasOwnProperty('text')) {
			text.style.display = ''; // устанавливает дефолтное значение
			text.textContent = info.text;
		}
		else {
			text.style.display = 'none';
		}

		if (info.hasOwnProperty('btnText1')) {
			btns[0].textContent = info.btnText1;
		}
		else {
			btns[0].textContent = 'Подтверждаю';
		}

		if (info.hasOwnProperty('btnText2')) {
			btns[1].textContent = info.btnText2;
		}
		else {
			btns[1].textContent = 'Отмена';
		}

		for (className in BTN_CLASSES) {
			btns[0].classList.remove(BTN_CLASSES[className]);
		}
		if (info.hasOwnProperty('btnStyle1'))
			btns[0].classList.add(BTN_CLASSES[info.btnStyle1]);

		if (info.hasOwnProperty('btnFunc1')) {
			new_btn = btns[0].cloneNode(true);

			new_btn.addEventListener('click', function (e) {
				e.preventDefault();
				info.btnFunc1();
				closePopups();
			});

			// Заменяем, чтобы убрать все предыдущие события
			btns[0].parentNode.replaceChild(new_btn, btns[0]);
		}
		else if (info.hasOwnProperty('btnHref1')) {
			btns[0].href = info.btnHref1;
		}


		popup.classList.add(POPUP_ACTIVE_CLASS);
		overlay.classList.add(OVERLAY_ACTIVE_CLASS);
	};


	const info = (info) => {
		let popup = document.querySelector(INFO_POPUP_SELECTOR);

		if (!popup || !info.hasOwnProperty('text'))
			return false;

		popup.querySelector(POPUP_TEXT_SELECTOR).textContent = info.text;

		for (className in POPUP_CLASSES) {
			popup.classList.remove(POPUP_CLASSES[className]);
		}
		if (info.hasOwnProperty('style'))
			popup.classList.add(POPUP_CLASSES[info.style]);

		popup.classList.add(POPUP_ACTIVE_CLASS);

		setTimeout(function () {
			Popup.close(popup);
		}, 4000);
	};


	const closePopups = (popup) => {
		if (popup) {
			popup.classList.remove(POPUP_ACTIVE_CLASS);
		}
		else {
			let popups = document.querySelectorAll(POPUP_SELECTOR);

			for (let i = 0; i < popups.length; i++) {
				popups[i].classList.remove(POPUP_ACTIVE_CLASS);
			}
		}

		let overlay = document.querySelector(OVERLAY_SELECTOR);

		if (overlay)
			overlay.classList.remove(OVERLAY_ACTIVE_CLASS);
	};

	return {
		init : init,
		ask : ask,
		close : closePopups,
		info : info
	};
})();

Popup.init();
