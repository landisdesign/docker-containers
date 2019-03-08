const DatabaseFunctions = require("../modules/DatabaseFunctions");
const HelperFunctions = require("../modules/HelperFunctions");
const Mongo = require("../modules/__mocks__/Mongo");
const MockDB = require("../../../__jest-helpers__/MockDB")(HelperFunctions);

describe("getDB", () => {
	test("Default DB", () => {
		const testDB = {};
		Mongo.setDB(testDB);

		const outDb = DatabaseFunctions.getDB();

		expect(outDb).toBe(testDB);
		expect(outDb.name).toMatch("admin");
	});

	test("Another DB", () => {
		const testDB = {};
		Mongo.setDB(testDB);

		const dbName = "test";
		const outDb = DatabaseFunctions.getDB(dbName);

		expect(outDb).toBe(testDB);
		expect(outDb.name).toMatch(dbName);
	});
});

test("Authentication properly attempted", () => {
	const testDB = MockDB.mockAuthDB(true)();
	const testUser = {
		user: "a",
		pwd: "b",
		roles: []
	};
	const outArgs = [
		testUser.user,
		testUser.pwd
	];

	const result = DatabaseFunctions.authenticate(testDB, testUser);
	const args = testDB.auth.mock.calls[0];

	expect(result).toEqual(1);
	expect(args).toEqual(outArgs);
});

describe("Change password", () => {

	const error = new Error("Password change failed");
	error.code = 12345;
	const errorResults = HelperFunctions.errorMessage(error);

	const mockDB = (changed, authenticated = true) => MockDB.mockDBGenerator({
		changeUserPassword: () => {
			if (!changed) {
				throw error;
			} 
		},
		auth: () => authenticated ? 1 : 0
	})();

	const testUser = {
		user: "self",
		pwd: "newPwd",
		roles: []
	};
	const authUser = Object.assign({auth: true}, testUser);
	const testUserArgs = [testUser.user, testUser.pwd];

	test("Successful changed password without authentication", () => {
		const db = mockDB(true);
		const result = DatabaseFunctions.changePassword(db, testUser);

		expect(result).toBeUndefined();
		expect(db.changeUserPassword.mock.calls[0]).toEqual(testUserArgs);
		expect(db.auth.mock.calls).toHaveLength(0);
	});

	test("Unsuccessfully changed password", () => {
		const db = mockDB(false);

		const result = DatabaseFunctions.changePassword(db, testUser);

		expect(result).toEqual(errorResults);
		expect(db.changeUserPassword.mock.calls[0]).toEqual(testUserArgs);
		expect(db.auth.mock.calls).toHaveLength(0);
	});

	test("Successfully changed and authenticated", () => {
		const db = mockDB(true, true);

		const result = DatabaseFunctions.changePassword(db, authUser);

		expect(result).toBeUndefined();
		expect(db.changeUserPassword.mock.calls[0]).toEqual(testUserArgs);
		expect(db.auth.mock.calls[0]).toEqual(testUserArgs);
	});

	test("Successfully changed and did not authenticated", () => {
		const db = mockDB(true, false);

		const result = DatabaseFunctions.changePassword(db, authUser);

		expect(result).not.toEqual(errorResults); // not a change issue, should not return change error
		expect(result).toEqual( expect.stringMatching(/\w/) ); // content isn't relevant; string presence is
		expect(db.changeUserPassword.mock.calls[0]).toEqual(testUserArgs);
		expect(db.auth.mock.calls[0]).toEqual(testUserArgs);
	});
});

describe("Change multiple passwords simultaneously", () => {

	const mockDB = MockDB.mockDBForSimpleData(
		MockDB.mockDBGenerator({
			changeUserPassword: true
		})(),
		"changeUserPassword"
	);

	const testUsers = [
		["user1", "pwd1"],
		["user2", "pwd2"],
		["user3", "pwd3"],
		["user4", "pwd4"],
		["user5", "pwd5"]
	].map(arr => ({
		user: arr[0],
		pwd: arr[1],
		roles: []
	}));
	const testUsersArgs = testUsers.map(item => [item.user, item.pwd]);

	test("Properly reports clean updates", () => {
		const implData = MockDB.buildSimpleImplData([
			false, false, false, false, false
		]);
		const testDB = mockDB(implData.data);

		const results = DatabaseFunctions.changePasswords(testDB, testUsers);
		expect(results).toHaveLength(0);
		expect(testDB.changeUserPassword.mock.calls).toEqual(testUsersArgs);
	});

	// Reason for errors would likely be due to authentication issues, but that
	// isn't germane to the test.
	test("Properly reports incomplete updates", () => {
		const implData = MockDB.buildSimpleImplData([
			false, true, false, false, true
		]);
		const testDB = mockDB(implData.data);

		const results = DatabaseFunctions.changePasswords(testDB, testUsers);
		expect(results).toEqual(implData.messages);
		expect(testDB.changeUserPassword.mock.calls).toEqual(testUsersArgs);
	});
});

