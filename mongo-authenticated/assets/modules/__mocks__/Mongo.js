function Mongo() {}

Mongo.setDB = function(db) {
	this.db = db;
}

Mongo.prototype.getDB = function(name) {
	Mongo.db.name = name;
	return Mongo.db;
}

module.exports = Mongo;