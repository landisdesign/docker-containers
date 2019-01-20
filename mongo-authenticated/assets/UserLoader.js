const UserUtilities = {
	userAdminRoles:
		["userAdmin", "userAdminAnyDatabase", "hostManager"],

	roleClone: (
		x => (typeof x === "object") && ("role" in x) ? {role: x.role, db: x.db} : x
	),

	roleMatch: (
		testRole => (
			x => {
				if ( (typeof testRole === "object") && ("role" in testRole) ) {
					return (typeof x === "object") && ("role" in x) && (x.role == testRole.role) && (x.db == testRole.db);
				}
				else {
					return (x == testRole);
				}
			}
		)
	),

	userMatch: (
		testUser => (
			x => x.nameEquals(testUser)
		)
	)
};

const User = (function() {

	// Instance methods
	function clone() {
		return User.create(this.user, this.pwd, this.roles);
	}

	function mergeRoles(otherUser) {
		let otherData = otherUser.out();
		otherData.roles.forEach(otherRole => {
			if ( this.roles.findIndex( UserUtilities.roleMatch(otherRole) ) === -1 ) {
				this.roles.push(otherRole);
			}
		});
	}

	function nameEquals(user) {
		if ( (user == null) || !("out" in user) || (typeof user.out !== "function") ) {
			return false;
		}
		let userData = user.out();
		return userData.user == this.user;
	}

	function out() {
		return {
			user: this.user,
			pwd: this.pwd,
			roles: this.roles.map(UserUtilities.roleClone)
		};
	}

	function toString() {
		return JSON.stringify(this.out());
	}

	const instanceMethods = {
		clone: clone,
		mergeRoles: mergeRoles,
		nameEquals: nameEquals,
		out: out,
		toString: toString
	};

	// Static methods
	function create(user, pwd, roles) {
		let userObj = Object.create(instanceMethods);
		userObj.user = user;
		userObj.pwd = pwd;
		userObj.roles = roles.map(UserUtilities.roleClone);
		return userObj;
	};

	return {
		create: create
	};

})();

const UserList = (function() {

	// Private method
	function _addToList(list, user) {
		let mergedUser = list.find( UserUtilities.userMatch(user) );
		if (mergedUser == null) {
			list.push(user);
		}
		else {
			mergedUser.mergeRoles(user);
		}
	}

	// Instance methods
	function addUser(user) {
		if (user == null) {
			throw new Error("Cannot add a null user");
		}
		if (this.userAdmin != null && this.userAdmin.nameEquals(user)) {
			this.userAdmin.mergeRoles(user);
		}
		else {
			_addToList(this.users, user);
		}
	}

	function cleanList(rolesManager) {
		let adminRoles = rolesManager.splitUserByRoles(this.userAdmin);
		if ("userDefinedRoles" in adminRoles) {
			this.setUserAdmin(adminRoles.predefinedRoles);
			_addToList(this.users, adminRoles.userDefinedRoles);
		}
	}

	function getUserAdmin() {
		return this.userAdmin && this.userAdmin.clone();
	}

	function getUsers() {
		return this.users.map(user => user.clone());
	}

	function setUserAdmin(userAdmin) {
		let roles = userAdmin.out().roles;
		let isAdmin = UserUtilities.userAdminRoles.reduce(
			(
				(acc, testRole) => acc && roles.findIndex( roleMatch(testRole) ) != -1
			),
			true
		);
		if (!isAdmin) {
			throw new Error(userAdmin + " is not a user admin");
		}
		this.userAdmin = userAdmin;
	}

	const instanceMethods = {
		addUser: addUser,
		cleanList: cleanList,
		getUserAdmin: getUserAdmin,
		getUsers: getUsers,
		setUserAdmin: setUserAdmin
	};

	// static methods
	function create() {
		let userListObj = Object.create(instanceMethods);
		userListObj.userAdmins = null;
		userListObj.users = [];
		return userListObj;
	}

	return {
		create: create
	};

})();

const Privilege = (function() {

	// instance methods
	function clone() {
		return Privilege.create(this.resource, this.actions);
	}

	function out() {
		return {
			resource: Object.assign({}, this.resource),
			actions: Array.from(this.actions);
		}
	}

	const instanceMethods = {
		clone: clone,
		out: out
	};

	// static methods
	function create(resource, actions) {
		let privilegeObj = Object.create(instanceMethods);
		privilegeObj.resource = Object.assign({}, resource);
		privilegeObj.actions = Array.from(actions);
		return privilegeObj;
	}
})();

const UserRole = (function() {

	// instance methods
	function out() {
		return {
			role: this.role,
			roles: this.roles.map(UserUtilities.roleClone),
			privileges: this.privileges.map(privilege => privilege.out())
		}
	}

	const instanceMethods = {
		out: out
	};

	// static methods
	function create(role, privileges, roles) {
		let userRoleObj = Object.create(instanceMethods);
		userRoleObj.role = role;
		userRoleObj.privileges = privileges.map(privilege => privilege.clone());
		userRoleObj.roles = roles.map(UserUtilities.roleClone);
		return userRoleObj;
	})

	return {
		create: create
	};

})();

