const HelperFunctions = require("../modules/HelperFunctions");

describe("collectResults", () => {
	test("calls action for each item in list", () => {
		const items = [0, 1, 2, 3, 4, 5];
		const mockAction = jest.fn();

		HelperFunctions.collectResults(mockAction, items);
		const calledItems = mockAction.mock.calls.reduce( (arr, args) => arr.concat(args[0]), []);
		expect(calledItems).toEqual(items);
	});

	test("returns results", () => {
		const items = [0, 1, 2, 3, 4, 5];
		const mockAction = jest.fn();

		let results = HelperFunctions.collectResults(mockAction, items);
		expect(results).toEqual([]);

		mockAction.mockImplementation( x => {if (x % 2) return x} );
		results = HelperFunctions.collectResults(mockAction, items);
		expect(results).toEqual([1, 3, 5]);
	});
});

describe("embedDB", () => {
	test("transforms action calls", () => {
		const db = {}, item = {};
		const calls = [ [db, item] ];
		const mockAction = jest.fn();

		const embeddedAction = HelperFunctions.embedDB(db, mockAction);

		embeddedAction(item);

		const args = mockAction.mock.calls;

		expect(args).toEqual(calls);
	});

	test("submits different items to same DB", () => {
		const db = {}, item1 = {}, item2 = {};
		const calls = [ [db, item1], [db, item2] ];
		const mockAction = jest.fn();

		const embeddedAction = HelperFunctions.embedDB(db, mockAction);

		embeddedAction(item1);
		embeddedAction(item2);

		const args = mockAction.mock.calls;

		expect(args).toEqual(calls);
	});
});

test("Error information is being reported properly", () => {
	const error = {message: "Message", code: 1};

	const result = HelperFunctions.errorMessage(error);

	expect(result).toMatch(error.message + " (" + error.code + ")");
});

describe("fallbackAction", () => {
	test("returns normally on normal execution", () => {
		const mockNormal = jest.fn();
		const mockFallback = jest.fn();
		const mockPredicate = jest.fn();

		const result = HelperFunctions.fallbackAction(mockNormal, mockFallback, mockPredicate);

		expect(result).toBeUndefined();
		expect(mockNormal).toHaveBeenCalled();
		expect(mockFallback).not.toHaveBeenCalled();
		expect(mockPredicate).not.toHaveBeenCalled();
	});

	test("returns normally on callback execution", () => {
		const error = new Error();
		const mockNormal = jest.fn( () => {throw error} );
		const mockFallback = jest.fn();
		const mockPredicate = jest.fn().mockReturnValue(true);

		const result = HelperFunctions.fallbackAction(mockNormal, mockFallback, mockPredicate);

		expect(result).toBeUndefined();
		expect(mockNormal).toHaveBeenCalled();
		expect(mockFallback).toHaveBeenCalled();
		expect(mockPredicate).toHaveBeenCalled();
		expect(mockPredicate.mock.calls[0][0]).toBe(error);
	});

	test("returns error message on normal execution", () => {
		const error = new Error("message");
		error.code = 1;
		const mockNormal = jest.fn( () => {throw error} );
		const mockFallback = jest.fn();
		const mockPredicate = jest.fn().mockReturnValue(false);

		const result = HelperFunctions.fallbackAction(mockNormal, mockFallback, mockPredicate);

		expect(result).toMatch( HelperFunctions.errorMessage(error) );
		expect(mockFallback).not.toHaveBeenCalled();
	});

	test("returns error message on fallback execution", () => {
		const error1 = new Error("message");
		error1.code = 1;
		const error2 = new Error("message2");
		error2.code = 2;
		const mockNormal = jest.fn( () => {throw error1} );
		const mockFallback = jest.fn( () => {throw error2} );
		const mockPredicate = jest.fn().mockReturnValue(true);

		const result = HelperFunctions.fallbackAction(mockNormal, mockFallback, mockPredicate);

		expect(result).toMatch( HelperFunctions.errorMessage(error2) );
	});
});
