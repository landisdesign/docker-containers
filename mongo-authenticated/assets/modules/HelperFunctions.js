const HelperFunctions = (function() {

	const collectResults = (action, list) => list.reduce( (results, item) => {
		const result = action(item);
		return (typeof result === "undefined") ? results : results.concat(result);
	}, []);

	const embedDB = (db, action) => item => action(db, item);

	const errorMessage = (error) => error.message + " (" + error.code + ")";

	const fallbackAction = (action, fallback, catchPredicate) => {
		try {
			action();
		}
		catch (e) {
			if ( catchPredicate(e) ) {
				try {
					fallback();
				}
				catch (f) {
					return errorMessage(f);
				}
			}
			else {
				return errorMessage(e);
			}
		}
	};

	return {
		collectResults,
		embedDB,
		errorMessage,
		fallbackAction
	};

})();

// Creates dependencies for Jest without requiring modules to be present for Mongo
if (typeof module === "object") module.exports = HelperFunctions;