// static singleton
const RoleManager = (function() {

	const roles = {};

	// static methods
	function addUserRole(role, privileges, roles) {
		roles[role] = Object.create(UserRole).init(role, privileges, roles);
	}

	function splitUserByRoles(user) {
		const userRoleSplitter = (acc, testRole) => {
			let isUserRole = false;

			if (typeof testRole === "object") {
				isUserRole = ( ("role" in testRole) && (testRole.role in roles) );
			}
			else {
				isUserRole = (testRole in roles);
			}

			acc[isUserRole ? "userDefinedRoles" : "predefinedRoles"].push(testRole);

			return acc;
		};

		let userData = user.out();
		let userRoles = userData.roles.reduce(userRoleSplitter, { userDefinedRoles: [], predefinedRoles: [] });
		let splitUser = {};
		if (userRoles.userDefinedRoles.length) {
			splitUser.userDefined = Object.create(User).init(userData.user, userData.pwd, userRoles.userDefinedRoles);
		}
		if (userRoles.predefinedRoles.length) {
			splitUser.predefined = Object.create(User).init(userData.user, userData.pwd, userRoles.predefinedRoles);
		}
		return splitUser;
	}

	function loadRoles(db, roles) {
		Object.keys(roles).forEach(name => {
			let roleData = roles[name].out();
			try {
				db.createRole( roleData );
			}
			catch (e) {
				if (roleData.privileges.length) {
					db.grantPrivilegesToRole(name, roleData.privileges);
				}
				if (roleData.roles.length) {
					db.grantRolesToRole(name, roleData.roles);
				}
			}
		} );
	}

	return {
		addUserRole: addUserRole,
		splitUserByRoles: splitUserByRoles,
		loadRoles: loadRoles
	};

})();

// static singleton
const UserManager = (function() {

})();

const UserLoader = (function() {


	function load() {
		const mongo = new Mongo();
		const db = mongo.getDB("admin");

		let errors = [];

		try {
			let userAdmins = splitAdminByRoles(userAdmin);
			if (! ("predefinedRoles" in userAdmins) ) {
				throw new Error("User admin has no predefined roles and can't be used for authentication. Roles are: " + JSON.stringify(userAdmin.out().roles));
			}
			intializeAdminAndAuthenticate(db, userAdmins.predefinedRoles); // if this throws, bypass additional users and report error
			print("Authenticated with user " + userAdmin.out().user);
			loadRoles(db, roles);
			if ("userRoles" in userAdmins) {
				try {
					addOrUpdateUser(db, userAdmins.userRoles, false); // if this throws, collect error for this specific user and continue
					print("Updated user " + userAdmins.userRules.out().user);
				}
				catch (e) {
					errors.push(userAdmins.userRules.out().user + ": " + e.message);
				}
			}
			otherUsers.forEach(
				user => {
					if ( !user.isDeployed() ) {
						try {
							addOrUpdateUser(db, user); // if this throws, collect error for this specific user and continue
							print("Added/updated user " + user.out().user);
						}
						catch (e) {
							errors.push(user.out().user + ": " + e.message);
						}
					}
				} 
			);
		}
		catch (e) {
			errors.push(userAdmin.out().user + " couldn't authenticate: " + e.message);
		}

		if (errors.length) {
			print("The following errors occurred while authenticating or adding users:");
			errors.forEach(message => print("> " + message));
		}
	}

	function splitAdminByRoles(admin) {
		let adminData = admin.out();
		adminRoles = adminData.roles.reduce(userRoleSplitter, { userRoles: [], predefinedRoles: [] });
		let splitAdmins = {};
		if (adminRoles.userRoles.length) {
			splitAdmins.userRoles = Object.create(User).init(adminData.user, adminData.pwd, adminRoles.userRoles);
		}
		if (adminRoles.predefinedRoles.length) {
			splitAdmins.predefinedRoles = Object.create(User).init(adminData.user, adminData.pwd, adminRoles.predefinedRoles);
		}
		return splitAdmins;
	}

	function intializeAdminAndAuthenticate(db, admin) { // throws error if unsuccessful
		let adminData = admin.out();
		let tryUpdate = false;
		let error = null;

		if ( !admin.isDeployed() ) {
			try {
				addOrUpdateUser(db, admin, true);
			}
			catch (e) { // suspend throw until we know we can't authenticate and update the admin
				error = e;
				tryUpdate = true;
			}
		}

		if ( db.auth(adminData.user, adminData.pwd) ) {
			if (tryUpdate) {
				addOrUpdateUser(db, admin, false); // if we can't update, either, this error should be thrown
				if ( !db.auth(adminData.user, adminData.pwd) ) {
					throw Error("Could not authenticate " + adminData.user);
				}
			}
		}
		else {
			if (error !== null) { // we couldn't add or authenticate
				throw e;
			}
			else { // we couldn't authenticate
				throw Error("Could not authenticate " + adminData.user);
			}
		}
	}

	function addOrUpdateUser(db, user, addOnly) { // throws error if unsuccessful
		let userData = user.out();

		let tryBoth = arguments.length == 2;
		let tryAdd = tryBoth || addOnly == true;
		let tryUpdate = tryBoth || !addOnly;
		let error = null;

		if (tryAdd) {
			try {
				db.createUser(userData);
				user.setDeployed(true);
				return true;
			}
			catch (e) {
				if (!tryUpdate) {
					throw e;
				}
				else {
					error = e;
				}
			}
		}

		if (tryUpdate) {
			try {
				db.updateUser(
					userData.user,
					{
						pwd: userData.pwd,
						roles: userData.roles
					}
				);
				user.setDeployed(true);
				return true;
			}
			catch (e) {
				if (error !== null) { // If both add and update fail, report add error as initial problem.
					throw error;
				}
				else {
					throw e;
				}
			}
		}
	}

	return {
		addUserAdmin: addUserAdmin,
		addUser: addUser,
		addRole: addRole,
		createPrivilege: createPrivilege,
		load: load
	};
})();