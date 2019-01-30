const DatabaseFunctions = (function(Mongo, HelperFunctions, UserFunctions) {

	const errorCodes = {
		duplicateDocument: 11000
	};

	const getDB = (name = "admin") => ( new Mongo() ).getDB(name);

	const authenticate = (db, {user, pwd}) => db.auth(user, pwd);

	const duplicateErrorPredicate = e => e.code == errorCodes.duplicateDocument;

	const loadRole = (db, {role, privileges, roles} ) => HelperFunctions.fallbackAction(
		() => {
			db.createRole( {role, privileges, roles} )
		},
		() => {
			if (privileges.length) {
				db.grantPrivilegesToRole(role, privileges);
			}
			if (roles.length) {
				db.grantRolesToRole(role, roles);
			}
		},
		duplicateErrorPredicate
	);

	const loadRoles = (db, roles) => HelperFunctions.collectResults(HelperFunctions.embedDB(db, loadRole), roles);

	const loadUser = (db, {user, pwd, roles} ) => HelperFunctions.fallbackAction(
		() => {
			db.createUser( {user, pwd, roles} );
		},
		() => {
			db.updateUser(user, {pwd, roles} );
		},
		duplicateErrorPredicate
	);

	const loadUsers = (db, users) => HelperFunctions.collectResults(HelperFunctions.embedDB(db, loadUser), users);

	const authenticateAndLoad = (db, users, roles) => {
		const normalizedUsers = UserFunctions.normalizeUsers(users, roles);
		const admin = normalizedUsers.splice(0, 1)[0];
		if ( !UserFunctions.isAdmin(admin) ) {
			return [admin.user + " is not set to be a user admin"];
		}
		let errors = [].concat( loadUser(db, admin) || []); // take advantage of concat(undefined) not changing the array
		if ( authenticate(db, admin) ) {
			errors = errors.concat( loadRoles(db, roles) );
			errors = errors.concat( loadUsers(db, normalizedUsers) );
		}
		else {
			errors = errors.concat("Could not authenticate with user " + admin.user);
		}
		return errors;
	};

	return {
		getDB,
		authenticate,
		loadRole,
		loadRoles,
		loadUser,
		loadUsers,
		authenticateAndLoad
	};

})(
	/* This convolution is because MongoJS doesn't recognize NodeJS, but Jest requires it.
	 * When loaded in MongoJS, the JS files are loaded in dependency order, so the dependency is already defined.
	 * When using Jest, it isn't so we need to call require() on it.
	 *
	 * We do this so that we bake some sense of the dependencies into the code for MongoJS. It smells,
	 * but smells less than leaving the dependency deep in the code without explicitly calling it in. */

	 // Mongo is predefined in the Mongo shell. Jest requires a mock instead.
	 // Because it's predefined, we don't have a definition to mock from, so we've got one constructed here.
	(typeof Mongo === "undefined") ? require("./__mocks__/Mongo") : Mongo,
	(typeof HelperFunctions === "undefined") ? require("./HelperFunctions") : HelperFunctions,
	(typeof HelperFunctions === "undefined") ? require("./UserFunctions") : UserFunctions
);

// Creates dependencies for Jest without requiring modules to be present for Mongo
if (typeof module  === "object") module.exports = DatabaseFunctions;