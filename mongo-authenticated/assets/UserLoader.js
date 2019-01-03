const UserLoader = (function() {

	// DRY'ing and identifying constants
	const userAdminRole = {db: "admin", role: "userAdminAnyDatabase"};
	const roleAttr = "role";
	const passwordAttr = "pwd";

	const roleClone = x => (typeof x === "object") && (roleAttr in x) ? {role: x.role, db: x.db} : x;

	const roleMatch = testRole => (x => {
		if ((typeof testRole === "object") && (roleAttr in testRole) ) {
			return (typeof x === "object") && (roleAttr in x) && (x.role == testRole.role) && (x.db == testRole.db);
		}
		else {
			return (x == testRole);
		}
	});

	const userMatch = testUser => (x => x.equals(testUser) );

	const User = {
		init: function(user, password, roles) {
			this.user = user;
			this.pwd = password;
			this.roles = roles.map(roleClone);
			this.deployed = false;
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

		equals: function(otherUser) { // We only compare user names for equality
			let otherData = otherUser.out();
			return (passwordAttr in otherData) && (roleAttr in otherData) && ( this.user == otherData.user );
		}
	};

	let userAdmin = null;
	let otherUsers = [];

	function addUserAdmin(user, password) {
		userAdmin = Object.create(User);
		userAdmin.init(user, password, [userAdminRole]);
		return this;
	}

	function addUser(user, password, roles) {
		if (userAdmin === null) {
			if ( roles.findIndex( roleMatch(userAdminRole) ) != -1 ) {
				userAdmin = Object.create(User);
				userAdmin.init(user, password, roles);
			}
			else {
				throw Error ("userAdmin needs to be defined before additional admins can be added");
			}
		}
		else {
			let newUser = Object.create(User);
			newUser.init(user, password, roles);
			if ( userAdmin.equals(newUser) ) {
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

	function load() {
		const mongo = new Mongo();
		const db = mongo.getDB("admin");

		let errors = [];

		try {
			intializeAdminAndAuthenticate(db, userAdmin); // if this throws, bypass additional users and report error
			print("Authenticated with user " + userAdmin.out().user);
			otherUsers.forEach(
				user => {
					if ( !user.isDeployed() ) {
						try {
							addOrUpdateUser(db, user); // if this throws, collect error for this specific user and continue
							print("Added/updated user " + user.out().user);
						}
						catch (e) {
							errors.push(e);
						}
					}
				} 
			);
		}
		catch (e) {
			errors.push(e);
		}

		if (errors.length) {
			print("The following errors occurred while authenticating or adding users:");
			errors.forEach(e => print("> " + e.message));
		}
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
		load: load
	};
})();