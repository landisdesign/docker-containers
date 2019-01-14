function printError(message, data) {
	print(message + ":");
	print(JSON.stringify(data));
	print(0);
}

let rsData = db.isMaster();

if (rsData.ok) {
	if (rsData.ismaster == false && rsData.secondary == false) { // Not set up yet
		rsData = rs.initiate(replicaConfig);
		if (rsData.ok) { // Other members are up
			print(1);
		}
		else {
			printError("Replica set \"" + replicaName + "\" is not fully started", rsData);
		}
	}
	else if (rsData.setName != replicaName) {
		printError("Replica set \"" + replicaName + "\" not set up properly", rsData);
	}
	else if (rsData.ismaster) {
		print(1);
	}
	else {
		printError("Host " + rsData.me + " is not primary. " + rsData.primary + " should perform backup", rsData);
	}
}
else {
	printError("Could not receive status data from replica set", rsData);
}
quit();
