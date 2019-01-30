const RoleDescriptorFunctions = require("../modules/RoleDescriptorFunctions");

describe("clone", () => {
	test("clones {role,db} roles", () => {
		const role = {role: "x", db: "y"};

		const clone = RoleDescriptorFunctions.clone(role);

		expect(clone).toEqual(role);
		expect(clone).not.toBe(role);
	});

	test("clones text roles", () => {
		const role = "x";

		const clone = RoleDescriptorFunctions.clone(role);

		expect(clone).toMatch(role);
	});
});

describe("equals", () => {
	test("doesn't match null", () => {
		const roleObj = {role: "a", db: "b"};
		const roleStr = roleObj.role;

		const nullEquals = RoleDescriptorFunctions.equals(null);
		expect( nullEquals(roleStr) ).toBe(false);
		expect( nullEquals(roleObj) ).toBe(false);
		expect( nullEquals(null) ).toBe(false);

		const objEquals = RoleDescriptorFunctions.equals(roleObj);
		expect( objEquals(null) ).toBe(false);

		const strEquals = RoleDescriptorFunctions.equals(roleStr);
		expect( strEquals(null) ).toBe(false);
	});

	test("doesn't match between different types", () => {
		const roleObj = {role: "a", db: "b"};
		const roleStr = roleObj.role;

		const objEquals = RoleDescriptorFunctions.equals(roleObj);
		expect( objEquals(roleStr) ).toBe(false);

		const strEquals = RoleDescriptorFunctions.equals(roleStr);
		expect( strEquals(roleObj) ).toBe(false);
	});

	test("doesn't partially match objects", () => {
		const aa = {role: "a", db: "a"};
		const ab = {role: "a", db: "b"};
		const ba = {role: "b", db: "a"};
		const a_ = {role: "a"};
		const _a = {db: "a"};

		const testGroups = [
			[aa, ab],
			[ab, aa],
			[aa, a_],
			[a_, aa],
			[aa, ba],
			[ba, aa],
			[aa, _a],
			[_a, aa]
		];

		testGroups.forEach(group => {
			const equals = RoleDescriptorFunctions.equals(group[0]);
			expect( equals( group[1] ) ).toBe(false);
		})
	})

	test("matches strings transitively", () => {
		const a = "a", b = "a";

		const aEquals = RoleDescriptorFunctions.equals(a);
		expect( aEquals(b) ).toBe(true);

		const bEquals = RoleDescriptorFunctions.equals(b);
		expect( bEquals(a) ).toBe(true);
	});

	test("matches objects transitively", () => {
		const a = {role: "a", db: "a"}, b = Object.assign({}, a);

		const aEquals = RoleDescriptorFunctions.equals(a);
		expect( aEquals(b) ).toBe(true);

		const bEquals = RoleDescriptorFunctions.equals(b);
		expect( bEquals(a) ).toBe(true);
	});

	test("matches identity", () => {
		const str = "a", obj = {role: "a", db: "a"};

		const strEquals = RoleDescriptorFunctions.equals(str);
		expect( strEquals(str) ).toBe(true);

		const objEquals = RoleDescriptorFunctions.equals(obj);
		expect( objEquals(obj) ).toBe(true);
	});
});

describe("combiner", () => {
	test("returns unique roles in a duplicative list", () => {
		const inRoles = [
			"a",
			{role: "a", db: "a"},
			"b",
			"a",
			{role: "b", db: "b"},
			{role: "a", db: "a"},
			"c",
			{role: "c", db: "c"}
		];
		const outRoles = [
			"a",
			{role: "a", db: "a"},
			"b",
			{role: "b", db: "b"},
			"c",
			{role: "c", db: "c"}
		];

		const testRoles = inRoles.reduce(RoleDescriptorFunctions.combiner, []);
		expect(testRoles).toEqual(outRoles);
	});

	test("returns all roles in a unique list", () => {
		const roles = [
			"a",
			{role: "a", db: "a"},
			"b",
			{role: "b", db: "b"},
			"c",
			{role: "c", db: "c"}
		];

		const testRoles = roles.reduce(RoleDescriptorFunctions.combiner, []);
		expect(testRoles).toEqual(roles);
	});
});

describe("rolesInMap", () => {
	const inMap = {
		"a": true,
		"b": true,
		"c": true,
	};
	const inRoles = [
		"a",
		{role: "x", db: "x"},
		{role: "c", db: "c"},
		"y",
		"b",
		"z"
	];
	const outMap = {
		in: [
			"a",
			{role: "c", db: "c"},
			"b"
		],
		out: [
			{role: "x", db: "x"},
			"y",
			"z"
		]
	};

	test("splits in and out roles", () => {
		const testMap = RoleDescriptorFunctions.rolesInMap(inRoles, inMap);
		expect(testMap).toEqual(outMap);
	});

	test("returns in-only role list as map with empty out array", () => {
		testMap = RoleDescriptorFunctions.rolesInMap(outMap.in, inMap);
		expect(testMap).toEqual( {in: outMap.in, out: [] } );
	});

	test("returns out-only role list as map with empty in array", () => {
		testMap = RoleDescriptorFunctions.rolesInMap(outMap.out, inMap);
		expect(testMap).toEqual( {in: [], out: outMap.out } );
	});

	test("returns empty role list as map with empty in and out arrays", () => {
		testMap = RoleDescriptorFunctions.rolesInMap([], inMap);
		expect(testMap).toEqual( {in: [], out: [] } );
	});
});