describe("Drop user", () => {

	const error = new Error("Could not drop user");
	error.code = 12345;
	const errorMessage = HelperFunctions.errorMessage(error);

	const mockDB = successful => MockDB.mockDBGenerator({
		dropUser: () => {
			if ( !successful ) {
				throw error;
			}
		}
	})();

	const testUser = {
		user: "doomedUser",
		pwd: "12345",
		roles: []
	};

	test("Dropped existing user", () => {
		const testDB = mockDB(true);

		const results = DatabaseFunctions.dropUser(testDB, testUser);

		expect(results).toBeUndefined();
		expect(testDB.dropUser.mock.calls[0]).toEqual([testUser.user]);
	});

	test("Failed to drop user", () => {
		const testDB = mockDB(false);

		const results = DatabaseFunctions.dropUser(testDB, testUser);

		expect(results).toEqual(errorMessage);
		expect(testDB.dropUser.mock.calls[0]).toEqual([testUser.user]);
	});
});

const mockRoleDB = MockDB.mockDBGenerator({
	createRole: true,
	grantPrivilegesToRole: true,
	grantRolesToRole: true
});

const mockDuplicateRoleDB = MockDB.mockDBGenerator({
	createRole: MockDB.throwDuplicateImplementation.fn,
	grantPrivilegesToRole: true,
	grantRolesToRole: true
});

const testRoleData = (testRole = {}) => {
	testRole = Object.assign({
		role: "a",
		privileges: [
			{
				resource: {cluster: true},
				actions: ["x", "y"]
			}
		],
		roles: ["f", "g"]
	}, testRole);
	const {role, privileges, roles} = testRole;
	const testPrivilegeArgs = [
		role,
		privileges
	];
	const testRoleArgs = [
		role,
		roles
	];

	return {
		testRole,
		testPrivilegeArgs,
		testRoleArgs
	};
};

