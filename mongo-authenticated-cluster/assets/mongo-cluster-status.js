const states = {
	"undefined": {
		name: "undefined",
		up: false,
		hasData: false
	},
	0: {
		name: "STARTUP",
		up: false,
		hasData: false
	},
	1: {
		name: "PRIMARY",
		up: true,
		hasData: true
	},
	2: {
		name: "SECONDARY",
		up: true,
		hasData: true
	},
	3: {
		name: "RECOVERING",
		up: false,
		hasData: false
	},
	5: {
		name: "STARTUP2",
		up: false,
		hasData: false
	},
	6: {
		name: "UNKNOWN",
		up: false,
		hasData: false
	},
	7: {
		name: "ARBITER",
		up: true,
		hasData: false
	},
	8: {
		name: "DOWN",
		up: false,
		hasData: false
	},
	9: {
		name: "ROLLBACK",
		up: false,
		hasData: false
	},
	10: {
		name: "REMOVED",
		up: false,
		hasData: false
	}
};

const status = rs.status();
const memberStates = status.members.map(
	({name, state}) => Object.assign({host: name}, states[state] || states["undefined"])
);
const readyState = memberStates.reduce(
	({isUp, hasPrimary}, {up, name}) =>
		({
			isUp: isUp && up,
			hasPrimary: hasPrimary || name == "PRIMARY"
		})
	,
	{isUp: true, hasPrimary: false}
);

if (readyState.isUp && readyState.hasPrimary) { // making eplicit for readability
	print(1);
}
else {
	print(0);
}
quit();