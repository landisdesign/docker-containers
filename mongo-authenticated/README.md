This container automatically starts up and restores an authenticated MongoDB instance.

## Credentials

`mongo-authenticated` uses credentials found under `/run/secrets` to create three users:

##### User administrator (`mongo_user_admin_name`, `mongo_user_admin_pwd`)

The user administrator creates all other users in the database.
	
##### Database administrator (`mongo_db_admin_name`, `mongo_db_admin_pwd`)

The database administrator has the power to create and drop databases. Individual applications should not have database create/drop privileges. They should only have permission to do document-level CRUD operations within an existing database.
	
##### Backup administrator (`mongo_backup_admin_name`, `mongo_backup_admin_pwd`)

The backup administrator has backup and restore privileges for all databases in the instance.

Users are created in the order above. Any of these roles can be combined into a single user. If they are, the first password defined in the credentials above is the one used for all of the roles combined into that user.

## Environment variables

In addition to the credentials described above, this container requires the following secret:

`MONGO_BACKUP_NAME`: This is used by `/post_startup.sh` to identify which subdirectory in `/data/mongodb/backup` to restore the database from. If not provided, the database restore will be attempted from the host directory mounted at `/data/mongodb/backup`.

## Code extension points

`mongo-authenticated` is intended to be the root of an authenticated cluster as well as individual applications. It has the following files that are intended to be replaced in descendant containers:

##### /mongo-users.js

Additional MongoDB users (admins as well as application interface roles) can be defined in this JavaScript file. Each user is defined in a line as follows:

```
UserBuilder.addUser(name, password, roles);
```

`roles` is an array with one or more role elements, as defined in the MongoDB documentation for `[createUser]:https://docs.mongodb.com/manual/reference/command/createUser/#roles`.

These users are added after the admin users defined above. If `name` matches the name of an existing user, the roles are merged into the existing user. The `password` field is ignored in this case, and the existing user's password is unchanged.

##### /pre_startup.sh

This shell script file is executed after the default support files are created and mongo-related shell variables are defined, but before `mongod` is started. This file can be replaced in descendant containers by script files that generate `/mongo-users.js`, for example.

The following shell variable are populated before this file is executed:

* `mongod`: The location of the `mongod` binary
* `mongod_log`: The location of the log file
* `mongo`: The location of the `mongo` shell binary
* `mongo_startup_js`: The location of the startup file that creates the admin users and runs mongo-users.js

##### /post_startup.sh

This shell script file is executed after `mongod` is started and the users are defined. In this container, it automatically sets up and restores the database from the location described above.