// These are loaded in dependency order.
load("/HelperFunctions.js");
load("/RoleDescriptorFunctions.js");
load("/UserDefinedRoleFunctions.js");
load("/UserFunctions.js");
load("/DatabaseFunctions.js");
load("/extensions.js");

extensions(DatabaseFunctions, HelperFunctions, RoleDescriptorFunctions, UserFunctions);

passwords = [];
