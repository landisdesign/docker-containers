const Mongo = require("../modules/__mocks__/Mongo"); // Mongo is our mock object for retrieving our database mocks.
const DatabaseFunctions = require("../modules/DatabaseFunctions");
const HelperFunctions = require("../modules/HelperFunctions");

test("Database is retrieved", () => {
	let testDB = {};
	Mongo.setDB(testDB);

	let outDb = DatabaseFunctions.getDB();

	expect(outDb).toEqual(testDB);
	expect(outDb.name).toMatch("admin");

	testDB = {};
	Mongo.setDB(testDB);
	const dbName = "test";

	outDb = DatabaseFunctions.getDB(dbName);

	expect(outDb).toEqual(testDB);
	expect(outDb.name).toMatch(dbName);
});

const mockDBGenerator = methods => (db = {}) => Object.entries(methods).reduce((map, [key, value]) => {
	const fn = jest.fn();
	if (typeof value === "function") {
		fn.mockImplementation(value);
	}
	map[key] = fn;
	return map;
}, db);

const mockAuthDB = authenticates => mockDBGenerator({
	auth: () => authenticates ? 1 : 0
});

test("Authentication properly attempted", () => {
	const testDB = mockAuthDB(true)();
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

const throwErrorImplementation = (message = "Error message", code = 1) => {
	const fn = () => {
		const error = new Error(message);
		error.code = code;
		throw error;
	};
	const error = ( () => {
		try {
			fn();
		}
		catch(e) {
			return e;
		}
	} )();

	return {
		fn,
		error,
		message: HelperFunctions.errorMessage(error)
	};
};

const throwDuplicateImplementation = throwErrorImplementation("Duplicate exists", 11000);

const mockRoleDB = mockDBGenerator({
	createRole: true,
	grantPrivilegesToRole: true,
	grantRolesToRole: true
});

const mockDuplicateRoleDB = mockDBGenerator({
	createRole: throwDuplicateImplementation.fn,
	grantPrivilegesToRole: true,
	grantRolesToRole: true
});

// Placing the counter on implData lets us update it on each call of the create method.
// The closure fixes the object reference but not its members.
// We increment it on create because we can't guarantee the update method will be called.
const mockDBForData = (db, createMethodName, updateMethodName) => implData => {
	implData.index = -1;

	db[createMethodName].mockImplementation( () => {
		implData.index++;
		const datum = implData[implData.index];
		if (datum.isNew) {
			if (datum.throwsError) {
				throw datum.error;
			}
		}
		else {
			throwDuplicateImplementation.fn();
		}
	});

	db[updateMethodName].mockImplementation( () => {
		const datum = implData[implData.index];
		if (datum.throwsError) {
			throw datum.error;
		}
	});

	return db;
};

const buildImplData = implData => implData.reduce(
	(acc, datum) => {
		const mappedDatum = Object.assign({}, datum);
		if (mappedDatum.throwsError) {
			const errorData = throwErrorImplementation("Errored out", acc.data.length);
			delete errorData.fn;
			Object.assign(mappedDatum, errorData);
			acc.messages.push(mappedDatum.message);
		}
		acc.data.push(mappedDatum);
		return acc;
	},
	{data: [], messages: []}
);

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
			const errorData = throwErrorImplementation("Throws creating new", 1);
			const testDB = mockRoleDB();
			testDB.createRole.mockImplementation( errorData.fn );

			const result = DatabaseFunctions.loadRole(testDB, testRole);

			expect(result).toEqual(errorData.message);
		});

		test("when adding privileges", () => {
			const errorData = throwErrorImplementation("Throws adding privileges", 2);
			const testDB = mockDuplicateRoleDB();
			testDB.grantPrivilegesToRole.mockImplementation( errorData.fn );

			const result = DatabaseFunctions.loadRole(testDB, testRole);

			expect(result).toEqual(errorData.message);
		});

		test("when adding roles", () => {
			const errorData = throwErrorImplementation("Throws adding roles", 3);
			const testDB = mockDuplicateRoleDB();
			testDB.grantRolesToRole.mockImplementation( errorData.fn );

			const result = DatabaseFunctions.loadRole(testDB, testRole);

			expect(result).toEqual(errorData.message);
		});
	});
});

