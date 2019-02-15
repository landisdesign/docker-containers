const MockDB = (HelperFunctions) => {

	const mockDBGenerator = methods => (db = {}) => Object.entries(methods).reduce((map, [key, value]) => {
		const fn = jest.fn();
		if (typeof value === "function") {
			fn.mockImplementation(value);
		}
		map[key] = fn;
		return map;
	}, db);

	const mockAuthDB = authenticates => mockDBGenerator({
		auth: () => authenticates ? 1 : 0
	});

	const throwErrorImplementation = (message = "Error message", code = 1) => {
		const fn = () => {
			const error = new Error(message);
			error.code = code;
			throw error;
		};
		const error = ( () => {
			try {
				fn();
			}
			catch(e) {
				return e;
			}
		} )();

		return {
			fn,
			error,
			message: HelperFunctions.errorMessage(error)
		};
	};

	const throwDuplicateImplementation = throwErrorImplementation("Duplicate exists", 11000);

	// Placing the counter on implData lets us update it on each call of the create method.
	// The closure fixes the object reference but not its members.
	// We increment it on create because we can't guarantee the update method will be called.
	const mockDBForData = (db, createMethodName, updateMethodName) => implData => {
		implData.index = -1;

		db[createMethodName].mockImplementation( () => {
			implData.index++;
			const datum = implData[implData.index];
			if (datum.isNew) {
				if (datum.throwsError) {
					throw datum.error;
				}
			}
			else {
				throwDuplicateImplementation.fn();
			}
		});

		db[updateMethodName].mockImplementation( () => {
			const datum = implData[implData.index];
			if (datum.throwsError) {
				throw datum.error;
			}
		});

		return db;
	};

	const buildImplData = implData => implData.reduce(
		(acc, datum) => {
			const mappedDatum = Object.assign({}, datum);
			if (mappedDatum.throwsError) {
				const errorData = throwErrorImplementation("Errored out", acc.data.length);
				delete errorData.fn;
				Object.assign(mappedDatum, errorData);
				acc.messages.push(mappedDatum.message);
			}
			acc.data.push(mappedDatum);
			return acc;
		},
		{data: [], messages: []}
	);
	
	const mockDBForSimpleData = (db, methodName) => {
		const unusedMethodName = "__unusedMethod__";
		if ( !(unusedMethodName in db) ) {
			db[unusedMethodName] = jest.fn();
		}
		return mockDBForData(db, methodName, unusedMethodName);
	};

	const buildSimpleImplData = implData => buildImplData( implData.map(item => ({isNew: true, throwsError: item}) ) );

	return {
		mockDBGenerator: mockDBGenerator,
		mockAuthDB: mockAuthDB,
		throwErrorImplementation: throwErrorImplementation,
		throwDuplicateImplementation: throwDuplicateImplementation,
		mockDBForData: mockDBForData,
		buildImplData: buildImplData,
		mockDBForSimpleData: mockDBForSimpleData,
		buildSimpleImplData: buildSimpleImplData
	};

};

module.exports = MockDB;