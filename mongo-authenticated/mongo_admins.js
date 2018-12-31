var admin = {
	user: "admin",
	pwd: "d",
	roles: ["userAdminAnyDatabase"]
};
var roles = [
	{
		user: "dbAdmin",
		pwd: "d",
		roles: ["dbAdminAnyDatabase"]
	},	{
		user: "backup",
		pwd: "d",
		roles: ["backup", "restore"]
	}
];
