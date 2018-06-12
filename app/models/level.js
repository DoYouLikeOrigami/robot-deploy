module.exports = function(mongoose) {
	const Schema = mongoose.Schema;

	let objectSchema = new Schema({
		name: {
			type: String,
			required: true
		},
		x: {
			type: Number,
			required: true,
			min: 0
		},
		y: {
			type: Number,
			required: true,
			min: 0
		},
		to_x: {
			type: Number,
			min: 0
		},
		to_y: {
			type: Number,
			min: 0
		}
	});

	let levelScheme = new Schema({
		id: {
			type: Number,
			required: true,
			min: 1
		},
		MAP: {
			type: [Number],
			required: true
		},
		SETTINGS: {
			CANVAS_ID: String,
			BLOCK_SIZE: Number,
			ROBOT_X: {
				type: Number,
				required: true
			},
			ROBOT_Y: {
				type: Number,
				required: true
			},
			ROBOT_DIR: {
				type: Number,
				default: 1,
				min: -1,
				max: 1
			},
			ROBOT_ENERGY: {
				type: Number,
				default: 0,
				min: 0
			},
	    WIDTH: {
	    	type: Number,
	    	required: true
	    },
	    HEIGHT: {
	    	type: Number,
	    	required: true
	    },
	    TARGETS: {
	    	type: Number,
	    	default: 1,
				min: 1
	    }
		},
		Objects: [objectSchema]
	});

	return mongoose.model("Level", levelScheme);
};
