
const userDB = DatabaseFunctions.getDB(dbName, hostUrl);

if (DatabaseFunctions.authenticate(userDB, authUser)) {
	const results = DatabaseFunctions.changePasswords(userDB, changedUsers);

	if (results.length) {
		const message = "Errors occurred changing passwords:\n\n * " + results.join("\n * ");
		throw new Error(message);
	}
}
else {
	throw new Error("Could not authenticate " + authUser.user);
}