describe("loadRoles", () => {
	const mockRoleDBForData = mockDBForData(mockRoleDB(), "createRole", "grantPrivilegesToRole");

	test("clean roles throw no errors", () => {
		const mockData = [
			testRoleData({role:"x"}),
			testRoleData({role:"y"}),
		].map(roleData => roleData.testRole);

		const implData = buildImplData([
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

		const implData = buildImplData([
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

const mockUserDB = mockDBGenerator({
	createUser: true,
	updateUser: true
});

const mockDuplicateUserDB = mockDBGenerator({
	createUser: throwDuplicateImplementation.fn,
	updateUser: true
});

describe("loadUser", () => {
	const testUser = {
		user: "a",
		pwd: "b",
		roles: ["c", "d"]
	};

	const expectedUpdateUserResults = [
		testUser.user,
		{
			pwd: testUser.pwd,
			roles: testUser.roles
		}
	];

	test("creates new user", () => {
		const db = mockUserDB();

		const result = DatabaseFunctions.loadUser(db, testUser);

		expect(result).toBeUndefined();
		expect(db.createUser.mock.calls[0]).toEqual([testUser]);
		expect(db.updateUser.mock.calls).toHaveLength(0);
	});

	test("updates existing user", () => {
		const db = mockDuplicateUserDB();

		const result = DatabaseFunctions.loadUser(db, testUser);

		expect(result).toBeUndefined();
		expect(db.createUser.mock.calls[0]).toEqual([testUser]);
		expect(db.updateUser.mock.calls[0]).toEqual(expectedUpdateUserResults);
	});

	describe("reports errors", () => {
		const errorData = throwErrorImplementation();

		test("on creation", () => {
			const db = mockUserDB();
			db.createUser.mockImplementation(errorData.fn);

			const result = DatabaseFunctions.loadUser(db, testUser);

			expect(result).toEqual(errorData.message);
		});

		test("on update", () => {
			const db = mockDuplicateUserDB();
			db.updateUser.mockImplementation(errorData.fn);

			const result = DatabaseFunctions.loadUser(db, testUser);

			expect(result).toEqual(errorData.message);
		});
	});
});

describe("loadUsers", () => {
	const mockUserDBForData = mockDBForData(mockUserDB(), "createUser", "updateUser");

	test("clean users throw no errors", () => {
		const mockData = [
			{user: "a", pwd: "a", roles: ["w", "x"]},
			{user: "b", pwd: "b", roles: ["y", "z"]}
		];

		const implData = buildImplData([
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

		const implData = buildImplData([
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
		const baseDB = mockRoleDB(mockUserDB(mockAuthDB(authenticate)()));
		const mockedDB = mockDBForData(baseDB, "createRole", "grantPrivilegesToRole")(roleImpl);
		return mockDBForData(mockedDB, "createUser", "updateUser")(userImpl);
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

		const userImpl = buildImplData([
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

		const userImpl = buildImplData([
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

		const userImpl = buildImplData([
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

		const roleImpl =  buildImplData([
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false}
		]).data;

		const userData = testBaseUsers.concat(testAdmin);

		const userImpl = buildImplData([
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

		const roleImpl =  buildImplData([
			{isNew: true, throwsError: false},
			{isNew: true, throwsError: false}
		]).data;

		const userData = testBaseUsers.concat(testAdmin);

		const userImpl = buildImplData([
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

		const roleImplData =  buildImplData([
			{isNew: false, throwsError: false},
			{isNew: true, throwsError: false}
		]);
		const roleImpl = roleImplData.data;

		const userData = testBaseUsers.concat(testAdmin);

		const userImplData = buildImplData([
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

		const roleImplData =  buildImplData([
			{isNew: false, throwsError: true},
			{isNew: true, throwsError: false}
		]);
		const roleImpl = roleImplData.data;

		const userData = testBaseUsers.concat(testAdmin);

		const userImplData = buildImplData([
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
