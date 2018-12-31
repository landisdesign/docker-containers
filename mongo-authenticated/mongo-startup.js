const mongo = new Mongo();

load("/mongo-admins.js");

var db = mongo.getDB("admin");
db.createUser(admin);
if ( db.auth(admin.user, admin.pwd) ) {
	roles.forEach( user => db.createUser(user) )
}
else {
	print("Could not authenticate " + admin.user)
}

quit()