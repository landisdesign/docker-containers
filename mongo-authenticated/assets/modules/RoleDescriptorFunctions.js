const RoleDescriptorFunctions = (function() {

	const clone = x => (typeof x === "object") && ("role" in x) ? {role: x.role, db: x.db} : x;

	const equals = testRole => (x => {
		if (typeof testRole === "object") {
			return (
				("role" in testRole) &&
				(typeof x === "object") &&
				("role" in x) &&
				(x.role == testRole.role) &&
				(x.db == testRole.db)
			);
		}
		else {
			return (x == testRole);
		}
	});

	const roleName = role => (typeof role === "object") ? role.role : role;

	const combiner = (roles, role) => {
		if ( !roleArray.some( equals(role) ) ) {
			roles.push( clone(role) );
		}
		return roles;
	}

	const rolesInMap = (roles, inRoleMap) => (
		roles.reduce( (map, role) => {
			const bucket = (role in map) ? "in" : "out";
			map[bucket].push(role);
			return map;
		}, { "in":[], "out":[] } )
	);
	
	return {
		clone: clone,
		combiner: combiner,
		equals: equals,
		rolesInArray: rolesInArray
	};
})();