
const authDB = DatabaseFunctions.getDB(authDBName);
const userDB = userDBName == authDBName ? authDB : DatabaseFunctions.getDB(userDBName);

const executor = (authDB, userDB) => user => {
	const errorMessage = DatabaseFunctions.changePassword(userDB, user);
	if (errorMessage) return errorMessage;
	if (user.auth) {
		if (DatabaseFunctions.authenticate(authDB, user) == 0) {
			return "User " + user.user + " could not authenticate after changing password";
		}
	}
};
const results = HelperAction.collectResults(executor, passwords);

if (results.length) {
	const message = "Errors occurred changing passwords:" + results.join("\n * ");
	throw new Error(message);
}