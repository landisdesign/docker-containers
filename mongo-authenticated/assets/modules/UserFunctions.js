const UserFunctions = (function(RoleDescriptorFunctions, UserDefinedRoleFunctions) {

	const create = (user, pwd, roles) => ({
		user,
		pwd,
		roles.map(RoleDescriptorFunctions.clone)
	});

	const userAdminRoles = ["userAdmin", "userAdminAnyDatabase", "hostManager"];

	const createAdmin = (user, pwd) => create(user, pwd, userAdminRoles);

	const isUser = user => (
		(typeof user === "object") && 
		("user" in user ) &&
		("pwd" in user) &&
		(typeof user.roles === "object") &&
		("length" in user.roles)
	);

	const isAdmin = user => isUser(user) && RoleDescriptorFunctions.rolesInArray(user.roles, userAdminRoles);

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
				users[i].roles.reduce(RoleDescriptorFunctions.combiner, user.roles)
			);
		}
		return users;
	};

	const splitUserByDefinedRoles = (user, userDefinedRoles) => {
		const userDefinedRoleNames = userDefinedRoles.reduce(UserDefinedRoleFunctions.nameMapper, {} );
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
			const adminUser = combinedUsers.splice(adminIndex, 1);
			const splitAdmin = splitUserByDefinedRoles(adminUser, userDefinedRoles);
			combinedUsers.unshift(splitAdmin.predefinedRoles);
			if ("userDefinedRoles" in splitAdmin) {
				combinedUsers.push(splitAdmin.userDefinedRoles);
			}
		}
		return combinedUsers;
	};
	
	return {
		create: create,
		createAdmin: createAdmin,
		isAdmin: isAdmin,
		normalizeUsers: normalizeUsers
	};

})(RoleDescriptorFunctions, UserDefinedRoleFunctions);