describe("loadRole", () => {
	test("new role", () => {
		const testDB = mockRoleDB();
		const testRole = testRoleData().testRole;

		const result = DatabaseFunctions.loadRole(testDB, testRole);

		expect(result).toBeUndefined();
		expect(testDB.createRole.mock.calls[0]).toEqual( [testRole] );
		expect(testDB.grantRolesToRole.mock.calls).toHaveLength(0);
		expect(testDB.grantPrivilegesToRole.mock.calls).toHaveLength(0);
	});

	describe("existing role", () => {

		const {testRole, testPrivilegeArgs, testRoleArgs} = testRoleData();
		const {role, privileges, roles} = testRole;

		test("Adding roles and privileges", () => {
			const testDB = mockDuplicateRoleDB();

			const result = DatabaseFunctions.loadRole(testDB, testRole);

			expect(result).toBeUndefined();
			expect(testDB.createRole.mock.calls[0]).toEqual( [testRole] );
			expect(testDB.grantRolesToRole.mock.calls[0]).toEqual(testRoleArgs);
			expect(testDB.grantPrivilegesToRole.mock.calls[0]).toEqual(testPrivilegeArgs);
		});

		test("Adding only roles", () => {
			const testDB = mockDuplicateRoleDB();
			testRole.privileges = [];

			const result = DatabaseFunctions.loadRole(testDB, testRole);

			expect(result).toBeUndefined();
			expect(testDB.createRole.mock.calls[0]).toEqual( [testRole] );
			expect(testDB.grantRolesToRole.mock.calls[0]).toEqual(testRoleArgs);
			expect(testDB.grantPrivilegesToRole.mock.calls).toHaveLength(0);
		});

		test("Adding only privileges", () => {
			const testDB = mockDuplicateRoleDB();
			testRole.privileges = privileges;
			testRole.roles = [];

			const result = DatabaseFunctions.loadRole(testDB, testRole);

			expect(result).toBeUndefined();
			expect(testDB.createRole.mock.calls[0]).toEqual( [testRole] );
			expect(testDB.grantRolesToRole.mock.calls).toHaveLength(0);
			expect(testDB.grantPrivilegesToRole.mock.calls[0]).toEqual(testPrivilegeArgs);
		});

		test("Adding nothing", () => {
			const testDB = mockDuplicateRoleDB();
			testRole.privileges = [];
			testRole.roles = [];

			const result = DatabaseFunctions.loadRole(testDB, testRole);

			expect(result).toBeUndefined();
			expect(testDB.createRole.mock.calls[0]).toEqual( [testRole] );
			expect(testDB.grantRolesToRole.mock.calls).toHaveLength(0);
			expect(testDB.grantPrivilegesToRole.mock.calls).toHaveLength(0);
		});

	});

	describe("returns error", () => {
		const {testRole, testPrivilegeArgs, testRoleArgs} = testRoleData();
		const {role, privileges, roles} = testRole;

		test("when creating new role", () => {
			const errorData = MockDB.throwErrorImplementation("Throws creating new", 1);
			const testDB = mockRoleDB();
			testDB.createRole.mockImplementation( errorData.fn );

			const result = DatabaseFunctions.loadRole(testDB, testRole);

			expect(result).toEqual(errorData.message);
		});

		test("when adding privileges", () => {
			const errorData = MockDB.throwErrorImplementation("Throws adding privileges", 2);
			const testDB = mockDuplicateRoleDB();
			testDB.grantPrivilegesToRole.mockImplementation( errorData.fn );

			const result = DatabaseFunctions.loadRole(testDB, testRole);

			expect(result).toEqual(errorData.message);
		});

		test("when adding roles", () => {
			const errorData = MockDB.throwErrorImplementation("Throws adding roles", 3);
			const testDB = mockDuplicateRoleDB();
			testDB.grantRolesToRole.mockImplementation( errorData.fn );

			const result = DatabaseFunctions.loadRole(testDB, testRole);

			expect(result).toEqual(errorData.message);
		});
	});
});

describe("loadRoles", () => {
	const mockRoleDBForData = MockDB.mockDBForData(mockRoleDB(), "createRole", "grantPrivilegesToRole");

	test("clean roles throw no errors", () => {
		const mockData = [
			testRoleData({role:"x"}),
			testRoleData({role:"y"}),
		].map(roleData => roleData.testRole);

		const implData = MockDB.buildImplData([
			{isNew: false, throwsError: false},
			{isNew: true, throwsError: false}
		]);

		const testDB = mockRoleDBForData(implData.data);

		const results = DatabaseFunctions.loadRoles(testDB, mockData);

		expect(results).toHaveLength(0);
	});

	test("thrown errors return error messages", () => {
		const mockData = [
			testRoleData({role:"a"}),
			testRoleData({role:"b"}),
			testRoleData({role:"c"}),
			testRoleData({role:"d"})
		].map(roleData => roleData.testRole);

		const implData = MockDB.buildImplData([
			{isNew: false, throwsError: true},
			{isNew: false, throwsError: false},
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: true}
		]);

		const errors = implData.messages;

		const testDB = mockRoleDBForData(implData.data);

		const results = DatabaseFunctions.loadRoles(testDB, mockData);

		expect(results).toEqual(errors);
	});
});

const mockUserDB = MockDB.mockDBGenerator({
	createUser: true,
	updateUser: true,
	grantRolesToUser: true
});

const mockDuplicateUserDB = MockDB.mockDBGenerator({
	createUser: MockDB.throwDuplicateImplementation.fn,
	updateUser: true,
	grantRolesToUser: true
});

