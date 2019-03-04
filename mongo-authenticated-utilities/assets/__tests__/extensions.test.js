const DatabaseFunctions = require("../../../mongo-authenticated/assets/modules/DatabaseFunctions");
const HelperFunctions = require("../../../mongo-authenticated/assets/modules/HelperFunctions");
const RoleDescriptorFunctions = require("../../../mongo-authenticated/assets/modules/RoleDescriptorFunctions");
const UserFunctions = require("../../../mongo-authenticated/assets/modules/UserFunctions");
const MockDB = require("../../../__jest-helpers__/MockDB")(HelperFunctions);

const extensions = require("../modules/extensions.js"); // extenstions.js extends preexisting singletons to include utilities.
extensions(DatabaseFunctions, HelperFunctions, RoleDescriptorFunctions, UserFunctions);

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

	const testUser = UserFunctions.create("self", "newPwd", []);
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
	].map(arr => UserFunctions.create(arr[0], arr[1], []));
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

describe("Replace old user", () => {

	const oldUser = UserFunctions.create("oldUser", "oldPwd", ["a", {role:"b", db:"c"}]);
	const newUser = UserFunctions.create("newUser", "newPwd", ["a", {role:"y", db:"z"}]);

	const wrongUserName = "wrongOldUserName";
	const badOldUserError = new Error("Could not access old user");
	badOldUserError.code = 12345;
	const badOldUserErrorMessage = HelperFunctions.errorMessage(badOldUserError);

	const missingOldUserError = new Error("Could not find old user");
	missingOldUserError.code = 8675309;
	const missingOldUserErrorMessage = HelperFunctions.errorMessage(missingOldUserError);

	const badNewUserError = new Error("Could not create new user");
	badNewUserError.code = 98765;
	const badNewUserErrorMessage = HelperFunctions.errorMessage(badNewUserError);

	const createdUser = UserFunctions.create(newUser.user, newUser.pwd, ["a", {role:"b", db:"c"}, {role:"y", db:"z"}]);
	const getUserArgs = [oldUser.user, {showPrivileges: true}];
	const getWrongUserArgs = [wrongUserName, {showPrivileges: true}];
	const createUserArgs = [createdUser];

	const mockDB = (goodOldUser, goodNewUser) => MockDB.mockDBGenerator({
		getUser: (name, {showPrivileges = false}) => {
			if (goodOldUser) {
				if (name == oldUser.user) {
					const data = {user: oldUser.user};
					if (showPrivileges) {
						data.roles = RoleDescriptorFunctions.clone(oldUser.roles);
					}
					return data;
				}
				else {
					throw missingOldUserError;
				}
			}
			else {
				throw badOldUserError;
			}
		},
		createUser: ({user, pwd, roles}) => {
			if (!goodNewUser) {
				throw badNewUserError;
			}
		}
	})();

	test("Successfully replaced", () => {
		const testDB = mockDB(true, true);

		const results = DatabaseFunctions.replaceUser(testDB, oldUser.user, newUser);

		expect(results).toBeUndefined();
		expect(testDB.getUser.mock.calls[0]).toEqual(getUserArgs);
		expect(testDB.createUser.mock.calls[0]).toEqual(createUserArgs);
	});

	test("Failed due to missing old user", () => {
		const testDB = mockDB(true, true);

		const results = DatabaseFunctions.replaceUser(testDB, wrongUserName, newUser);

		expect(results).toEqual(missingOldUserErrorMessage);
		expect(testDB.getUser.mock.calls[0]).toEqual(getWrongUserArgs);
		expect(testDB.createUser.mock.calls).toHaveLength(0);
	});

	test("Failed due to bad old user call", () => {
		const testDB = mockDB(false, true);

		const results = DatabaseFunctions.replaceUser(testDB, oldUser.user, newUser);

		expect(results).toEqual(badOldUserErrorMessage);
		expect(testDB.getUser.mock.calls[0]).toEqual(getUserArgs);
		expect(testDB.createUser.mock.calls).toHaveLength(0);
	});

	test("Failed due to bad new user", () => {
		const testDB = mockDB(true, false);

		const results = DatabaseFunctions.replaceUser(testDB, oldUser.user, newUser);

		expect(results).toEqual(badNewUserErrorMessage);
		expect(testDB.getUser.mock.calls[0]).toEqual(getUserArgs);
		expect(testDB.createUser.mock.calls[0]).toEqual(createUserArgs);
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

	test("Dropped existing user", () => {
		const testDB = mockDB(true);
		const testName = "doomedUser";

		const results = DatabaseFunctions.dropUser(testDB, testName);

		expect(results).toBeUndefined();
		expect(testDB.dropUser.mock.calls[0]).toEqual([testName]);
	});

	test("Failed to drop user", () => {
		const testDB = mockDB(false);
		const testName = "doomedUser";

		const results = DatabaseFunctions.dropUser(testDB, testName);

		expect(results).toEqual(errorMessage);
		expect(testDB.dropUser.mock.calls[0]).toEqual([testName]);
	});
});
