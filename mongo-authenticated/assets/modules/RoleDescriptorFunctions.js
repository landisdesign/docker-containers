const RoleDescriptorFunctions = (function() {

	const clone = x => (typeof x === "object") && ("role" in x) ? {role: x.role, db: x.db} : x;

	const equals = testRole => x => {
		if (testRole == null || x == null) {
			return false;
		}
		if (typeof testRole === "object") {
			return (
				("role" in testRole) &&
				(typeof x === "object") &&
				("role" in x) &&
				(x.role == testRole.role) &&
				(x.db == testRole.db)
			);
		}
		return (x == testRole);
	};

	const roleName = role => (typeof role === "object") ? role.role : role;

	const combiner = (roleArray, role) => {
		if ( !roleArray.some( equals(role) ) ) {
			roleArray.push( clone(role) );
		}
		return roleArray;
	}

	const rolesInMap = (roles, inRoleMap) => (
		roles.reduce( (map, role) => {
			const name = roleName(role);
			const bucket = (name in inRoleMap) ? "in" : "out";
			map[bucket].push(role);
			return map;
		}, { "in":[], "out":[] } )
	);
	
	return {
		clone,
		combiner,
		equals,
		rolesInMap
	};
})();

// Adds module for Jest without creating problems if Mongo doesn't define module
if (typeof module === "object") module.exports = RoleDescriptorFunctions;