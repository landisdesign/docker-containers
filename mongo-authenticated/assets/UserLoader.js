/*
 *	Since I don't have access to ES6 modules, I use global objects built via
 *	IIFE. Methods are encapsulate within the closure. Instance methods are
 *	collected into an object used by the singleton's create() method via
 *	Object.create(). Static methods are returned at the end of the function.
 *	All others are private.
 *
 *	Since I don't intend to do a full JS dev lifecyle on MongoDB scripts, and
 *	since MongoDB 4.x is running SpiderMonkey 45 and doesn't support modules,
 *	I'm not attempting to do any specific dependency work. I am highlighting
 *	dependencies by supplying each global IIFE with parameters identifying the
 *	other IIFE's they depend upon. This doesn't necessarily help bring together
 *	the dependencies, but at least it draws some attention to them.
 *
 *	It smells. Sigh.
 */

/*
 *
 *	Container for user information.
 *
 */
const User = (function() {

	// Instance methods
	function mergeRoles(otherUser) {
		const otherData = otherUser.out();
		otherData.roles.forEach(otherRole => {
			if ( this.roles.findIndex( roleMatch ) === -1 ) {
				this.roles.push(otherRole);
			}
		});
	}

	function nameEquals(user) {
		if ( (user == null) || !("out" in user) || (typeof user.out !== "function") ) {
			return false;
		}
		const userData = user.out();
		return userData.user == this.user;
	}

	function out() {
		return {
			user: this.user,
			pwd: this.pwd,
			roles: this.roles.map(roleDescriptorClone)
		};
	}

	function toString() {
		return JSON.stringify(this.out());
	}

	const instanceMethods = {
		mergeRoles: mergeRoles,
		nameEquals: nameEquals,
		out: out,
		toString: toString
	};

	// Static methods
	function create(user, pwd, roles) {
		const userObj = Object.create(instanceMethods);
		userObj.user = user;
		userObj.pwd = pwd;
		userObj.roles = roles.map(roleDescriptorClone);
		return userObj;
	};

	function createUserAdmin(user, pwd) {
		return create(user, pwd, userAdminRoles);
	}

	const roleMatch = testRole => x => {
		if ( (typeof testRole === "object") && ("role" in testRole) ) {
			return (typeof x === "object") && ("role" in x) && (x.role == testRole.role) && (x.db == testRole.db);
		}
		else {
			return (x == testRole);
		}
	};

	const roleDescriptorClone = x => (typeof x === "object") && ("role" in x) ? {role: x.role, db: x.db} : x;

	const userAdminRoles = ["userAdmin", "userAdminAnyDatabase", "hostManager"];

	return {
		create: create,
		createAdmin: createAdmin,
		roleDescriptorClone: roleDescriptorClone,
		roleMatch: roleMatch,
		userAdminRoles: userAdminRoles
	};

})();

/*
 *
 *	A list of users to be added to the database. A separate user admin is
 *	identified to permit creation of a user authorized to define other users.
 *
 *	As each user is added to this list, it is compared against previously
 *	added users. If a user with the same name is already present, instead of
 *	creating a duplicate user, UserList will update the existing user with any
 *	additional roles provided by the newly introduced user data. This ensures
 *	that the password provided by the first instance is retained.
 *
 *	User-defined database roles are applied after authentication by the user
 *	admin. This means that defining a user admin with user-defined roles will
 *	cause the creation of the user admin to fail and abort the entire process.
 *
 *	Before attempting to use this list with any of the methods on UserLoader,
 *	run cleanList(roleManager) first. This will split the user admin User into
 *	a clean pre-authentication User and a User containing user-defined roles.
 *	This second User would update the admin after the roles have been defined.
 *
 */
