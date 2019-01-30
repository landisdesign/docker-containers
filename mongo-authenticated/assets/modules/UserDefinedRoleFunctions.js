const UserDefinedRoleFunctions = (function(RoleDescriptorFunctions) {

	const privilege = (resource, actions) => ({
		resource: Object.assign({}, resource),
		actions: actions.concat()
	});

	const mapNames = roles => roles.reduce(
		(map, role) => {
			map[role.role] = role;
			return map;
		},
		{}
	);

	const role = (role, privileges, roles) => ({
		role,
		privileges: privileges.map( ( {resource, actions} ) => privilege(resource, actions) ),
		roles: roles.map(RoleDescriptorFunctions.clone)
	});

	return {
		privilege,
		mapNames,
		role
	};

})(
	/* This convolution is because MongoJS doesn't recognize NodeJS, but Jest requires it.
	 * When loaded in MongoJS, the JS files are loaded in dependency order, so the dependency is already defined.
	 * When using Jest, it isn't so we need to call require() on it.
	 *
	 * We do this so that we bake some sense of the dependencies into the code for MongoJS. It smells,
	 * but smells less than leaving the dependency deep in the code without explicitly calling it in. */
	(typeof RoleDescriptorFunctions === "undefined") ? require("./RoleDescriptorFunctions") : RoleDescriptorFunctions
);

// Creates dependencies for Jest without requiring module to be present for Mongo
if (typeof module === "object") module.exports = UserDefinedRoleFunctions;