describe("loadUser", () => {
	const testUser = {
		user: "a",
		pwd: "b",
		roles: ["c", "d"]
	};

	const expectedUpdateUserResults = [
		testUser.user,
		{ pwd: testUser.pwd }
	];

	const expectedGrantRolesToUserResults = [
		testUser.user,
		testUser.roles
	];

	test("creates new user", () => {
		const db = mockUserDB();

		const result = DatabaseFunctions.loadUser(db, testUser);

		expect(result).toBeUndefined();
		expect(db.createUser.mock.calls[0]).toEqual([testUser]);
		expect(db.updateUser.mock.calls).toHaveLength(0);
		expect(db.grantRolesToUser.mock.calls).toHaveLength(0);
	});

	test("updates existing user", () => {
		const db = mockDuplicateUserDB();

		const result = DatabaseFunctions.loadUser(db, testUser);

		expect(result).toBeUndefined();
		expect(db.createUser.mock.calls[0]).toEqual([testUser]);
		expect(db.updateUser.mock.calls[0]).toEqual(expectedUpdateUserResults);
		expect(db.grantRolesToUser.mock.calls[0]).toEqual(expectedGrantRolesToUserResults);
	});

	describe("reports errors", () => {
		const errorData = MockDB.throwErrorImplementation();

		test("on creation", () => {
			const db = mockUserDB();
			db.createUser.mockImplementation(errorData.fn);

			const result = DatabaseFunctions.loadUser(db, testUser);

			expect(result).toEqual(errorData.message);
		});

		test("on update password", () => {
			const db = mockDuplicateUserDB();
			db.updateUser.mockImplementation(errorData.fn);

			const result = DatabaseFunctions.loadUser(db, testUser);

			expect(result).toEqual(errorData.message);
		});

		test("on update roles", () => {
			const db = mockDuplicateUserDB();
			db.grantRolesToUser.mockImplementation(errorData.fn);

			const result = DatabaseFunctions.loadUser(db, testUser);

			expect(result).toEqual(errorData.message);
		});
	});
});

describe("loadUsers", () => {
	const mockUserDBForData = MockDB.mockDBForData(mockUserDB(), "createUser", "updateUser");

	test("clean users throw no errors", () => {
		const mockData = [
			{user: "a", pwd: "a", roles: ["w", "x"]},
			{user: "b", pwd: "b", roles: ["y", "z"]}
		];

		const implData = MockDB.buildImplData([
			{isNew: false, throwsError: false},
			{isNew: true, throwsError: false}
		]);

		const testDB = mockUserDBForData(implData.data);

		const results = DatabaseFunctions.loadUsers(testDB, mockData);

		expect(results).toHaveLength(0);
	});

	test("thrown errors return error messages", () => {
		const mockData = [
			{user: "a", pwd: "a", roles: ["s", "t"]},
			{user: "b", pwd: "b", roles: ["u", "v"]},
			{user: "c", pwd: "c", roles: ["w", "x"]},
			{user: "d", pwd: "d", roles: ["y", "z"]}
		];

		const implData = MockDB.buildImplData([
			{isNew: false, throwsError: true},
			{isNew: false, throwsError: false},
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: true}
		]);

		const errors = implData.messages;

		const testDB = mockUserDBForData(implData.data);

		const results = DatabaseFunctions.loadUsers(testDB, mockData);

		expect(results).toEqual(errors);
	});
});