const UserList = (function(User) {

	// Private static method
	function _addToList(list, user) {
		const userFinderBuilder = testUser => x => x.nameEquals(testUser);
		const userFinder = userFinderBuilder(user);

		const mergedUser = list.find(userFinder);
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

	function cleanList(roleManager) {
		const userAdminData = this.userAmin.out();
		const adminRoles = roleManager.splitRoles(userAdminData.roles);
		if (adminRoles.userDefinedRoles.length) {
			const cleanAdminUser = User.create(userAdminData.user, userAdminData.pwd, adminRoles.predefinedRoles);
			const roledAdminUser = User.create(userAdminData.user, userAdminData.pwd, adminRoles.userDefinedRoles);
			this.setUserAdmin(cleanAdminUser);
			_addToList(this.users, roledAdminUser);
		}
	}

	function getUserAdminData() {
		return this.userAdmin && this.userAdmin.out();
	}

	function getUserData() {
		return this.users.map(user => user.out());
	}

	function setUserAdmin(userAdmin) {
		const roles = userAdmin.out().roles;
		const isAdmin = User.userAdminRoles.reduce(
			(
				(acc, testRole) => acc && roles.findIndex( User.roleMatch(testRole) ) != -1
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
		getUserAdminData: getUserAdminData,
		getUserData: getUserData,
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

})(User);

/*
 *	Defines a resource and the actions permitted on it. I created this as a
 *	separate object because otherwise the "privileges" member in role creation
 *	gets really ugly with all of the nested arrays and objects. privilege.out()
 *	is much prettier than
 *
 *	{ resource: {db: "x", collection: "y"}, actions: ["a", "b", "c"] }
 *
 *	especially when there is an array of these.
 *
 */
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

	return {
		create: create
	};

})();

/*
 *	Identifies user-defined roles. When added to RoleManager, each UserRole
 *	is added to the database prior to adding other users.
 *
 */
const UserRole = (function(User) {

	// instance methods
	function out() {
		return {
			role: this.role,
			roles: this.roles.map(User.roleDescriptorClone),
			privileges: this.privileges.map(privilege => privilege.out())
		}
	}

	const instanceMethods = {
		out: out
	};

	// static methods
	function create(role, privileges = [], roles = []) {
		let userRoleObj = Object.create(instanceMethods);
		userRoleObj.role = role;
		userRoleObj.privileges = privileges.map(privilege => privilege.clone());
		userRoleObj.roles = roles.map(User.roleDescriptorClone);
		return userRoleObj;
	})

	return {
		create: create
	};

})(User);

/*
 *	A Singleton for loading user-defined roles into the database. Also provides
 *	a utility for separating user-defined roles from predefined ones.
 *
 */
const RoleManager = (function() {

	const userRoles = {};

	// static methods
	function addUserRole(name, userRole) {
		userRoles[name] = userRole;
	}

	function splitRoles(mixedRoles) {
		const userRoleSplitterBuilder = roles => (acc, mixedRole) => {
			let isUserRole = false;
			if (typeof mixedRole === "object") {
				isUserRole = ( ("role" in mixedRole) && (mixedRole.role in roles) );
			}
			else {
				isUserRole = (mixedRole in roles);
			}
			acc[isUserRole ? "userDefinedRoles" : "predefinedRoles"].push(mixedRole);
			return acc;
		};

		const userRoleSplitter = userRoleSplitterBuilder(userRoles);
		return mixedRoles.reduce(userRoleSplitter, { userDefinedRoles: [], predefinedRoles: [] });
	}

	function loadRoles(db) {

		const roleLoaderBuilder = db => roles => (name, errors) => {
			const roleData = roles[name].out();
			try {
				db.createRole(roleData);
			}
			catch (e) {
				try {
					if (roleData.privileges.length) {
						db.grantPrivilegesToRole(name, roleData.privileges);
					}
					if (roleData.roles.length) {
						db.grantRolesToRole(name, roleData.roles);
					}
				}
				catch (f) {
					errors.push(name + ": " + f.message);
				}
			}
			return errors
		};

		const roleLoader = roleLoaderBuilder(db)(userRoles);
		return Object.keys(roles).reduce(roleLoader, []);
	}

	return {
		addUserRole: addUserRole,
		splitRoles: splitRoles,
		loadRoles: loadRoles
	};

})();

/*
 *
 *	Defines database-centric utilities.
 *
 */
const DatabaseManager = (function() {

	function authenticate(db, {user, pwd}) {
		return db.authenticate(user, pwd);
	}

	function connect() {
		return (new Mongo()).getDB("admin");
	}

	return {
		authenticate: authenticate,
		connect: connect
	};

})();

/*
 *
 *	Loads users into the database. Provides methods for creating and
 *	authenticating an admin to create other users, for adding or updating
 *	individual users, and for adding an array of user data.
 *
 *	If authenticating before creating roles, ensure that the provided admin
 *	is stripped of user-defined roles, or the admin will not be created and
 *	authentication will not take place. User data can be cleaned using the
 *	cleanList() method found on UserList.
 *
 *	UserLoader exposes many of its basic functions for use in other situations,
 *	such as administering an existing database versus building up a new one.
 *
 *	For most startup situations, load() will call these functions as you would
 *	expect: cleaning the user data list, adding the initial user admin,
 *	authenticating, loading roles, then loading all other users in the user
 *	list.
 *
 *	Load takes the other managers as method arguments to permit extension.
 *
 */
const UserLoader = (function() {

	function addUser(db, {user, pwd, roles}, tryUpdate = false) { // throws if user couldn't be added, or couldn't be added or updated if tryUpdate == true
		try {
			db.createUser( {user, pwd, roles} );
			return true;
		}
		catch (e) {
			if (tryUpdate) {
				db.updateUser( user, {pwd, roles} );
				return false;
			}
			else {
				throw e;
			}
		}
	}

	function load(dbManager, roleManager, userManager, userList) {

		function reportOnArray(func, message) {
			const results = func();
			if (results.length) {
				print(message + ":");
				results.forEach(e => print(e) );
			}
		}

		const db = dbManager.connect();

		const loadRoles = () => roleManager.loadRoles(db);
		const loadUsers = () => userManager.loadUsers(db, userList.getUserData() );

		try {
			userList.cleanList(roleManager);
			const authenticated = loadUserAdminAndAuthenticate(dbManager, db, userList.getUserAdminData() );
			if (authenticated) {
				reportOnArray(loadRoles, "The following roles could not be added/updated");
				reportOnArray(loadUsers, "The following users could not be added/updated");
			}
		}
		catch (e) {
			print("Error prevented users and roles from being added/updated properly:");
			print(e.message);
		}
	}

	// Note that userList.cleanList() should be called on the list the admin data comes from, prior to running this.
	function loadUserAdminAndAuthenticate(db, {user, pwd, roles} ) {
		try {
			addUser(db, {user, pwd, roles} );
			return dbManager.authenticate(db, {user, pwd} );
		}
		catch (e) {
			const result = dbManager.authenticate(db, {user, pwd} );
			if (result) {
				updateUser(db, {user, pwd, roles} );
				return result;
			}
			else {
				throw e;
			}
		}
	}

	// Note that userList.cleanList() should be called on the list userDataArray comes from, prior to running this.
	function loadUsers(db, userDataArray) {
		const userLoaderBuilder = db => ({user, pwd, roles}, errors) => {
			try {
				updateUser(db, {user, pwd, roles} ); // if this throws, collect error for this specific user and continue
			}
			catch (e) {
				errors.push(user + ": " + e.message);
			}
			return errors;
		};

		const userLoader = userLoaderBuilder(db);

		return userDataArray.reduce(userLoader, []);
	}

	function updateUser(db, {user, pwd, roles} ) { // throws if user couldn't be added or updated
		return addUser(db, {user, pwd, roles}, true);
	}

	return {
		addUser: addUser,
		load: load,
		loadUserAdminAndAuthenticate: loadUserAdminAndAuthenticate,
		loadUsers: loadUsers,
		updateUser: updateUser
	};

})();
