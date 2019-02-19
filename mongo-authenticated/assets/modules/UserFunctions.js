const UserFunctions = (function(RoleDescriptorFunctions, UserDefinedRoleFunctions) {

	const create = (user, pwd, roles) => ({
		user,
		pwd,
		roles: roles.map(RoleDescriptorFunctions.clone)
	});

	const roleType = {
		"dbAdminAnyDatabase": ["dbAdminAnyDatabase"],
		"userAdminAnyDatabase": ["userAdmin", "userAdminAnyDatabase", "hostManager"],
		"backupAdmin": ["backup", "restore"]
	};

	const createUserOfType = (user, pwd, type, updateSelf = false) => {
		if ( !(type in roleType) ) {
			throw new Error("User \"" + user + "\" could not be created: User type \"" + type + "\" is not registered.");
		}
		const roles = updateSelf ? roleType[type].concat("updateSelf") : roleType[type];
		return create(user, pwd, roles);
	};

	const registerUserType = (type, roles) => {
		if (type in roleType) {
			roleType[type] = roleType[type].concat(roles).reduce(RoleDescriptorFunctions.combiner, []);
		}
		else {
			roleType[type] = roles.concat();
		}
	};

	const getUserTypes = () => Object.keys(roleType);

	const isUser = user => {
		if ( (user == null) || (typeof user !== "object") ) {
			return false;
		}
		const keys = Object.keys(user);
		const attrMap = {
			user: true,
			pwd: true,
			roles: true
		};
		return (keys.length == 3) &&
			keys.every( key => attrMap[key] ) &&
			Array.isArray(user.roles)
		;
	};

	const isAdmin = user => {
		if (!isUser(user)) {
			return false;
		}
		const userAdminRoles = roleType.userAdminAnyDatabase;
		return user.roles.reduce(
			(acc, role) => {
				// Only looking for global roles. DB-related roles should not be counted.
				if (userAdminRoles.indexOf(role) != -1) {
					acc++;
				}
				return acc;
			},
			0
		) === 3;
	};

	const nameEquals = testUser => x => isUser(testUser) && isUser(x) && (testUser.user == x.user);

	const combiner = (users, user) => {
		const i = users.findIndex( nameEquals(user) );
		if (i == -1) {
			users.push(user);
		}
		else {
			users[i] = create(
				users[i].user,
				users[i].pwd,
				users[i].roles.concat(user.roles).reduce(RoleDescriptorFunctions.combiner, [])
			);
		}
		return users;
	};

	const splitUserByDefinedRoles = (user, userDefinedRoles) => {
		const userDefinedRoleNames = UserDefinedRoleFunctions.mapNames(userDefinedRoles);
		const splitRoles = RoleDescriptorFunctions.rolesInMap(user.roles, userDefinedRoleNames);
		const splitUser = {};
		if (splitRoles.in.length) {
			splitUser.userDefinedRoles = create(user.user, user.pwd, splitRoles.in);
		}
		if (splitRoles.out.length) {
			splitUser.predefinedRoles = create(user.user, user.pwd, splitRoles.out);
		}
		return splitUser;
	};

	const normalizeUsers = (userList, userDefinedRoles) => {
		const combinedUsers = userList.reduce(combiner, []);
		const adminIndex = combinedUsers.findIndex(isAdmin);
		if (adminIndex != -1) {
			const adminUser = combinedUsers.splice(adminIndex, 1)[0];
			const splitAdmin = splitUserByDefinedRoles(adminUser, userDefinedRoles);
			combinedUsers.unshift(splitAdmin.predefinedRoles);
			if ("userDefinedRoles" in splitAdmin) {
				// Splicing instead of pushing to keep original order of users.
				// Not necessary DB loading, but makes more sense for users of this function.
				combinedUsers.splice(adminIndex + 1, 0, splitAdmin.userDefinedRoles);
			}
		}
		return combinedUsers;
	};
	
	return {
		create,
		createUserOfType,
		getUserTypes,
		isAdmin,
		isUser,
		normalizeUsers,
		registerUserType
	};

})(
	/* This convolution is because MongoJS doesn't recognize NodeJS, but Jest requires it.
	 * When loaded in MongoJS, the JS files are loaded in dependency order, so the dependency is already defined.
	 * When using Jest, it isn't so we need to call require() on it.
	 *
	 * We do this so that we bake some sense of the dependencies into the code for MongoJS. It smells,
	 * but smells less than leaving the dependency deep in the code without explicitly calling it in. */
	(typeof RoleDescriptorFunctions === "undefined") ? require("./RoleDescriptorFunctions") : RoleDescriptorFunctions,
	(typeof UserDefinedRoleFunctions === "undefined") ? require("./UserDefinedRoleFunctions") : UserDefinedRoleFunctions
);

// Creates dependencies for Jest without requiring module to be present for Mongo
if (typeof module === "object") module.exports = UserFunctions;