describe("authenticateAndLoad", () => {

	const mockFullDBForData = (authenticate, roleImpl, userImpl) => {
		const baseDB = mockRoleDB(mockUserDB(MockDB.mockAuthDB(authenticate)()));
		const mockedDB = MockDB.mockDBForData(baseDB, "createRole", "grantPrivilegesToRole")(roleImpl);
		return MockDB.mockDBForData(mockedDB, "createUser", "updateUser")(userImpl);
	};

	// Note that userImpl needs to match the order of the expected outcome of normalizeUsers,
	// which means changing the length and order based on how the admin role gets split
	const execute = ({roleData, roleImpl, userData, userImpl, authenticates, results}) => {
		const testDB = mockFullDBForData(authenticates, roleImpl, userImpl);
		const testResults = DatabaseFunctions.authenticateAndLoad(testDB, userData, roleData);
		const expectMap = {
			number: (testResults, results) => expect(testResults).toHaveLength(results),
			string: (testResults, results) => expect(testResults[0]).toMatch(new RegExp(results)),
			object: (testResults, results) => expect(testResults).toEqual(results)
		};

		expectMap[typeof results](testResults, results);
	};

	const testRoles = [
		testRoleData({role:"x"}),
		testRoleData({role:"y"})
	].map(role => role.testRole);

	const testBaseUsers = [
		{user: "a", pwd: "a", roles: ["a", "b"]},
		{user: "b", pwd: "b", roles: ["c", "d"]},
		{user: "c", pwd: "c", roles: ["w", "x"]},
		{user: "a", pwd: "x", roles: ["y", "z"]}
	];

	const adminRoles = ["userAdmin", "userAdminAnyDatabase", "hostManager"];

	const testAdmin = {
		user: "admin",
		pwd: "a",
		roles: adminRoles.concat("x", "y")
	}

	test("all new users and no user-defined roles", () => {
		const roleData = [];

		const roleImpl = [];

		const userData = testBaseUsers.concat(); 
		userData.splice(2, 0, testAdmin);

		const userImpl = MockDB.buildImplData([
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false}
		]).data;

		const authenticates = true;

		const results = [];

		const data = {roleData, roleImpl, userData, userImpl, authenticates, results};

		execute(data);
	});

	test("authentication fails", () => {
		const roleData = [];

		const roleImpl = [];

		const userData = testBaseUsers.slice(0,1); 
		userData.splice(2, 0, testAdmin);

		const userImpl = MockDB.buildImplData([
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false}
		]).data;

		const authenticates = false;

		const results = "authenticate";

		const data = {roleData, roleImpl, userData, userImpl, authenticates, results};

		execute(data);
	});

	test("no user admin available", () => {
		const roleData = [];

		const roleImpl = [];

		const userData = testBaseUsers.slice(0,2); 

		const userImpl = MockDB.buildImplData([
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false}
		]).data;

		const authenticates = false;

		const results = "admin";

		const data = {roleData, roleImpl, userData, userImpl, authenticates, results};

		execute(data);
	});

	test("user-defined roles included without users applying them", () => {
		const roleData = [
			testRoleData({role:"aa"}),
			testRoleData({role:"bb"})
		];

		const roleImpl =  MockDB.buildImplData([
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false}
		]).data;

		const userData = testBaseUsers.concat(testAdmin);

		const userImpl = MockDB.buildImplData([
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false}
		]).data;

		const authenticates = true;

		const results = [];

		const data = {roleData, roleImpl, userData, userImpl, authenticates, results};

		execute(data);
	});

	test("user-defined roles impacting the admin", () => {
		const roleData = testRoles.concat();

		const roleImpl =  MockDB.buildImplData([
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false}
		]).data;

		const userData = testBaseUsers.concat(testAdmin);

		const userImpl = MockDB.buildImplData([
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false}
		]).data;

		const authenticates = true;

		const results = [];

		const data = {roleData, roleImpl, userData, userImpl, authenticates, results};

		execute(data);
	});

	test("updating roles and users", () => {
		const roleData = testRoles.concat();

		const roleImplData =  MockDB.buildImplData([
			{isNew: false, throwsError: false},
			{isNew: true, throwsError: false}
		]);
		const roleImpl = roleImplData.data;

		const userData = testBaseUsers.concat(testAdmin);

		const userImplData = MockDB.buildImplData([
			{isNew: false, throwsError: false},
			{isNew: false, throwsError: false},
			{isNew: true, throwsError: false},
			{isNew: false, throwsError: false},
			{isNew: true, throwsError: false},
			{isNew: false, throwsError: false}
		]);
		const userImpl = userImplData.data;

		const authenticates = true;

		const results = roleImplData.messages.concat(userImplData.messages);

		const data = {roleData, roleImpl, userData, userImpl, authenticates, results};

		execute(data);
	});

	test("errors creating and updating roles and users", () => {
		const roleData = testRoles.concat();

		const roleImplData =  MockDB.buildImplData([
			{isNew: false, throwsError: true},
			{isNew: true, throwsError: false}
		]);
		const roleImpl = roleImplData.data;

		const userData = testBaseUsers.concat(testAdmin);

		const userImplData = MockDB.buildImplData([
			{isNew: true, throwsError: true},
			{isNew: false, throwsError: true},
			{isNew: true, throwsError: false},
			{isNew: false, throwsError: false},
			{isNew: true, throwsError: true},
			{isNew: false, throwsError: false}
		]);
		const userImpl = userImplData.data;

		const authenticates = true;

		const results = roleImplData.messages.concat(userImplData.messages);

		const data = {roleData, roleImpl, userData, userImpl, authenticates, results};

		execute(data);
	});
});
