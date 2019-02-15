const UserFunctions = require("../modules/UserFunctions");

const adminRoles = ["userAdmin", "userAdminAnyDatabase", "hostManager"];

test("create builds User", () => {
	const testUser = {
		user: "a",
		pwd: "b",
		roles: [
			"c",
			"d",
			"e:"
		]
	};
	const {user, pwd, roles} = testUser;

	const outUser = UserFunctions.create(user, pwd, roles);

	expect(outUser).toEqual(testUser);
	expect(outUser.roles).not.toBe(roles);
});

describe("createUserOfType", () => {
	test("Creates a predefined user", () => {
		const expectedUser = {
			user: "user",
			pwd: "pwd",
			roles: adminRoles
		};
		const type = "userAdmin";

		const result = UserFunctions.createUserOfType(expectedUser.user, expectedUser.pwd, type);

		expect(result).toEqual(expectedUser);
	});

	test("Adds updateSelf to roles", () => {
		const expectedUser = {
			user: "user",
			pwd: "pwd",
			roles: adminRoles.concat("updateSelf")
		};
		const type = "userAdmin";

		const result = UserFunctions.createUserOfType(expectedUser.user, expectedUser.pwd, type, true);

		expect(result).toEqual(expectedUser);
	});

	test("Throws error when attempting to specify an unspecified type", () => {
		const useInvalidType = () => {
			UserFunctions.createUserOfType("a", "b", "not a viable type");
		};

		expect(useInvalidType).toThrow();
	});
});

test("getUserTypes returns array of types", () => {
	expect( UserFunctions.getUserTypes() ).toEqual( expect.arrayContaining(["userAdmin"]) );
})

describe("registerUserType", () => {

	/* Makes up for not being able to guarantee the order of elements returned
	   by for..in. We need to know that all of the same elements are present,
	   regardless of order. */
	expectArraysContainSameElements = (result, expected) => {
		expect(result).toEqual( expect.arrayContaining(expected) );
		expect(result).toHaveLength(expected.length);
	};

	test("Creating new type", () => {
		const typeName = "testType";
		const roles = ["a", {db:"b",role:"c"}];
		const expectedTypes = UserFunctions.getUserTypes().concat(typeName);

		UserFunctions.registerUserType(typeName, roles);

		const resultingTypes = UserFunctions.getUserTypes();
		expectArraysContainSameElements(resultingTypes, expectedTypes);

		const resultingUser = UserFunctions.createUserOfType("name", "pwd", typeName);

		expect(resultingUser.roles).toEqual(roles);
	});

	test("Adding to existing type", () => {
		const typeName = "testType";
		const rolesA = ["a", {db:"b",role:"c"}];
		const rolesB = ["d", {db:"b",role:"c"}, "e"];
		const expectedRoles = ["a", {db:"b",role:"c"}, "d", "e"];

		UserFunctions.registerUserType(typeName, rolesA);
		UserFunctions.registerUserType(typeName, rolesB);

		const resultingUser = UserFunctions.createUserOfType("name", "pwd", typeName);
		expectArraysContainSameElements(resultingUser.roles, expectedRoles);
	});
});

test("createAdmin creates User with admin roles", () => {
	const testUser = {
		user: "a",
		pwd: "b",
		roles: adminRoles
	};
	const {user, pwd, roles} = testUser;

	const outUser = UserFunctions.createAdmin(user, pwd);

	expect(outUser).toEqual(testUser);
	expect(outUser.roles).not.toBe(roles);
});

test("isUser passes possible users", () => {
	const testUser = {
		user: "a",
		pwd: "b",
		roles: []
	};

	expect(UserFunctions.isUser(testUser)).toBe(true);

	testUser.roles = ["a", "b"];

	expect(UserFunctions.isUser(testUser)).toBe(true);
});

