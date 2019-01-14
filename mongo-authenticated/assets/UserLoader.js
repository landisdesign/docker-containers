const UserLoader = (function() {

	// DRY'ing and identifying constants
	const userAdminRoles = ["userAdmin", "userAdminAnyDatabase", "hostManager"];

	const roleClone = x => (typeof x === "object") && ("role" in x) ? {role: x.role, db: x.db} : x;

	const roleMatch = testRole => (x => {
		if ( (typeof testRole === "object") && ("role" in testRole) ) {
			return (typeof x === "object") && ("role" in x) && (x.role == testRole.role) && (x.db == testRole.db);
		}
		else {
			return (x == testRole);
		}
	});

	const userRoleSplitter = (acc, testRole) => {
		let isUserRole = false;

		if (typeof testRole === "object") {
			isUserRole = ( ("role" in testRole) && (testRole.role in roles) );
		}
		else {
			isUserRole = (testRole in roles);
		}

		acc[isUserRole ? "userRoles" : "predefinedRoles"].push(testRole);

		return acc;
	};

	const userMatch = testUser => (x => x.nameEquals(testUser) );

	const User = {
		init: function(user, password, roles) {
			this.user = user;
			this.pwd = password;
			this.roles = roles.map(roleClone);
			this.deployed = false;
			return this;
		},

		isDeployed: function() {
			return this.deployed;
		},

		setDeployed: function(deploy) {
			this.deployed = deploy;
		},

		out: function() {
			return {
				user: this.user,
				pwd: this.pwd,
				roles: this.roles.map(roleClone)
			};
		},

		clone: function() {
			let newUser = Object.create(User);
			newUser.init(this.user, this.pwd, this.roles);
			return newUser;
		},

		mergeRoles: function(otherUser) {
			let otherData = otherUser.out();
			let newUser = this.clone();
			otherData.roles.forEach(otherRole => {
				if ( newUser.roles.findIndex( roleMatch(otherRole) ) === -1 ) {
					newUser.roles.push(otherRole);
				}
			});
			return newUser;
		},

		splitRoles: function(userRoles) {
			let thisData = this.out();
		},

		nameEquals: function(otherUser) {
			let otherData = otherUser.out();
			return ("pwd" in otherData) && ("role" in otherData) && ( this.user == otherData.user );
		}
	};

	Role = {
		init: function(name, privileges, baseRoles) {
			this.role = name;
			this.roles = baseRoles.map(roleClone);
			this.privileges = privileges.map(privilege => createPrivilege(privilege.resource, privilege.actions));
			return this;
		},

		out: function() {
			return {
				role: this.role,
				roles: this.roles,
				privileges: this.privileges
			};
		}
	};

	let userAdmin = null;
	let otherUsers = [];
	let roles = {};

	function addUserAdmin(user, password) {
		userAdmin = Object.create(User).init(user, password, userAdminRoles);
		return this;
	}

	function addUser(user, password, roles) {
		if (userAdmin === null) {
			if ( roles.findIndex( roleMatch(userAdminRole) ) != -1 ) {
				userAdmin = Object.create(User).init(user, password, roles);
			}
			else {
				throw Error ("userAdmin needs to be defined before additional admins can be added");
			}
		}
		else {
			let newUser = Object.create(User).init(user, password, roles);
			if ( userAdmin.nameEquals(newUser) ) {
				userAdmin = userAdmin.mergeRoles(newUser);
			}
			else {
				let i = otherUsers.findIndex( userMatch(newUser) );
				if ( i === -1 ) {
					otherUsers.push(newUser);
				}
				else {
					let existingUser = otherUsers[i];
					otherUsers[i] = existingUser.mergeRoles(newUser);
				}
			}
		}
		return this;
	}

	function addRole(name, privileges = [], baseRoles = []) {
		roles[name] = Object.create(Role).init(name, privileges, baseRoles);
	}

	function createPrivilege(resource, actions) {
		return {
			resource: Object.assign({}, resource),
			actions: Array.from(actions)
		};
	}

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

function printError(message, error) {
	print("*\n*\n*\n***" + message + ":\n* {");
	for (key in error) {
		print("*  " + key + ": " + error[key]);
	}
	print("*}\n*\n*\n*");
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
printError("Error thrown adding user " + userData.user + "/" + userData.pwd + "; tryUpdate=" + tryUpdate, e);
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
printError("Error thrown updating user " + userData.user + "/" + userData.pwd + "; error was" + error, e);
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