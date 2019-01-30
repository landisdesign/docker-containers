const UserDefinedRoleFunctions = require("../modules/UserDefinedRoleFunctions");

test("privilege makes new privilege data object", () => {
	const testObj = {
		resource: { db: "a", collection: "b" },
		actions: ["a", "b"]
	}

	const outObj = UserDefinedRoleFunctions.privilege(testObj.resource, testObj.actions);

	expect(outObj).toEqual(testObj);
	expect(outObj.resource).not.toBe(testObj.resource);
	expect(outObj.actions).not.toBe(testObj.resource);
});

test("role object created", () => {
	const testRole = {
		role: "a",
		privileges: [],
		roles: []
	};
	let {role, privileges, roles} = testRole;

	const execute = (out, test) => {
		expect(out).toEqual(test);
		expect(out).not.toBe(test);
		expect(out.privileges).not.toBe(test.privileges);
		expect(out.roles).not.toBe(test.roles);
	};

	let outRole = UserDefinedRoleFunctions.role(role, privileges, roles);
	execute(outRole, testRole);

	testRole.privileges = privileges = [
		UserDefinedRoleFunctions.privilege( {db: "a", collection: "a"}, ["a", "b"] ),
		UserDefinedRoleFunctions.privilege( {cluster: true}, ["c", "d"] )
	];

	outRole = UserDefinedRoleFunctions.role(role, privileges, roles);
	execute(outRole, testRole);

	testRole.roles = roles = ["a", "b", "c"];
	testRole.privileges = [];

	outRole = UserDefinedRoleFunctions.role(role, [], roles);
	execute(outRole, testRole);

	testRole.privileges = privileges;

	outRole = UserDefinedRoleFunctions.role(role, privileges, roles);
	execute(outRole, testRole);
});

test("role name map generated properly", () => {
	const testRoles = [
		{
			role: "a",
			privileges: [
				{resource: {cluster: true}, actions: ["a", "b"]}
			],
			roles: []
		},
		{
			role: "b",
			privileges: [
				{resource: {db: "a", collection: "" }, actions: ["c", "d"]}
			],
			roles: ["x", "y"]
		},
		{
			role: "c",
			privileges: [
				{resource: {db: "", collection: "" }, actions: ["e", "f"]}
			],
			roles: ["z", "w"]
		}
	]

	const testMap = {
		"a": testRoles[0],
		"b": testRoles[1],
		"c": testRoles[2]
	}

	const outMap = UserDefinedRoleFunctions.mapNames(testRoles);
	expect(outMap).toEqual(testMap);
});