test("isUser fails impossible users", () => {
	expect( UserFunctions.isUser(null) ).toBe(false);
	expect( UserFunctions.isUser(false) ).toBe(false);
	expect( UserFunctions.isUser("a") ).toBe(false);
	expect( UserFunctions.isUser(1) ).toBe(false);

	// empty
	const testUser = {};
	expect( UserFunctions.isUser(testUser) ).toBe(false);

	// missing pwd, roles
	testUser.user = "a";
	expect( UserFunctions.isUser(testUser) ).toBe(false);

	// missing roles
	testUser.pwd = "b";
	expect( UserFunctions.isUser(testUser) ).toBe(false);

	// invalid roles
	testUser.roles = "a";
	expect( UserFunctions.isUser(testUser) ).toBe(false);

	// valid with extra attribute
	testUser.roles = [];
	testUser.extra = {};
	expect( UserFunctions.isUser(testUser) ).toBe(false);

	// missing user
	delete testUser.extra;
	delete testUser.user;
	expect( UserFunctions.isUser(testUser) ).toBe(false);

	// missing pwd
	delete testUser.pwd;
	testUser.user = "a";
	expect( UserFunctions.isUser(testUser) ).toBe(false);

	// missing user, pwd
	delete testUser.user;
	expect( UserFunctions.isUser(testUser) ).toBe(false);
});

test("isAdmin correctly identifies admins", () => {
	const testUser = {
		user: "a",
		pwd: "b",
		roles: adminRoles.concat()
	};

	expect( UserFunctions.isAdmin(testUser) ).toBe(true);
	testUser.roles = adminRoles.concat("a");
	expect( UserFunctions.isAdmin(testUser) ).toBe(true);

	testUser.roles[0] = {role: testUser.roles[0], db: "a"};
	expect( UserFunctions.isAdmin(testUser) ).toBe(false);

	testUser.roles.splice(0, 1);
	expect( UserFunctions.isAdmin(testUser) ).toBe(false);
	expect( UserFunctions.isAdmin( {} ) ).toBe(false);
});

describe("normalizeUsers", () => {
	test("compacts duplicate users", () => {
		const testUsers = [
			{
				user: "a",
				pwd: "a",
				roles: ["a", "b", {role: "c", db: "d"} ]
			},
			{
				user: "b",
				pwd: "b",
				roles: ["x", "y"]
			},
			{
				user: "a",
				pwd: "c",
				roles: ["c", {role: "c", db: "d"}, {role: "e", db: "f"} ]
			},
			{
				user: "c",
				pwd: "d",
				roles: ["v", "w"]
			}
		];
		const outUsers = [
			{
				user: "a",
				pwd: "a",
				roles: ["a", "b", {role: "c", db: "d"}, "c", {role: "e", db: "f"} ]
			},
			{
				user: "b",
				pwd: "b",
				roles: ["x", "y"]
			},
			{
				user: "c",
				pwd: "d",
				roles: ["v", "w"]
			}
		];

		expect( UserFunctions.normalizeUsers(testUsers, []) ).toEqual(outUsers);
	});

	test("moves admin to the front", () => {
		const testUsers = [
			{
				user: "a",
				pwd: "a",
				roles: ["a", "b"]
			},
			{
				user: "b",
				pwd: "b",
				roles: adminRoles.concat()
			},
			{
				user: "c",
				pwd: "c",
				roles: ["c", "d"]
			}
		];
		const outUsers = [
			{
				user: "b",
				pwd: "b",
				roles: adminRoles.concat()
			},
			{
				user: "a",
				pwd: "a",
				roles: ["a", "b"]
			},
			{
				user: "c",
				pwd: "c",
				roles: ["c", "d"]
			}
		];

		expect( UserFunctions.normalizeUsers(testUsers, []) ).toEqual(outUsers);
	});

	test("splits admin based upon user-defined roles", () => {
		const testRoles = [
			{
				role: "userA",
				privileges: [],
				roles: []
			},
			{
				role: "userB",
				privileges: [],
				roles: []
			},
			{
				role: "userC",
				privileges: [],
				roles: []
			}
		];
		const testUsers = [
			{
				user: "a",
				pwd: "a",
				roles: ["a", "b"]
			},
			{
				user: "b",
				pwd: "b",
				roles: ["userA"].concat(adminRoles, "userB", "e")
			},
			{
				user: "c",
				pwd: "c",
				roles: ["c", "d"]
			}
		];
		const outUsers = [
			{
				user: "b",
				pwd: "b",
				roles: adminRoles.concat("e")
			},
			{
				user: "a",
				pwd: "a",
				roles: ["a", "b"]
			},
			{
				user: "b",
				pwd: "b",
				roles: ["userA", "userB"]
			},
			{
				user: "c",
				pwd: "c",
				roles: ["c", "d"]
			}
		];

		expect( UserFunctions.normalizeUsers(testUsers, testRoles) ).toEqual(outUsers);
	});
});
