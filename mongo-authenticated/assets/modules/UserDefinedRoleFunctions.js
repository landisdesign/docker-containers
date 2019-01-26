const UserDefinedRoleFunctions = (function() {

	const privilege = (resource, actions) => ({
		resource: Object.assign({}, resource),
		actions: actions.concat()
	});

	const clonePrivilege = x => privilege(x.resource, x.actions);

	const role = (role, privileges, roles) => ({
		role,
		privileges: privileges.map(clonePrivilege),
		roles: roles.map(RoleDescriptorFunctions.clone)
	});

	const nameMapper = (map, role) => {
		map[role.role] = role;
		return map;
	};

	return {
		privilege: privilege,
		clonePrivilege: clonePrivilege,
		role: role
	};

})();