// These are loaded in dependency order.
load("/HelperFunctions.js");
load("/RoleDescriptorFunctions.js");
load("/UserDefinedRoleFunctions.js");
load("/UserFunctions.js");
load("/DatabaseFunctions.js");

let roles = [];
let users = [];

load("/mongo-admins.js"); // generated by generic containers
load("/mongo-users.js"); // empty file in generic containers; should be overridden by individual apps

const db = DatabaseFunctions.getDB();
DatabaseFunctions.authenticateAndLoad(db, users, roles);

quit();