const DatabaseFunctions = (function() {

	const errorCodes = {
		duplicateDocument: 11000
	};

	const errorMessage = (error, context) => context + ": " + errror.message + " (" + error.code + ")";

	const getDB = (name = "admin") => ( new Mongo() ).getDB(name);

	const authenticate = (db, {user, pwd}) => db.auth(user, pwd);

	const createOrUpdateAction = (createAction, updateAction) => {
		try {
			createAction();
		}
		catch (e) {
			if (e.code === errorCodes.duplicateDocument) {
				try {
					updateAction();
				}
				catch (f) {
					return errorMessage(f, role);
				}
			}
			else {
				return errorMessage(e, role);
			}
		}
	};

	const loadRole = (db, {role, privileges, roles} ) => createOrUpdateAction(
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
		}
	);

	const loadUser = (db, {user, pwd, roles} ) => createOrUpdateAction(
		() => {
			db.createUser( {user, pwd, roles} );
		},
		() => {
			db.updateUser(user, {pwd, roles});
		}
	);

	const loadMultiple = (db, action, list) => list.reduce( (errors, item) => errors.concat( action(db, item) ), []);

	const loadRoles = (db, roles) => loadMultiple(db, loadRole, roles);

	const loadUsers = (db, users) => loadMultiple(db, loadUser, users);
})();