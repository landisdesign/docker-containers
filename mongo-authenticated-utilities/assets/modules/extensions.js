extensions = (DatabaseFunctions, HelperFunctions, RoleDescriptorFunctions, UserFunctions) => {

	const changePassword = (db, user) => {
		try {
			db.changeUserPassword(user.user, { pwd: user.pwd } );
		}
		catch (e) {
			return HelperFunctions.errorMessage(e);
		}
	};

	const changePasswords = (db, users) => {
		return HelperFunctions.collectResults(HelperFunctions.embedDB(db, changePassword), users);
	};

	const replaceUser = (db, oldUserName, newUser) => {
		try {
			const oldUser = db.getUser(oldUserName, {showPrivileges: true});
			if (oldUser) {
				const newRoles = oldUser.roles.concat(newUser.roles).reduce(RoleDescriptorFunctions.combiner, []);
				const updatedUser = UserFunctions.create(newUser.user, newUser.pwd, newRoles);
				return DatabaseFunctions.loadUser(db, updatedUser);
			}
		}
		catch (e) {
			return HelperFunctions.errorMessage(e);
		}
	};

	const dropUser = (db, user) => {
		try {
			db.dropUser(user);
		}
		catch (e) {
			return HelperFunctions.errorMessage(e);
		}
	}

	Object.assign(DatabaseFunctions, {
		changePassword,
		changePasswords,
		dropUser,
		replaceUser		
	});
};

// Creates dependencies for Jest without requiring module to be present for Mongo
if (typeof module === "object") module.exports = extensions;